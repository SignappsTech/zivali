// rateLimit (C1): Postgres fixed window, HMAC-hashed IP and device keys, 429 with Retry-After, app_config override.
import { randomUUID } from 'node:crypto';

import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';

import configStore from '../../lib/config-store.ts';
import { authMiddleware } from '../../middleware/auth.middleware.ts';
import { rateLimit, type RateLimitOptions } from '../../middleware/rateLimit.middleware.ts';
import { prisma } from '../../prisma/prisma.ts';
import { testApp } from '../helpers/app.ts';
import { signTestToken } from '../helpers/token.ts';

const prefix = `test.${randomUUID()}`;
const users: string[] = [];

afterAll(async () => {
	await prisma.rate_limits.deleteMany({ where: { name: { startsWith: prefix } } });
	await prisma.app_config.deleteMany({ where: { key: { startsWith: `rate.${prefix}` } } });
	await prisma.profiles.deleteMany({ where: { id: { in: users } } });
	configStore.invalidate();
});

function limited(options: Omit<RateLimitOptions, 'limit' | 'window'> & Partial<RateLimitOptions>) {
	const name = `${prefix}.${randomUUID()}`;
	const app = testApp((a) => {
		const guards = options.key === 'user' ? [authMiddleware] : [];
		a.post('/x', ...guards, rateLimit(name, { limit: 2, window: 3600, ...options }), (_req, res) => res.json({}));
	});
	return { name, app };
}

describe('rateLimit', () => {
	it('answers 429 RATE_LIMITED with Retry-After once the window is full', async () => {
		const { app } = limited({ key: 'ip' });
		expect((await request(app).post('/x')).status).toBe(200);
		expect((await request(app).post('/x')).status).toBe(200);
		const res = await request(app).post('/x');
		expect(res.status).toBe(429);
		expect(res.body.error.code).toBe('RATE_LIMITED');
		const retryAfter = Number(res.headers['retry-after']);
		expect(retryAfter).toBeGreaterThanOrEqual(1);
		expect(retryAfter).toBeLessThanOrEqual(3600);
		expect(res.body.error.details).toEqual({ retry_after_s: retryAfter });
	});

	it('stores IPs and device ids only as HMAC, and counts each device separately', async () => {
		const { name, app } = limited({ key: 'device', limit: 1 });
		const deviceA = randomUUID();
		expect((await request(app).post('/x').set('x-device-id', deviceA)).status).toBe(200);
		expect((await request(app).post('/x').set('x-device-id', deviceA)).status).toBe(429);
		expect((await request(app).post('/x').set('x-device-id', randomUUID())).status).toBe(200);
		const { name: ipName, app: ipApp } = limited({ key: 'ip' });
		await request(ipApp).post('/x');
		const rows = await prisma.rate_limits.findMany({ where: { name: { in: [name, ipName] } } });
		expect(rows).toHaveLength(3);
		for (const row of rows) {
			expect(row.key).toMatch(/^[\w-]{43}$/);
			expect(row.key).not.toContain(deviceA);
			expect(row.key).not.toMatch(/127\.0\.0\.1|::1/);
		}
	});

	it('keys by user id for signed-in users', async () => {
		const sub = randomUUID();
		users.push(sub);
		const { name, app } = limited({ key: 'user', limit: 1 });
		const token = await signTestToken({ sub });
		expect((await request(app).post('/x').set('Authorization', `Bearer ${token}`)).status).toBe(200);
		expect((await request(app).post('/x').set('Authorization', `Bearer ${token}`)).status).toBe(429);
		const other = await signTestToken({ sub: randomUUID() });
		expect((await request(app).post('/x').set('Authorization', `Bearer ${other}`)).status).toBe(200);
		expect((await prisma.rate_limits.findFirst({ where: { name, key: sub } }))?.count).toBe(2);
	});

	it('keys anonymous finders by device, else IP, never by their throwaway user id', async () => {
		const { name, app } = limited({ key: 'user', limit: 1 });
		const asNewAnonymous = async (device?: string) => {
			const sub = randomUUID();
			users.push(sub);
			const req = request(app)
				.post('/x')
				.set('Authorization', `Bearer ${await signTestToken({ sub, is_anonymous: true })}`);
			return (device ? req.set('x-device-id', device) : req).then((res) => res.status);
		};
		const device = randomUUID();
		expect(await asNewAnonymous(device)).toBe(200);
		expect(await asNewAnonymous(device)).toBe(429);
		expect(await asNewAnonymous(randomUUID())).toBe(200);
		expect(await asNewAnonymous()).toBe(200);
		expect(await asNewAnonymous()).toBe(429);
		const rows = await prisma.rate_limits.findMany({ where: { name } });
		expect(rows).toHaveLength(3);
		for (const row of rows) expect(users).not.toContain(row.key);
	});

	it('takes limit and window from app_config rate.<name> when set', async () => {
		const { name, app } = limited({ key: 'ip', limit: 100 });
		await prisma.app_config.create({ data: { key: `rate.${name}`, value: { limit: 1, window: 60 } } });
		configStore.invalidate();
		expect((await request(app).post('/x')).status).toBe(200);
		const res = await request(app).post('/x');
		expect(res.status).toBe(429);
		expect(Number(res.headers['retry-after'])).toBeLessThanOrEqual(60);
	});

	it.each([
		['a zero limit', { limit: 0, window: 60 }],
		['a negative limit', { limit: -1, window: 60 }],
		['a zero window', { limit: 1, window: 0 }],
		['a negative window', { limit: 1, window: -60 }],
		['a window over 48 h', { limit: 1, window: 172_801 }],
	])('ignores an app_config override with %s (code defaults apply)', async (_name, value) => {
		const { name, app } = limited({ key: 'ip' });
		await prisma.app_config.create({ data: { key: `rate.${name}`, value } });
		configStore.invalidate();
		expect((await request(app).post('/x')).status).toBe(200);
		expect((await request(app).post('/x')).status).toBe(200);
		expect((await request(app).post('/x')).status).toBe(429);
	});
});
