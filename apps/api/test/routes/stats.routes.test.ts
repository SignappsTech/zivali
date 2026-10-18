// TASK-115.4: GET /v1/stats/public, the homepage numbers. The counts against the real database, the publish rule
// (rounded down to 10, null under 50), the 5-minute cache, failures not cached, and no other fields in the answer.
import { randomUUID } from 'node:crypto';

import request from 'supertest';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { app } from '../../app.ts';
import { StatsDomain } from '../../domains/stats/index.ts';
import StatsDao from '../../domains/stats/stats.dao.ts';
import { CACHE_MS } from '../../domains/stats/stats.domain.ts';
import { Prisma } from '../../generated/client.ts';
import { systemCtx } from '../../lib/ctx.ts';
import { prisma } from '../../prisma/prisma.ts';
import { signTestToken } from '../helpers/token.ts';

const POINT = Prisma.sql`extensions.st_setsrid(extensions.st_makepoint(14.5051, 46.0512), 4326)::extensions.geography`;
const reports: string[] = [];
const users: string[] = [];
const raw = (reunited_total: number, open_reports: number, alert_subscribers: number) => ({
	reunited_total,
	open_reports,
	alert_subscribers,
});

async function report(status: string, moderation = 'visible', type = 'lost'): Promise<void> {
	const id = randomUUID();
	reports.push(id);
	await prisma.$executeRaw`
		insert into app.reports (id, short_code, type, species, status, moderation_state, event_at, exact_point,
			public_point, public_radius_m, in_slovenia)
		values (${id}::uuid, ${id.slice(0, 8)}, ${type}::app."REPORT_TYPE", 'dog', ${status}::app."REPORT_STATUS",
			${moderation}::app."MODERATION_STATE", now(), ${POINT}, ${POINT}, 500, true)`;
}

async function subscription(species: string[], paused = false): Promise<void> {
	const id = randomUUID();
	users.push(id);
	await prisma.profiles.create({ data: { id } });
	await prisma.$executeRaw`
		insert into app.alert_subscriptions (id, user_id, center_point, radius_km, species, paused, updated_at)
		values (gen_random_uuid(), ${id}::uuid, ${POINT}, 5, ${species}::text[], ${paused}, now())`;
}

// The cache keys on the request time: each test starts well after the last one's cache has expired.
let clock = Date.now();
const later = () => vi.setSystemTime((clock += 10 * CACHE_MS));

beforeEach(() => {
	vi.useFakeTimers({ toFake: ['Date'] });
	later();
});

afterEach(() => {
	vi.useRealTimers();
	vi.restoreAllMocks();
});

afterAll(async () => {
	await prisma.reports.deleteMany({ where: { id: { in: reports } } });
	await prisma.profiles.deleteMany({ where: { id: { in: users } } });
});

describe('publishCount', () => {
	it.each([
		[0, null],
		[49, null],
		[50, 50],
		[59, 50],
		[1357, 1350],
	])('%s → %s', (n, shown) => expect(StatsDomain.publishCount(n)).toBe(shown));
});

describe('stats counts (database)', () => {
	it('counts visible reunited reports, visible open or matched reports and active subscriptions', async () => {
		vi.useRealTimers();
		const before = await StatsDao.countPublic();

		await report('reunited');
		await report('reunited', 'visible', 'found');
		await report('reunited', 'hidden');
		await report('open');
		await report('matched', 'visible', 'sighted');
		await report('open', 'held');
		await report('open', 'removed');
		await report('closed');
		await subscription(['dog', 'cat']);
		await subscription(['cat']);
		await subscription(['dog'], true); // paused
		await subscription([]); // no species: no alerts

		const after = await StatsDao.countPublic();
		expect(after.reunited_total - before.reunited_total).toBe(2);
		expect(after.open_reports - before.open_reports).toBe(2);
		expect(after.alert_subscribers - before.alert_subscribers).toBe(2);
	});
});

describe('GET /v1/stats/public', () => {
	it('answers anyone with the three published counts only, cacheable for 5 minutes', async () => {
		vi.spyOn(StatsDao, 'countPublic').mockResolvedValue(raw(1357, 49, 50));
		const visitor = await request(app).get('/v1/stats/public');
		expect(visitor.status).toBe(200);
		expect(visitor.headers['cache-control']).toBe('public, max-age=300');
		expect(visitor.body).toEqual({ reunited_total: 1350, open_reports: null, alert_subscribers: 50 });

		const token = await signTestToken();
		const user = await request(app).get('/v1/stats/public').set('Authorization', `Bearer ${token}`);
		expect([user.status, user.body]).toEqual([200, visitor.body]);
	});

	it('real counts: no fields beyond the three, each null or a multiple of 10 from 50', async () => {
		const res = await request(app).get('/v1/stats/public');
		expect(res.status).toBe(200);
		expect(Object.keys(res.body).sort()).toEqual(['alert_subscribers', 'open_reports', 'reunited_total']);
		for (const n of Object.values(res.body))
			if (n !== null) expect(n as number).toSatisfy((v: number) => v >= 50 && v % 10 === 0);
	});

	it('queries once per 5 minutes; concurrent requests share one query', async () => {
		const count = vi.spyOn(StatsDao, 'countPublic').mockResolvedValue(raw(100, 100, 100));
		await Promise.all([request(app).get('/v1/stats/public'), request(app).get('/v1/stats/public')]);
		expect(count).toHaveBeenCalledTimes(1);

		count.mockResolvedValue(raw(200, 200, 200));
		vi.setSystemTime(clock + CACHE_MS - 1);
		expect((await request(app).get('/v1/stats/public')).body.open_reports).toBe(100);
		vi.setSystemTime(clock + CACHE_MS);
		expect((await request(app).get('/v1/stats/public')).body.open_reports).toBe(200);
		expect(count).toHaveBeenCalledTimes(2);
	});

	it('a failed query answers 500 INTERNAL and is not cached: the next request queries again', async () => {
		const count = vi
			.spyOn(StatsDao, 'countPublic')
			.mockRejectedValueOnce(new Error('db down'))
			.mockResolvedValue(raw(60, 60, 60));
		const failed = await request(app).get('/v1/stats/public');
		expect([failed.status, failed.body.error.code]).toEqual([500, 'INTERNAL']);

		const ok = await request(app).get('/v1/stats/public');
		expect([ok.status, ok.body]).toEqual([200, raw(60, 60, 60)]);
		expect(count).toHaveBeenCalledTimes(2);
		expect(await StatsDomain.getPublicStats(undefined, systemCtx())).toEqual(raw(60, 60, 60));
	});
});
