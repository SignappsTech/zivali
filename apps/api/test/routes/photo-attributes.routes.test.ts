// GET /v1/photos/:id/attributes (C19 §REST): pending, unavailable and ready from directly inserted ai_calls and
// ai_results rows (no job, no model call), the permission matrix, the 600/hour rate limit, and the two public config
// keys the forms read before polling.
import { randomBytes, randomUUID } from 'node:crypto';

import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { app } from '../../app.ts';
import type { AI_OUTCOME, PHOTO_STATUS, USER_ROLE } from '../../generated/enums.ts';
import { prisma } from '../../prisma/prisma.ts';
import { signTestToken } from '../helpers/token.ts';

const ids = {
	owner: randomUUID(),
	anon: randomUUID(),
	other: randomUUID(),
	mod: randomUUID(),
	modAal2: randomUUID(),
	admin: randomUUID(),
	burst: randomUUID(),
};
const sha256s: string[] = [];
const tokenFor = (id: string) =>
	signTestToken({
		sub: id,
		is_anonymous: id === ids.anon,
		aal: id === ids.modAal2 || id === ids.admin ? 'aal2' : 'aal1',
	});
const get = async (id: string | null, photoId: string) => {
	const req = request(app).get(`/v1/photos/${photoId}/attributes`);
	return id ? req.set('Authorization', `Bearer ${await tokenFor(id)}`) : req;
};

/** The C19 example as stored by ai.extract: result without moderation, moderation apart. */
const RESULT = {
	animal: 'dog',
	animal_count: 1,
	species_confidence: 0.98,
	breeds: [{ code: 'dog.labrador_retriever', confidence: 0.81 }],
	colours: { values: ['black'], confidence: 0.93 },
	pattern: { value: 'solid', confidence: 0.77 },
	size: { value: 'm', confidence: 0.41 },
	collar: { present: true, confidence: 0.88 },
	marks: ['torn left ear'],
};
const MODERATION = { person_prominent: false, nsfw: false, violence: false, text_contact_info: true };
const READY = {
	status: 'ready',
	notice: null,
	species: { value: 'dog', confidence: 0.98 },
	breed_codes: { value: ['dog.labrador_retriever'], confidence: 0.81 },
	colours: { value: ['black'], confidence: 0.93 },
	pattern: { value: 'solid', confidence: 0.77 },
	size: { value: null, confidence: 0.41 },
	collar: { value: true, confidence: 0.88 },
};

/** A photo of `owner`; with `outcome`, its ai_calls row, and for ok/cached the ai_results row of its hash. */
async function photo(
	owner: string,
	{ status = 'accepted', outcome }: { status?: PHOTO_STATUS; outcome?: AI_OUTCOME } = {}
) {
	const sha256 = randomBytes(32).toString('hex');
	sha256s.push(sha256);
	const row = await prisma.photos.create({
		data: { owner_id: owner, sha256, width: 1600, height: 1200, bytes: 1, status },
	});
	if (outcome)
		await prisma.ai_calls.create({
			data: {
				photo_id: row.id,
				provider: 'anthropic',
				model: 'claude-haiku-5-5',
				outcome,
				input_tokens: 1200,
				output_tokens: 150,
				cost_usd: '0.000195',
				latency_ms: 900,
			},
		});
	if (outcome === 'ok' || outcome === 'cached')
		await prisma.ai_results.create({
			data: { sha256, model: 'claude-haiku-5-5', prompt_version: 'v1', result: RESULT, moderation: MODERATION },
		});
	return row.id;
}

beforeAll(async () => {
	const roles: Record<string, USER_ROLE> = {
		[ids.mod]: 'MODERATOR',
		[ids.modAal2]: 'MODERATOR',
		[ids.admin]: 'ADMIN',
	};
	await prisma.profiles.createMany({
		data: Object.values(ids).map((id) => ({ id, role: roles[id] ?? 'USER', is_anonymous: id === ids.anon })),
	});
	// Fixed one-hour windows: earlier runs in this hour must not count (anonymous callers share the test IP).
	await prisma.rate_limits.deleteMany({ where: { name: 'photos.attributes' } });
});

afterAll(async () => {
	const owners = Object.values(ids);
	await prisma.ai_calls.deleteMany({ where: { photo: { owner_id: { in: owners } } } });
	await prisma.rate_limits.deleteMany({ where: { name: 'photos.attributes' } });
	await prisma.profiles.deleteMany({ where: { id: { in: owners } } });
	await prisma.ai_results.deleteMany({ where: { sha256: { in: sha256s } } });
});

