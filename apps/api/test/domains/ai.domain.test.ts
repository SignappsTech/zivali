// ai.extract (C19 §Pipeline) against the local database, the in-memory storage and the mock adapter (or a stubbed
// SDK client): the hash cache, the caps in order, refused / invalid / failed, one ai_calls row per photo, the
// photo.embed hand-off, the done log, retries and retention.
import { randomBytes, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { RateLimitError } from '@anthropic-ai/sdk';
import { pino } from 'pino';
import sharp from 'sharp';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { aiExtractionSchema } from '@zivali/validation/ai';

import { anthropicAi } from '../../adapters/ai/anthropic.ts';
import { AI_PROMPT_VERSION, type AiAdapter, type AiExtraction } from '../../adapters/ai/index.ts';
import { MOCK_TOKENS } from '../../adapters/ai/mock.ts';
import { adapters } from '../../adapters/index.ts';
import { offAdapter } from '../../adapters/select.ts';
import { AiDomain } from '../../domains/ai/index.ts';
import { variantRef } from '../../domains/photos/photo-objects.ts';
import type { PHOTO_STATUS } from '../../generated/enums.ts';
import { runJob } from '../../jobs/index.ts';
import configStore from '../../lib/config-store.ts';
import { systemCtx } from '../../lib/ctx.ts';
import { drain, jobs } from '../../lib/jobs.ts';
import { loggerOptions } from '../../lib/logger.ts';
import { prisma } from '../../prisma/prisma.ts';

const fixtures = JSON.parse(readFileSync(new URL('../fixtures/ai/index.json', import.meta.url), 'utf8')) as Record<
	string,
	string
>;
const fixtureSha = (name: string) => Object.entries(fixtures).find(([, n]) => n === name)![0];

const owners: string[] = [];
const sha256s: string[] = [];

async function owner(is_anonymous = false) {
	const id = randomUUID();
	owners.push(id);
	await prisma.profiles.create({ data: { id, is_anonymous } });
	return id;
}

let defaultOwner: string;

/** A photo row with its display.jpg (1600 × 1200). */
async function photo({
	sha256 = randomBytes(32).toString('hex'),
	status = 'accepted' as PHOTO_STATUS,
	owner_id = defaultOwner,
} = {}) {
	sha256s.push(sha256);
	const row = await prisma.photos.create({ data: { owner_id, sha256, width: 1600, height: 1200, bytes: 1, status } });
	const jpeg = await sharp({
		create: { width: 1600, height: 1200, channels: 3, background: { r: 90, g: 60, b: 30 } },
	})
		.jpeg()
		.toBuffer();
	await adapters.storage.put(variantRef(row.id, 'display.jpg'), jpeg, 'image/jpeg');
	return row;
}

async function setConfig(key: string, value: unknown) {
	await prisma.$executeRaw`update app.app_config set value = ${JSON.stringify(value)}::jsonb where key = ${key}`;
	configStore.invalidate();
}

/** A system ctx whose logger lines are captured; `ai` replaces the mock. */
function testCtx(ai: AiAdapter = adapters.ai) {
	const lines: string[] = [];
	const logger = pino({ ...loggerOptions, level: 'info' }, { write: (line: string) => void lines.push(line) });
	const ctx = systemCtx({ logger, adapters: { ...adapters, ai } });
	const logs = () => lines.map((line) => JSON.parse(line) as Record<string, unknown>);
	return { ctx, lines, logs };
}

const calls = (photo_id: string) => prisma.ai_calls.findMany({ where: { photo_id, provider: 'anthropic' } });
const result = (sha256: string) => prisma.ai_results.findUnique({ where: { sha256 } });
const embedQueued = async (photo_id: string) =>
	(
		await prisma.$queryRaw<{ count: number }[]>`
			select count(*)::int as count from pgboss.job where name = 'photo.embed' and data->>'photo_id' = ${photo_id}`
	)[0]!.count;

const extraction = (over: Partial<AiExtraction> = {}): AiExtraction => ({
	animal: 'dog',
	animal_count: 1,
	species_confidence: 0.9,
	breeds: [],
	colours: null,
	pattern: null,
	size: null,
	collar: { present: false, confidence: 0.6 },
	marks: [],
	moderation: { person_prominent: false, nsfw: false, violence: false, text_contact_info: false },
	...over,
});

beforeAll(async () => {
	defaultOwner = await owner();
});

afterEach(async () => {
	vi.restoreAllMocks();
	await setConfig('ai.enabled', true);
	await setConfig('ai.monthly_budget_usd', 20);
	await setConfig('ai.daily_photos_anonymous', 10);
	await setConfig('ai.daily_photos_user', 30);
});

afterAll(async () => {
	await prisma.ai_calls.deleteMany({ where: { photo: { owner_id: { in: owners } } } });
	await prisma.profiles.deleteMany({ where: { id: { in: owners } } });
	await prisma.ai_results.deleteMany({ where: { sha256: { in: sha256s } } });
});

describe('ai.extract: result and cache', () => {
	it('stores a valid ai_results row and one ai_calls row; the same image again is cached, with no call', async () => {
		const first = await photo();
		const extract = vi.spyOn(adapters.ai, 'extract');
		const { ctx } = testCtx();
		await AiDomain.extractPhoto({ photo_id: first.id }, ctx);

		// display.jpg went out as a 1024 px long-edge JPEG, with the hash for the mock.
		expect(extract).toHaveBeenCalledTimes(1);
		const [image] = extract.mock.calls[0]!;
		expect(image.sha256).toBe(first.sha256);
		expect(await sharp(Buffer.from(image.jpegBase64, 'base64')).metadata()).toMatchObject({
			format: 'jpeg',
			width: 1024,
			height: 768,
		});
		const stored = await result(first.sha256);
		expect(stored).toMatchObject({ model: 'claude-haiku-5-5', prompt_version: AI_PROMPT_VERSION });
		// Result without moderation, moderation apart; together they pass the schema.
		expect(stored!.result).not.toHaveProperty('moderation');
		const merged = { ...(stored!.result as object), moderation: stored!.moderation };
		expect(aiExtractionSchema.safeParse(merged).success).toBe(true);
		const [call] = await calls(first.id);
		expect(call).toMatchObject({ provider: 'anthropic', outcome: 'ok', ...MOCK_TOKENS });
		// The mock is free.
		expect(call!.cost_usd.toString()).toBe('0');
		expect(call!.latency_ms).toBeGreaterThanOrEqual(0);
		expect(await embedQueued(first.id)).toBe(1);

		const second = await photo({ sha256: first.sha256, owner_id: await owner() });
		await AiDomain.extractPhoto({ photo_id: second.id }, ctx);
		expect(extract).toHaveBeenCalledTimes(1);
		expect(await calls(second.id)).toMatchObject([{ outcome: 'cached', input_tokens: 0, output_tokens: 0 }]);
		expect(await embedQueued(second.id)).toBe(1);

		// A re-run of the job neither calls again nor adds a row.
		await AiDomain.extractPhoto({ photo_id: first.id }, ctx);
		expect(extract).toHaveBeenCalledTimes(1);
		expect(await calls(first.id)).toHaveLength(1);
	});

	it('extracts published photos; other statuses and unknown ids write nothing', async () => {
		const published = await photo({ status: 'published' });
		const others = await Promise.all(
			(['pending', 'uploaded', 'rejected', 'unpublished'] as const).map((status) => photo({ status }))
		);
		const extract = vi.spyOn(adapters.ai, 'extract');
		const { ctx } = testCtx();
		for (const p of [published, ...others]) await AiDomain.extractPhoto({ photo_id: p.id }, ctx);
		await AiDomain.extractPhoto({ photo_id: randomUUID() }, ctx);
		expect(extract).toHaveBeenCalledTimes(1);
		expect(await calls(published.id)).toMatchObject([{ outcome: 'ok' }]);
		for (const p of others) {
			expect(await calls(p.id)).toEqual([]);
			expect(await result(p.sha256)).toBeNull();
			expect(await embedQueued(p.id)).toBe(0);
		}
	});

	it('books the cost of a real call from its usage and the price table', async () => {
		const create = vi.fn(async () => ({
			id: 'msg_test',
			type: 'message',
			role: 'assistant',
			model: 'claude-haiku-5-5',
			stop_reason: 'end_turn',
			stop_sequence: null,
			content: [{ type: 'text', text: JSON.stringify(extraction()) }],
			usage: { input_tokens: 1000, output_tokens: 200 },
		}));
		const ai = anthropicAi({ messages: { create } } as never, 'claude-haiku-5-5', 'low');
		const p = await photo();
		await AiDomain.extractPhoto({ photo_id: p.id }, testCtx(ai).ctx);
		const [call] = await calls(p.id);
		// 1000 × USD 0.10 + 200 × USD 0.50 per MTok.
		expect(call!.cost_usd.toString()).toBe('0.0002');
		expect(call).toMatchObject({ outcome: 'ok', input_tokens: 1000, output_tokens: 200 });
	});
});

describe('ai.extract: caps', () => {
	it('ai.enabled false or the adapter off: skipped_disabled, no call', async () => {
		await setConfig('ai.enabled', false);
		const disabled = await photo();
		const extract = vi.spyOn(adapters.ai, 'extract');
		await AiDomain.extractPhoto({ photo_id: disabled.id }, testCtx().ctx);
		await setConfig('ai.enabled', true);
		const off = await photo();
		await AiDomain.extractPhoto({ photo_id: off.id }, testCtx(offAdapter<AiAdapter>('AI_PROVIDER')).ctx);
		expect(extract).not.toHaveBeenCalled();
		for (const p of [disabled, off]) {
			expect(await calls(p.id)).toMatchObject([{ outcome: 'skipped_disabled', input_tokens: 0 }]);
			expect(await result(p.sha256)).toBeNull();
			// No result: photo.embed is sent and skips it (C20).
			expect(await embedQueued(p.id)).toBe(1);
		}
	});

	it("this month's Anthropic spend at the budget: skipped_budget", async () => {
		const spend = await prisma.ai_calls.create({
			data: {
				provider: 'anthropic',
				model: 'claude-haiku-5-5',
				outcome: 'ok',
				input_tokens: 0,
				output_tokens: 0,
				cost_usd: '0.01',
				latency_ms: 1,
			},
		});
		try {
			await setConfig('ai.monthly_budget_usd', 0.01);
			const p = await photo();
			const extract = vi.spyOn(adapters.ai, 'extract');
			await AiDomain.extractPhoto({ photo_id: p.id }, testCtx().ctx);
			expect(extract).not.toHaveBeenCalled();
			expect(await calls(p.id)).toMatchObject([{ outcome: 'skipped_budget' }]);
		} finally {
			await prisma.ai_calls.delete({ where: { id: spend.id } });
		}
	});

	it('the owner over the daily cap: skipped_limit (anonymous 10 and signed-in 30 by default, per owner)', async () => {
		await setConfig('ai.daily_photos_user', 1);
		await setConfig('ai.daily_photos_anonymous', 2);
		const user = await owner();
		const anonymous = await owner(true);
		const { ctx } = testCtx();
		const outcomes = async (owner_id: string, n: number) => {
			const out: string[] = [];
			for (let i = 0; i < n; i++) {
				const p = await photo({ owner_id });
				await AiDomain.extractPhoto({ photo_id: p.id }, ctx);
				out.push((await calls(p.id))[0]!.outcome);
			}
			return out;
		};
		expect(await outcomes(user, 2)).toEqual(['ok', 'skipped_limit']);
		expect(await outcomes(anonymous, 3)).toEqual(['ok', 'ok', 'skipped_limit']);
		// Another owner is not affected; a cached image costs nothing and does not count.
		expect(await outcomes(await owner(), 1)).toEqual(['ok']);
	});
});

describe('ai.extract: refused, invalid, failed and moderation', () => {
	it('the refusal and invalid fixtures: outcome stored, no result, photo.embed still sent', async () => {
		const { ctx } = testCtx();
		for (const name of ['refusal', 'invalid'] as const) {
			await prisma.ai_results.deleteMany({ where: { sha256: fixtureSha(name) } });
			const p = await photo({ sha256: fixtureSha(name), owner_id: await owner() });
			await AiDomain.extractPhoto({ photo_id: p.id }, ctx);
			expect(await calls(p.id)).toMatchObject([
				{ outcome: name === 'refusal' ? 'refused' : 'invalid', ...MOCK_TOKENS },
			]);
			expect(await result(p.sha256)).toBeNull();
			expect(await embedQueued(p.id)).toBe(1);
		}
	});

	it('stores moderation; a prominent person, nsfw, or animal none or other is never sent to photo.embed', async () => {
		const { ctx } = testCtx();
		await prisma.ai_results.deleteMany({ where: { sha256: fixtureSha('person') } });
		const person = await photo({ sha256: fixtureSha('person') });
		await AiDomain.extractPhoto({ photo_id: person.id }, ctx);
		expect((await result(person.sha256))!.moderation).toMatchObject({ person_prominent: true });
		expect(await embedQueued(person.id)).toBe(0);

		const flagged = [
			extraction({
				moderation: { person_prominent: false, nsfw: true, violence: false, text_contact_info: false },
			}),
			extraction({ animal: 'none', animal_count: 0 }),
			extraction({ animal: 'other' }),
		];
		for (const e of flagged) {
			vi.spyOn(adapters.ai, 'extract').mockResolvedValueOnce({
				outcome: 'ok',
				model: 'claude-haiku-5-5',
				input_tokens: 1,
				output_tokens: 1,
				extraction: e,
			});
			const p = await photo();
			await AiDomain.extractPhoto({ photo_id: p.id }, ctx);
			expect(await calls(p.id)).toMatchObject([{ outcome: 'ok' }]);
			expect(await embedQueued(p.id)).toBe(0);
			// The cached result keeps the photo out too.
			const again = await photo({ sha256: p.sha256, owner_id: await owner() });
			await AiDomain.extractPhoto({ photo_id: again.id }, ctx);
			expect(await calls(again.id)).toMatchObject([{ outcome: 'cached' }]);
			expect(await embedQueued(again.id)).toBe(0);
		}
	});

	it('a retryable error throws and writes nothing; on the last attempt it is recorded as failed', async () => {
		const p = await photo();
		const err = new RateLimitError(429, { type: 'error' }, 'slow down', new Headers());
		vi.spyOn(adapters.ai, 'extract').mockRejectedValue(err);
		const { ctx, logs, lines } = testCtx();
		await expect(AiDomain.extractPhoto({ photo_id: p.id }, ctx)).rejects.toBe(err);
		expect(await calls(p.id)).toEqual([]);
		expect(await embedQueued(p.id)).toBe(0);

		await AiDomain.extractPhoto({ photo_id: p.id, last_attempt: true }, ctx);
		expect(await calls(p.id)).toMatchObject([{ outcome: 'failed', input_tokens: 0, output_tokens: 0 }]);
		expect(await result(p.sha256)).toBeNull();
		expect(await embedQueued(p.id)).toBe(1);
		expect(logs()).toContainEqual(
			expect.objectContaining({
				msg: 'ai.extract.done',
				photo_id: p.id,
				outcome: 'failed',
				error: 'RateLimitError',
			})
		);
		// JPEG base64 starts with /9j/: no image data in any line.
		expect(lines.join('\n')).not.toContain('/9j/');
	});

	it('logs ai.extract.done with the outcome and latency_ms', async () => {
		const p = await photo();
		const { ctx, logs } = testCtx();
		await AiDomain.extractPhoto({ photo_id: p.id }, ctx);
		const done = logs().filter((l) => l.msg === 'ai.extract.done');
		expect(done).toEqual([
			expect.objectContaining({ photo_id: p.id, outcome: 'ok', latency_ms: expect.any(Number) }),
		]);
	});
});

describe('ai.extract job', () => {
	it('an ai.extract { photo_id } job stores the result and hands the photo to photo.embed', async () => {
		const p = await photo();
		await jobs.send('ai.extract', { photo_id: p.id });
		await drain(runJob);
		expect(await result(p.sha256)).not.toBeNull();
		expect(await calls(p.id)).toMatchObject([{ provider: 'anthropic', outcome: 'ok' }]);
		// photo.embed ran too (mock embedder).
		expect(await prisma.ai_calls.count({ where: { photo_id: p.id, provider: 'voyage' } })).toBe(1);
	});

	it('runs 3 times on a retryable error, then records failed and completes (the pipeline never fails)', async () => {
		const p = await photo();
		vi.spyOn(adapters.ai, 'extract').mockRejectedValue(new RateLimitError(429, {}, 'slow', new Headers()));
		const extractPhoto = vi.spyOn(AiDomain, 'extractPhoto');
		const id = (await jobs.send('ai.extract', { photo_id: p.id }))!;
		await drain(runJob);
		const attempts = extractPhoto.mock.calls.filter(([input]) => input.photo_id === p.id);
		expect(attempts.map(([input]) => input.last_attempt)).toEqual([false, false, true]);
		expect(await calls(p.id)).toMatchObject([{ outcome: 'failed' }]);
		const [row] = await prisma.$queryRaw<{ state: string }[]>`
			select state::text from pgboss.job where id = ${id}::uuid`;
		expect(row).toEqual({ state: 'completed' });
	});
});

describe('retention', () => {
	it('deletes ai_calls older than 62 days and ai_results of images no photo has', async () => {
		const p = await photo();
		const day = 24 * 60 * 60 * 1000;
		const row = (days: number) => ({
			photo_id: p.id,
			provider: 'voyage',
			outcome: 'ok' as const,
			input_tokens: 0,
			output_tokens: 0,
			cost_usd: '0',
			latency_ms: 1,
			created_at: new Date(Date.now() - days * day),
		});
		const [old, recent] = await Promise.all([
			prisma.ai_calls.create({ data: { ...row(63), model: 'old' } }),
			prisma.ai_calls.create({ data: { ...row(61), model: 'recent' } }),
		]);
		const orphan = randomBytes(32).toString('hex');
		sha256s.push(orphan);
		const moderation = { person_prominent: false, nsfw: false, violence: false, text_contact_info: false };
		await prisma.ai_results.createMany({
			data: [p.sha256, orphan].map((sha256) => ({
				sha256,
				model: 'm',
				prompt_version: 'v',
				result: {},
				moderation,
			})),
		});
		await jobs.send('retention.purge', {});
		await drain(runJob);
		expect(await prisma.ai_calls.findUnique({ where: { id: old.id } })).toBeNull();
		expect(await prisma.ai_calls.findUnique({ where: { id: recent.id } })).not.toBeNull();
		expect(await result(orphan)).toBeNull();
		expect(await result(p.sha256)).not.toBeNull();
	});
});
