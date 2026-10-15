// TASK-88.2: public directory endpoints (C18) with Supertest against the seeded local database.
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { app } from '../../app.ts';
import { prisma } from '../../prisma/prisma.ts';
import seedGeo from '../../prisma/seeders/01-geo.seeder.ts';
import seedDirectory from '../../prisma/seeders/05-directory.seeder.ts';
import { signTestToken } from '../helpers/token.ts';

const CACHE = 'public, max-age=3600';
const INACTIVE = 'test-inactive-shelter';

beforeAll(async () => {
	await seedGeo();
	await seedDirectory();
	const ljubljana = await prisma.shelters.findUniqueOrThrow({ where: { slug: 'zavetisce-ljubljana' } });
	const { id: _id, created_at: _c, updated_at: _u, ...copy } = ljubljana;
	await prisma.shelters.create({
		data: { ...copy, opening_hours: [], slug: INACTIVE, name: 'Neaktivno', active: false },
	});
});

afterAll(async () => {
	await prisma.shelters.deleteMany({ where: { slug: INACTIVE } });
});

describe('GET /v1/shelters', () => {
	it('lists the 17 active shelters by name with summary fields, cacheable', async () => {
		const res = await request(app).get('/v1/shelters');
		expect(res.status).toBe(200);
		expect(res.headers['cache-control']).toBe(CACHE);
		expect(res.headers.vary).toMatch(/Accept-Language/i);
		const { items } = res.body;
		expect(items).toHaveLength(17);
		const names = items.map((s: { name: string }) => s.name);
		expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, 'sl')));
		expect(items.find((s: { slug: string }) => s.slug === 'zavetisce-ljubljana')).toEqual({
			slug: 'zavetisce-ljubljana',
			name: 'Zavetišče Ljubljana',
			city: 'Ljubljana',
			phone: '+38612560279',
			phone_display: '01 256 02 79',
			area: 'Osrednjeslovenska',
			municipality_count: 13,
			verified_at: '2026-10-15',
			source: expect.any(String),
			species: ['dog', 'cat'],
		});
		expect(items.find((s: { slug: string }) => s.slug === 'macji-dol').species).toEqual(['cat']);
	});

	it('localises area with Accept-Language', async () => {
		const res = await request(app).get('/v1/shelters').set('Accept-Language', 'en');
		expect(res.body.items.find((s: { slug: string }) => s.slug === 'zavetisce-ljubljana').area).toBe(
			'Central Slovenia'
		);
	});
});

describe('GET /v1/shelters/:slug', () => {
	it('returns the shelter with its confirmed municipalities', async () => {
		const res = await request(app).get('/v1/shelters/zavetisce-ljubljana');
		expect(res.status).toBe(200);
		expect(res.headers['cache-control']).toBe(CACHE);
		expect(res.body).toMatchObject({
			slug: 'zavetisce-ljubljana',
			address: 'Gmajnice 30',
			postal_code: '1000',
			lat: 46.0212,
			lng: 14.44216,
			email: 'info@zavetisce-ljubljana.si',
			opening_hours: expect.arrayContaining([expect.objectContaining({ days: 'mon-fri', from: '08:00' })]),
			verified_at: '2026-10-15',
		});
		expect(res.body).not.toHaveProperty('id');
		expect(res.body).not.toHaveProperty('registry_id');
		expect(res.body.municipalities).toHaveLength(13);
		expect(res.body.municipalities).toContainEqual({ slug: 'ljubljana', name: 'Ljubljana' });
	});

	it('404 for unknown or inactive shelters, 400 for a bad slug', async () => {
		expect((await request(app).get('/v1/shelters/ni-takega')).body.error.code).toBe('NOT_FOUND');
		expect((await request(app).get(`/v1/shelters/${INACTIVE}`)).status).toBe(404);
		expect((await request(app).get('/v1/shelters/Not_A_Slug')).status).toBe(400);
	});
});

