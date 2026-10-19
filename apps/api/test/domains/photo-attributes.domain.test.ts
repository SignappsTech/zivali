// GET /v1/photos/:id/attributes (C19 §REST) below the route: the status from the photo, its ai_calls outcome and the
// ai_results row (rows inserted directly, no job runs), owner-only reads, and the mapping to PhotoAttributes
// (ai.min_confidence, at most 2 breed codes, notices, nothing of moderation, marks or the model).
import { randomBytes, randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { AiExtraction } from '../../adapters/ai/index.ts';
import { AiDomain, AiMapper } from '../../domains/ai/index.ts';
import type { AttributesView } from '../../domains/ai/ai.domain.ts';
import type { AI_OUTCOME, PHOTO_STATUS } from '../../generated/enums.ts';
import configStore from '../../lib/config-store.ts';
import { type Actor, systemCtx, userCtx } from '../../lib/ctx.ts';
import { prisma } from '../../prisma/prisma.ts';

const owner = randomUUID();
const other = randomUUID();
const sha256s: string[] = [];
const actor = (user_id: string): Actor => ({
	user_id,
	role: 'USER',
	is_anonymous: false,
	aal: 'aal1',
	email_verified: true,
	locale: 'sl',
});
const MODERATION = { person_prominent: true, nsfw: false, violence: false, text_contact_info: true };

const extraction = (over: Partial<AiExtraction> = {}): AiExtraction => ({
	animal: 'dog',
	animal_count: 1,
	species_confidence: 0.98,
	breeds: [{ code: 'dog.labrador_retriever', confidence: 0.81 }],
	colours: { values: ['black'], confidence: 0.93 },
	pattern: { value: 'solid', confidence: 0.77 },
	size: { value: 'm', confidence: 0.41 },
	collar: { present: true, confidence: 0.88 },
	marks: ['white chest'],
	moderation: MODERATION,
	...over,
});

async function photo(status: PHOTO_STATUS = 'accepted', owner_id = owner) {
	const sha256 = randomBytes(32).toString('hex');
	sha256s.push(sha256);
	return prisma.photos.create({ data: { owner_id, sha256, width: 1600, height: 1200, bytes: 1, status } });
}

const call = (photo_id: string, outcome: AI_OUTCOME, provider = 'anthropic') =>
	prisma.ai_calls.create({
		data: {
			photo_id,
			provider,
			model: 'claude-haiku-5-5',
			outcome,
			input_tokens: 0,
			output_tokens: 0,
			cost_usd: '0',
			latency_ms: 1,
		},
	});

function store(sha256: string, e: AiExtraction | object = extraction()) {
	const { moderation = MODERATION, ...result } = e as AiExtraction;
	return prisma.ai_results.create({
		data: { sha256, model: 'claude-haiku-5-5', prompt_version: 'v1', result, moderation },
	});
}

const get = (id: string, user_id: string | null = owner) =>
	AiDomain.getPhotoAttributes({ id }, user_id ? userCtx(actor(user_id)) : systemCtx());

beforeAll(async () => {
	await prisma.profiles.createMany({ data: [{ id: owner }, { id: other }] });
});

afterAll(async () => {
	await prisma.ai_calls.deleteMany({ where: { photo: { owner_id: { in: [owner, other] } } } });
	await prisma.profiles.deleteMany({ where: { id: { in: [owner, other] } } });
	await prisma.ai_results.deleteMany({ where: { sha256: { in: sha256s } } });
});

describe('AiDomain.getPhotoAttributes', () => {
	it('pending while the photo is not accepted yet, or no Anthropic ai_calls row exists for it yet', async () => {
		for (const status of ['pending', 'uploaded'] as const)
			expect(await get((await photo(status)).id)).toEqual({ status: 'pending' });
		const accepted = await photo();
		expect(await get(accepted.id)).toEqual({ status: 'pending' });
		// A Voyage (photo.embed) row is not the extraction.
		await call(accepted.id, 'ok', 'voyage');
		expect(await get(accepted.id)).toEqual({ status: 'pending' });
	});

	it('unavailable for AI off, a cap, refused, invalid and failed; also ok without a usable stored result', async () => {
		for (const outcome of [
			'skipped_disabled',
			'skipped_budget',
			'skipped_limit',
			'refused',
			'invalid',
			'failed',
		] as const) {
			const p = await photo();
			await call(p.id, outcome);
			expect(await get(p.id), outcome).toEqual({ status: 'unavailable' });
		}
		const missing = await photo();
		await call(missing.id, 'ok');
		expect(await get(missing.id)).toEqual({ status: 'unavailable' });
		const broken = await photo();
		await call(broken.id, 'ok');
		await store(broken.sha256, { animal: 'horse' });
		expect(await get(broken.id)).toEqual({ status: 'unavailable' });
	});

	it('ready for ok and cached, on accepted, published and unpublished photos, with ai.min_confidence', async () => {
		for (const [status, outcome] of [
			['accepted', 'ok'],
			['published', 'cached'],
			['unpublished', 'ok'],
		] as const) {
			const p = await photo(status);
			await call(p.id, outcome);
			await store(p.sha256);
			const view = await get(p.id);
			expect(view).toEqual({ status: 'ready', extraction: extraction(), min_confidence: 0.6 });
		}
	});

	it('NOT_FOUND for an unknown, a rejected or another user’s photo, and without an actor', async () => {
		const rejected = await photo('rejected');
		await call(rejected.id, 'ok');
		await store(rejected.sha256);
		const mine = await photo();
		await call(mine.id, 'ok');
		await store(mine.sha256);
		for (const [id, user] of [
			[randomUUID(), owner],
			[rejected.id, owner],
			[mine.id, other],
			[mine.id, null],
		] as const)
			await expect(get(id, user)).rejects.toMatchObject({ code: 'NOT_FOUND' });
	});

	it('an unset or non-numeric ai.min_confidence pre-fills nothing', async () => {
		const p = await photo();
		await call(p.id, 'ok');
		await store(p.sha256);
		await prisma.$executeRaw`update app.app_config set value = '"high"'::jsonb where key = 'ai.min_confidence'`;
		configStore.invalidate();
		try {
			const dto = AiMapper.toPhotoAttributes(await get(p.id));
			expect(dto).toMatchObject({ status: 'ready', species: { value: null }, collar: { value: null } });
		} finally {
			await prisma.$executeRaw`update app.app_config set value = '0.6'::jsonb where key = 'ai.min_confidence'`;
			configStore.invalidate();
		}
	});
});

describe('AiMapper.toPhotoAttributes', () => {
	const ready = (over: Partial<AiExtraction> = {}, min_confidence = 0.6): AttributesView => ({
		status: 'ready',
		extraction: extraction(over),
		min_confidence,
	});

	it('pending and unavailable carry only the status', () => {
		expect(AiMapper.toPhotoAttributes({ status: 'pending' })).toEqual({ status: 'pending' });
		expect(AiMapper.toPhotoAttributes({ status: 'unavailable' })).toEqual({ status: 'unavailable' });
	});

	it('the C19 example: values below ai.min_confidence are null; moderation, marks and the model never go out', () => {
		const dto = AiMapper.toPhotoAttributes(ready());
		expect(dto).toEqual({
			status: 'ready',
			notice: null,
			species: { value: 'dog', confidence: 0.98 },
			breed_codes: { value: ['dog.labrador_retriever'], confidence: 0.81 },
			colours: { value: ['black'], confidence: 0.93 },
			pattern: { value: 'solid', confidence: 0.77 },
			size: { value: null, confidence: 0.41 },
			collar: { value: true, confidence: 0.88 },
		});
		expect(JSON.stringify(dto)).not.toMatch(/moderation|marks|model|white chest|person_prominent/);
	});

	it('a confidence equal to the minimum keeps its value; null fields stay null', () => {
		const dto = AiMapper.toPhotoAttributes(
			ready({ species_confidence: 0.6, colours: null, pattern: null, size: null, breeds: [] })
		);
		expect(dto).toMatchObject({
			species: { value: 'dog', confidence: 0.6 },
			breed_codes: null,
			colours: null,
			pattern: null,
			size: null,
		});
	});

	it('breed codes at or above the minimum, at most 2, best first, with the best one’s confidence', () => {
		const breeds = [
			{ code: 'dog.mixed', confidence: 0.62 },
			{ code: 'dog.border_collie', confidence: 0.9 },
			{ code: 'dog.labrador_retriever', confidence: 0.7 },
		] as AiExtraction['breeds'];
		expect(AiMapper.toPhotoAttributes(ready({ breeds }))).toMatchObject({
			breed_codes: { value: ['dog.border_collie', 'dog.labrador_retriever'], confidence: 0.9 },
		});
		const low = breeds.map((b, i) => ({ ...b, confidence: [0.3, 0.5, 0.4][i]! }));
		expect(AiMapper.toPhotoAttributes(ready({ breeds: low }))).toMatchObject({
			breed_codes: { value: null, confidence: 0.5 },
		});
	});

	it('notices: no_animal and other_animal fill nothing; multiple_animals still describes the main animal', () => {
		const none = AiMapper.toPhotoAttributes(ready({ animal: 'none', animal_count: 0, breeds: [] }));
		const other = AiMapper.toPhotoAttributes(ready({ animal: 'other', breeds: [] }));
		const nothing = { species: null, breed_codes: null, colours: null, pattern: null, size: null, collar: null };
		expect(none).toEqual({ status: 'ready', notice: 'no_animal', ...nothing });
		expect(other).toEqual({ status: 'ready', notice: 'other_animal', ...nothing });
		const many = AiMapper.toPhotoAttributes(ready({ animal: 'cat', animal_count: 2, breeds: [] }));
		expect(many).toMatchObject({ notice: 'multiple_animals', species: { value: 'cat', confidence: 0.98 } });
	});

	it('collar false is a suggestion too; below the minimum its value is null', () => {
		expect(AiMapper.toPhotoAttributes(ready({ collar: { present: false, confidence: 0.7 } }))).toMatchObject({
			collar: { value: false, confidence: 0.7 },
		});
		expect(AiMapper.toPhotoAttributes(ready({ collar: { present: true, confidence: 0.2 } }))).toMatchObject({
			collar: { value: null, confidence: 0.2 },
		});
	});
});