describe('GET /v1/photos/:id/attributes', () => {
	it('ready: the C19 shape, low confidence as null; no moderation, marks, model, tokens or cost; never cached', async () => {
		const res = await get(ids.owner, await photo(ids.owner, { outcome: 'ok' }));
		expect(res.status).toBe(200);
		expect(res.body).toEqual(READY);
		expect(res.headers['cache-control']).toBe('private, no-store');
		expect(res.text).not.toMatch(
			/moderation|text_contact_info|marks|torn left ear|model|claude|token|cost|latency/
		);
	});

	it('pending before acceptance or before the ai_calls row; unavailable for every other outcome', async () => {
		for (const status of ['pending', 'uploaded', 'accepted'] as const)
			expect((await get(ids.owner, await photo(ids.owner, { status }))).body).toEqual({ status: 'pending' });
		for (const outcome of [
			'skipped_disabled',
			'skipped_budget',
			'skipped_limit',
			'refused',
			'invalid',
			'failed',
		] as const)
			expect((await get(ids.owner, await photo(ids.owner, { outcome }))).body, outcome).toEqual({
				status: 'unavailable',
			});
		// A cache hit of another owner's image is ready too.
		expect((await get(ids.owner, await photo(ids.owner, { status: 'published', outcome: 'cached' }))).body).toEqual(
			READY
		);
	});

	it('permission matrix: anonymous visitor 401; owner and anonymous owner 200; anyone else 404', async () => {
		const own = await photo(ids.owner, { outcome: 'ok' });
		const anonOwn = await photo(ids.anon, { outcome: 'ok' });
		const visitor = await get(null, own);
		expect(visitor.status).toBe(401);
		expect(visitor.body.error.code).toBe('UNAUTHENTICATED');
		expect((await get(ids.owner, own)).body).toEqual(READY);
		expect((await get(ids.anon, anonOwn)).body).toEqual(READY);
		// Other user, anonymous user, moderator aal1 and aal2, admin aal2: indistinguishable from an unknown photo.
		for (const caller of [ids.other, ids.anon, ids.mod, ids.modAal2, ids.admin]) {
			const res = await get(caller, own);
			expect(res.status, caller).toBe(404);
			expect(res.body.error.code).toBe('NOT_FOUND');
		}
		expect((await get(ids.owner, anonOwn)).status).toBe(404);
	});

	it('NOT_FOUND for an unknown or a rejected photo; VALIDATION for a bad id', async () => {
		expect((await get(ids.owner, randomUUID())).status).toBe(404);
		const rejected = await get(ids.owner, await photo(ids.owner, { status: 'rejected', outcome: 'ok' }));
		expect(rejected.status).toBe(404);
		expect(rejected.body.error.code).toBe('NOT_FOUND');
		const bad = await get(ids.owner, 'not-a-uuid');
		expect(bad.status).toBe(400);
		expect(bad.body.error.code).toBe('VALIDATION');
	});

	it('is rate limited to 600 per hour per user (RATE_LIMITED with Retry-After)', async () => {
		const id = await photo(ids.burst, { outcome: 'ok' });
		// This window already holds 599 requests of the user: the 600th passes, the 601st does not.
		const window_start = new Date(Math.floor(Date.now() / 3600_000) * 3600_000);
		await prisma.rate_limits.create({
			data: { name: 'photos.attributes', key: ids.burst, window_start, count: 599 },
		});
		expect((await get(ids.burst, id)).status).toBe(200);
		const res = await get(ids.burst, id);
		expect(res.status).toBe(429);
		expect(res.body.error.code).toBe('RATE_LIMITED');
		expect(Number(res.headers['retry-after'])).toBeGreaterThan(0);
		// Another user is not affected.
		expect((await get(ids.owner, await photo(ids.owner))).status).toBe(200);
	});
});

describe('GET /v1/config/public', () => {
	it('carries ai.enabled and ai.min_confidence, so clients skip polling when AI is off', async () => {
		const res = await request(app).get('/v1/config/public');
		expect(res.body).toMatchObject({ 'ai.enabled': true, 'ai.min_confidence': 0.6 });
		expect(res.body).not.toHaveProperty('ai.monthly_budget_usd');
	});
});