describe('GET /v1/shelters/municipalities', () => {
	it('lists all 212 municipalities, shelter_slug only when confirmed', async () => {
		const res = await request(app).get('/v1/shelters/municipalities');
		expect(res.status).toBe(200);
		expect(res.headers['cache-control']).toBe(CACHE);
		const { items } = res.body as { items: { slug: string; name: string; shelter_slug: string | null }[] };
		expect(items).toHaveLength(212);
		expect(items.filter((m) => m.shelter_slug)).toHaveLength(74);
		expect(items.find((m) => m.slug === 'ljubljana')).toEqual({
			slug: 'ljubljana',
			name: 'Ljubljana',
			shelter_slug: 'zavetisce-ljubljana',
		});
		// Unconfirmed, even with a likely shelter.
		expect(items.find((m) => m.slug === 'beltinci')?.shelter_slug).toBeNull();
	});
});

describe('GET /v1/shelters/responsible', () => {
	const get = (query: Record<string, string | number>) => request(app).get('/v1/shelters/responsible').query(query);

	it('confirmed by point (2 decimals) and by municipality', async () => {
		const res = await get({ lat: 46.05, lng: 14.51 });
		expect(res.status).toBe(200);
		expect(res.headers['cache-control']).toBe(CACHE);
		expect(res.body).toMatchObject({
			status: 'confirmed',
			municipality: { slug: 'ljubljana', name: 'Ljubljana' },
			shelter: { slug: 'zavetisce-ljubljana', phone: '+38612560279', phone_display: '01 256 02 79' },
		});
		expect((await get({ municipality: 'ljubljana' })).body).toEqual(res.body);
	});

	it('likely: phone only inside likely_shelter', async () => {
		const res = await get({ municipality: 'beltinci' });
		expect(res.body).toEqual({
			status: 'likely',
			municipality: { slug: 'beltinci', name: 'Beltinci' },
			likely_shelter: {
				slug: 'zavetisce-mala-hisa',
				name: 'Zavetišče Mala hiša',
				phone: '+38631732700',
				distance_km: expect.any(Number),
			},
		});
	});

	it('unconfirmed: never a phone number, up to 2 nearest shelters', async () => {
		for (const municipality of ['osilnica', 'zuzemberk', 'rogaska-slatina']) {
			const res = await get({ municipality });
			expect(res.body).toMatchObject({ status: 'unconfirmed', municipality: { slug: municipality } });
			expect(res.body.nearest).toHaveLength(2);
			expect(JSON.stringify(res.body)).not.toMatch(/phone|\+386/);
		}
	});

	it('Ivančna Gorica / Žužemberk overlap point resolves to Ivančna Gorica', async () => {
		const res = await get({ lat: 45.85705, lng: 14.857229 });
		expect(res.body).toMatchObject({ status: 'confirmed', municipality: { slug: 'ivancna-gorica' } });
	});

	it('outside Slovenia', async () => {
		const res = await get({ lat: 45.82, lng: 15.98 }); // Zagreb
		expect(res.status).toBe(200);
		expect(res.body).toEqual({ status: 'outside_slovenia' });
	});

	it('400 without a point or municipality, for half a point, both, or out of range; 404 for an unknown slug', async () => {
		for (const query of [
			{},
			{ lat: 46.05 },
			{ lat: 46.05, lng: 14.51, municipality: 'ljubljana' },
			{ lat: 91, lng: 14 },
			{ lat: 'x', lng: 14 },
		]) {
			const res = await get(query);
			expect(res.status, JSON.stringify(query)).toBe(400);
			expect(res.body.error.code).toBe('VALIDATION');
		}
		expect((await get({ municipality: 'atlantida' })).status).toBe(404);
	});
});

describe('permissions: public for everyone', () => {
	it('answers the same with no token, an anonymous token or a user token', async () => {
		const tokens = [await signTestToken({ is_anonymous: true }), await signTestToken()];
		const anonymous = await request(app).get('/v1/shelters/responsible?municipality=ljubljana');
		for (const token of tokens) {
			const res = await request(app)
				.get('/v1/shelters/responsible?municipality=ljubljana')
				.set('Authorization', `Bearer ${token}`);
			expect(res.status).toBe(200);
			expect(res.body).toEqual(anonymous.body);
		}
	});
});
