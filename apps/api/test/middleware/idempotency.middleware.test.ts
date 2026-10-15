// idempotency (C1): 24 h replay for the same user and body, CONFLICT for another user or body or while in flight,
// encrypted bodies, failures (5xx, 429, 401, 403) not stored.
import { createHash, randomUUID } from 'node:crypto';

import request from 'supertest';
import { afterAll, describe, expect, it, vi } from 'vitest';

import { AppError } from '../../lib/errors.ts';
import { authMiddleware } from '../../middleware/auth.middleware.ts';
import { idempotency } from '../../middleware/idempotency.middleware.ts';
import { prisma } from '../../prisma/prisma.ts';
import { testApp } from '../helpers/app.ts';
import { signTestToken } from '../helpers/token.ts';

const users = [randomUUID(), randomUUID()];
const keys: string[] = [];
const newKey = () => {
	const key = randomUUID();
	keys.push(key);
	return key;
};

let runs = 0;
let deny: 'UNAUTHENTICATED' | 'FORBIDDEN' | undefined;
const app = testApp((a) => {
	a.post('/reports', authMiddleware, idempotency({ required: true }), (req, res) => {
		runs++;
		if (req.body.fail === 'crash') throw new Error('boom');
		if (req.body.fail === 'duplicate') throw new AppError('DUPLICATE_OPEN_REPORT');
		if (deny) throw new AppError(deny);
		res.status(201).json({ run: runs, manage_token: 'secret-manage-token' });
	});
	a.post('/optional', authMiddleware, idempotency(), (_req, res) => res.json({ run: ++runs }));
	a.delete('/thing', authMiddleware, idempotency(), (_req, res) => {
		runs++;
		res.status(204).end();
	});
});

afterAll(async () => {
	await prisma.idempotency_keys.deleteMany({ where: { key: { in: keys } } });
	await prisma.profiles.deleteMany({ where: { id: { in: users } } });
});

const tokens = await Promise.all(users.map((sub) => signTestToken({ sub })));
// What the route column holds for POST /reports with the default body {}.
const reportsRoute = `POST /reports ${createHash('sha256').update('{}').digest('hex')}`;
const post = (key: string | undefined, body: object = {}, user = 0, path = '/reports') => {
	const req = request(app).post(path).set('Authorization', `Bearer ${tokens[user]}`);
	return (key ? req.set('Idempotency-Key', key) : req).send(body);
};

describe('idempotency', () => {
	it('requires a UUID Idempotency-Key where the route says so', async () => {
		for (const key of [undefined, 'not-a-uuid']) {
			const res = await post(key);
			expect(res.status).toBe(400);
			expect(res.body.error.code).toBe('VALIDATION');
			expect(res.body.error.issues[0].path).toBe('headers.idempotency-key');
		}
	});

	it('replays the stored response to the same user without running the handler again', async () => {
		const key = newKey();
		const first = await post(key);
		expect(first.status).toBe(201);
		const before = runs;
		const again = await post(key);
		expect(again.status).toBe(201);
		expect(again.body).toEqual(first.body);
		expect(again.headers['idempotent-replayed']).toBe('true');
		expect(runs).toBe(before);
	});

	it('stores the body encrypted (it carries the manage token)', async () => {
		const key = newKey();
		await post(key);
		const row = await prisma.idempotency_keys.findUnique({ where: { key } });
		expect(row).toMatchObject({ user_id: users[0], route: reportsRoute, status: 201 });
		expect(typeof row?.body).toBe('string');
		expect(JSON.stringify(row?.body)).not.toContain('secret-manage-token');
	});

	it('answers 409 CONFLICT when another user sends the same key', async () => {
		const key = newKey();
		await post(key);
		const res = await post(key, {}, 1);
		expect(res.status).toBe(409);
		expect(res.body.error.code).toBe('CONFLICT');
	});

	it('answers 409 CONFLICT when the same key comes with another body; key order does not matter', async () => {
		const key = newKey();
		expect((await post(key, { a: 1, b: [1, { c: 2, d: 3 }] })).status).toBe(201);
		const reordered = await post(key, { b: [1, { d: 3, c: 2 }], a: 1 });
		expect(reordered.headers['idempotent-replayed']).toBe('true');
		const res = await post(key, { a: 2, b: [1, { c: 2, d: 3 }] });
		expect(res.status).toBe(409);
		expect(res.body.error).toMatchObject({ code: 'CONFLICT', message: expect.stringMatching(/another request/) });
	});

	it('answers 409 CONFLICT while the first request is still running', async () => {
		const key = newKey();
		await prisma.idempotency_keys.create({ data: { key, user_id: users[0], route: reportsRoute } });
		const res = await post(key);
		expect(res.status).toBe(409);
		expect(res.body.error.message).toMatch(/in progress/);
	});

	it('frees a key after a 5xx so the retry runs, and replays domain errors (4xx)', async () => {
		const crashKey = newKey();
		expect((await post(crashKey, { fail: 'crash' })).status).toBe(500);
		expect(await prisma.idempotency_keys.findUnique({ where: { key: crashKey } })).toBeNull();
		expect((await post(crashKey)).status).toBe(201);

		const dupKey = newKey();
		expect((await post(dupKey, { fail: 'duplicate' })).status).toBe(409);
		const before = runs;
		const replayed = await post(dupKey, { fail: 'duplicate' });
		expect(replayed.body.error.code).toBe('DUPLICATE_OPEN_REPORT');
		expect(replayed.headers['idempotent-replayed']).toBe('true');
		expect(runs).toBe(before);
	});

	it.each(['UNAUTHENTICATED', 'FORBIDDEN'] as const)('never stores a %s answer: the retry runs', async (code) => {
		const key = newKey();
		deny = code;
		try {
			expect((await post(key)).body.error.code).toBe(code);
		} finally {
			deny = undefined;
		}
		expect(await prisma.idempotency_keys.findUnique({ where: { key } })).toBeNull();
		const before = runs;
		expect((await post(key)).status).toBe(201);
		expect(runs).toBe(before + 1);
	});

	it('treats a key older than 24 h, or one stuck in flight for over a minute, as new', async () => {
		for (const [ageMs, status] of [
			[25 * 3600_000, 201],
			[5 * 60_000, null],
		] as const) {
			const key = newKey();
			await prisma.idempotency_keys.create({
				data: {
					key,
					user_id: users[1],
					route: 'POST /reports',
					status,
					created_at: new Date(Date.now() - ageMs),
				},
			});
			const before = runs;
			expect((await post(key)).status).toBe(201);
			expect(runs).toBe(before + 1);
		}
	});

	it('passes through without a key where it is optional, and records bodiless responses', async () => {
		const before = runs;
		await post(undefined, {}, 0, '/optional');
		await post(undefined, {}, 0, '/optional');
		expect(runs).toBe(before + 2);

		const key = newKey();
		const del = () =>
			request(app).delete('/thing').set('Authorization', `Bearer ${tokens[0]}`).set('Idempotency-Key', key);
		expect((await del()).status).toBe(204);
		await vi.waitFor(async () =>
			expect((await prisma.idempotency_keys.findUnique({ where: { key } }))?.status).toBe(204)
		);
		const runsAfterFirst = runs;
		const replayed = await del();
		expect(replayed.status).toBe(204);
		expect(replayed.headers['idempotent-replayed']).toBe('true');
		expect(runs).toBe(runsAfterFirst);
	});
});
