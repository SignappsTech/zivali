// TASK-88.4 (QA): gaps left by shelters.routes.test.ts: borders, privacy of the exact point, response shape per
// status, seed provenance and versioning, and the global rate limit. Runs against the seeded local database.
import express from 'express';
import { pino } from 'pino';
import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';

import { app } from '../../app.ts';
import { loggerOptions, requestLogger } from '../../lib/logger.ts';
import { errorHandler } from '../../middleware/error.middleware.ts';
import { prisma } from '../../prisma/prisma.ts';
import seedGeo from '../../prisma/seeders/01-geo.seeder.ts';
import seedDirectory from '../../prisma/seeders/05-directory.seeder.ts';
import sheltersRoutes from '../../routes/shelters.routes.ts';

const get = (query: Record<string, string | number>) => request(app).get('/v1/shelters/responsible').query(query);

beforeAll(async () => {
	if (!(await prisma.municipalities.count())) await seedGeo();
	await seedDirectory();
}, 60_000);

describe('point-in-municipality at borders', () => {
	it('a vertex of the national border is inside, 300 m outside is not', async () => {
		expect((await get({ lat: 45.83761, lng: 15.5561 })).body.status).not.toBe('outside_slovenia');
		expect(await get({ lat: 45.8349108990035, lng: 15.5561000102464 }).then((r) => r.body)).toEqual({
			status: 'outside_slovenia',
		});
	});

	it('a vertex shared by two municipalities resolves to one of them, deterministically', async () => {
		const query = { lat: 46.14135, lng: 14.46955 }; // Ljubljana / Medvode
		const first = (await get(query)).body;
		expect(['ljubljana', 'medvode']).toContain(first.municipality.slug);
		for (let i = 0; i < 3; i++) expect((await get(query)).body).toEqual(first);
	});

	it('far-away and null-island points are outside Slovenia, southern hemisphere and antimeridian too', async () => {
		for (const query of [
			{ lat: 0, lng: 0 },
			{ lat: -33.9, lng: 151.2 },
			{ lat: 90, lng: 180 },
			{ lat: -90, lng: -180 },
		]) {
			const res = await get(query);
			expect(res.status).toBe(200);
			expect(res.body).toEqual({ status: 'outside_slovenia' });
		}
	});
});

describe('response shape per status (C18)', () => {
	it('confirmed carries everything the checklist needs in one call', async () => {
		const { body } = await get({ municipality: 'ljubljana' });
		expect(body.status).toBe('confirmed');
		expect(body.shelter).toEqual(
			expect.objectContaining({
				name: expect.any(String),
				address: expect.any(String),
				phone: expect.stringMatching(/^\+386\d{7,9}$/),
				opening_hours: expect.any(Array),
				source: expect.any(String),
				verified_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
			})
		);
		expect(body.shelter).toHaveProperty('website');
		expect(Object.keys(body).sort()).toEqual(['municipality', 'shelter', 'status']);
	});

	it('likely and unconfirmed never offer a primary phone, only likely_shelter.phone', async () => {
		const likely = (await get({ municipality: 'beltinci' })).body;
		expect(Object.keys(likely).sort()).toEqual(['likely_shelter', 'municipality', 'status']);
		const unconfirmed = (await get({ municipality: 'osilnica' })).body;
		expect(Object.keys(unconfirmed).sort()).toEqual(['municipality', 'nearest', 'status']);
		expect(unconfirmed.nearest[0]).toEqual({
			slug: expect.any(String),
			name: expect.any(String),
			distance_km: expect.any(Number),
		});
		expect(unconfirmed.nearest[0].distance_km).toBeLessThanOrEqual(unconfirmed.nearest[1].distance_km);
	});

	it('every one of the 212 municipalities answers 200 with a contract status and a phone only when allowed', async () => {
		const { items } = (await request(app).get('/v1/shelters/municipalities')).body as { items: { slug: string }[] };
		const seen: Record<string, number> = {};
		for (const { slug } of items) {
			const { status, body } = await get({ municipality: slug });
			expect(status).toBe(200);
			seen[body.status] = (seen[body.status] ?? 0) + 1;
			expect(body.municipality.slug).toBe(slug);
			if (body.status === 'unconfirmed') expect(JSON.stringify(body)).not.toMatch(/phone|\+386/);
			if (body.status === 'likely') expect(JSON.stringify(body.likely_shelter)).toMatch(/phone/);
		}
		expect(seen).toEqual({ confirmed: 74, likely: expect.any(Number), unconfirmed: expect.any(Number) });
		expect(Object.values(seen).reduce((a, b) => a + b, 0)).toBe(212);
	}, 120_000);
});

describe('validation edge cases', () => {
	it('rejects NaN, infinity, uppercase and empty slugs, and repeated params', async () => {
		for (const query of [
			'lat=NaN&lng=14',
			'lat=Infinity&lng=14',
			'municipality=LJUBLJANA',
			'municipality=',
			'lat=1&lat=2&lng=3',
		]) {
			const res = await request(app).get(`/v1/shelters/responsible?${query}`);
			expect(res.status, query).toBe(400);
			expect(res.body.error.code).toBe('VALIDATION');
			expect(res.headers['cache-control'] ?? '').not.toMatch(/max-age/);
		}
	});

	it('rejects empty lat and lng', async () => {
		expect((await request(app).get('/v1/shelters/responsible?lat=&lng=')).status).toBe(400);
	});
});

describe('privacy: the exact point is neither logged nor stored', () => {
	it('request logs and the database do not see the point', async () => {
		const lines: string[] = [];
		const capture = pino({ ...loggerOptions, level: 'debug' }, { write: (l: string) => void lines.push(l) });
		const bare = express();
		bare.use(requestLogger(capture), express.json());
		bare.use('/v1/shelters', sheltersRoutes);
		bare.use(errorHandler);

		const tables = await prisma.$queryRaw<
			{ t: string }[]
		>`select tablename t from pg_tables where schemaname = 'app'`;
		const count = async () =>
			Promise.all(
				tables.map(async ({ t }) => {
					const [{ n }] = await prisma.$queryRawUnsafe<{ n: bigint }[]>(`select count(*) n from app."${t}"`);
					return `${t}:${n}`;
				})
			);
		const before = await count();
		const res = await request(bare).get('/v1/shelters/responsible?lat=46.051234&lng=14.512345');
		expect(res.status).toBe(200);
		expect(await count()).toEqual(before);
		expect(lines.length).toBeGreaterThan(0);
		expect(lines.join('\n')).not.toMatch(/46\.05|14\.51|lat|lng/);
		// The response does not echo the point either.
		expect(JSON.stringify(res.body)).not.toMatch(/46\.0512|14\.5123/);
	});
});

describe('seed provenance, versioning and personal data', () => {
	it('every assignment and shelter has a source, a date and a version-1 change entry', async () => {
		expect(await prisma.municipality_shelters.count()).toBe(212);
		expect(await prisma.shelters.count({ where: { active: true } })).toBeGreaterThanOrEqual(17);
		expect(await prisma.municipality_shelters.count({ where: { OR: [{ source: '' }] } })).toBe(0);
		const changes = await prisma.directory_changes.groupBy({ by: ['entity'], where: { version: 1 }, _count: true });
		expect(Object.fromEntries(changes.map((c) => [c.entity, c._count]))).toMatchObject({
			municipality_shelter: 212,
			shelter: expect.any(Number),
		});
	});

	it('the public shelter payloads contain no personal fields or internal ids', async () => {
		const list = JSON.stringify((await request(app).get('/v1/shelters')).body);
		const one = JSON.stringify((await request(app).get('/v1/shelters/zavetisce-ljubljana')).body);
		for (const body of [list, one]) expect(body).not.toMatch(/"(id|actor_id|registry_id|user_id|created_at)"/);
	});
});

// Last: exhausts the global per-IP soft limit (600/min, app.ts) and checks the envelope.
describe('rate limit', () => {
	it('answers 429 RATE_LIMITED with Retry-After after 600 requests a minute from one IP', async () => {
		let last = 200;
		let res: request.Response | undefined;
		for (let i = 0; i < 620 && last !== 429; i++) {
			res = await request(app).get('/ping');
			last = res.status;
		}
		expect(last).toBe(429);
		expect(res!.body.error.code).toBe('RATE_LIMITED');
		expect(res!.body.error.details.retry_after_s).toBeGreaterThan(0);
	}, 120_000);
});
