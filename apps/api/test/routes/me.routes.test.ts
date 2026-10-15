// GET/PATCH /v1/me (C3) over real auth.users rows: own profile with private fields, validation, no role changes,
// home coarsened once (C6). The guards (requireVerified, requireVerifiedOrAnonymous) are covered with every actor
// type in test/middleware/auth.middleware.test.ts.
import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';

import { app } from '../../app.ts';
import { prisma } from '../../prisma/prisma.ts';
import { createAuthUser, deleteAuthUsers, signTestToken, type TestTokenClaims } from '../helpers/token.ts';

const ids: string[] = [];
async function user(options?: Parameters<typeof createAuthUser>[0], claims: TestTokenClaims = {}) {
	const id = await createAuthUser(options);
	ids.push(id);
	const token = await signTestToken({ sub: id, is_anonymous: options?.is_anonymous, ...claims });
	return { id, auth: `Bearer ${token}` };
}

afterAll(async () => {
	await deleteAuthUsers(ids);
});

const metres = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
	const dLat = (b.lat - a.lat) * 111_320;
	const dLng = (b.lng - a.lng) * 111_320 * Math.cos((a.lat * Math.PI) / 180);
	return Math.hypot(dLat, dLng);
};

describe('GET /v1/me', () => {
	it('answers 401 without a token', async () => {
		const res = await request(app).get('/v1/me');
		expect(res.status).toBe(401);
		expect(res.body.error.code).toBe('UNAUTHENTICATED');
	});

	it('returns the own profile with private fields, the email and its confirmation from auth.users', async () => {
		const { id, auth } = await user({}, { locale: 'en', aal: 'aal2' });
		const res = await request(app).get('/v1/me').set('Authorization', auth);
		expect(res.status).toBe(200);
		expect(res.body).toEqual({
			id,
			display_name: null,
			locale: 'en',
			role: 'USER',
			is_anonymous: false,
			home: null,
			home_radius_km: 5,
			phone: null,
			quiet_from: null,
			quiet_to: null,
			supporter_badge_visible: true,
			email: `${id}@test.invalid`,
			email_verified: true,
			aal: 'aal2',
		});
	});

	it('reports an unconfirmed email as not verified, and an anonymous finder without email', async () => {
		const unverified = await user({ email_verified: false });
		expect((await request(app).get('/v1/me').set('Authorization', unverified.auth)).body).toMatchObject({
			email_verified: false,
			is_anonymous: false,
		});
		const anonymous = await user({ is_anonymous: true });
		expect((await request(app).get('/v1/me').set('Authorization', anonymous.auth)).body).toMatchObject({
			email: null,
			email_verified: false,
			is_anonymous: true,
		});
	});
});

describe('PATCH /v1/me', () => {
	it('updates the own profile and returns Profile', async () => {
		const { id, auth } = await user();
		const patch = {
			display_name: '  Ana ',
			locale: 'en',
			home_radius_km: 25,
			phone: '+386 41 123 456',
			quiet_from: '22:00',
			quiet_to: '07:00',
			supporter_badge_visible: false,
		};
		const res = await request(app).patch('/v1/me').set('Authorization', auth).send(patch);
		expect(res.status).toBe(200);
		expect(res.body).toEqual({ ...patch, id, display_name: 'Ana', role: 'USER', is_anonymous: false, home: null });
		// The new locale is visible on the next request (profile cache invalidated).
		expect((await request(app).get('/v1/me').set('Authorization', auth)).body.locale).toBe('en');
	});

	it('rejects invalid values with VALIDATION', async () => {
		const { auth } = await user();
		for (const body of [
			{ locale: 'de' },
			{ home_radius_km: 0 },
			{ home_radius_km: 26 },
			{ home_radius_km: 2.5 },
			{ phone: 'call me' },
			{ quiet_from: '25:00' },
			{ display_name: 'x'.repeat(61) },
			{ home: { lat: 91, lng: 14.5 } },
		]) {
			const res = await request(app).patch('/v1/me').set('Authorization', auth).send(body);
			expect(res.status, JSON.stringify(body)).toBe(400);
			expect(res.body.error.code).toBe('VALIDATION');
		}
	});

	it('never changes the role, email or is_anonymous', async () => {
		const { id, auth } = await user();
		const res = await request(app)
			.patch('/v1/me')
			.set('Authorization', auth)
			.send({ role: 'ADMIN', is_anonymous: true, email: 'evil@example.com', display_name: 'Mallory' });
		expect(res.status).toBe(200);
		expect(res.body).toMatchObject({ role: 'USER', is_anonymous: false, display_name: 'Mallory' });
		expect(await prisma.profiles.findUnique({ where: { id }, select: { role: true, is_anonymous: true } })).toEqual(
			{ role: 'USER', is_anonymous: false }
		);
	});

	it('answers 401 without a token', async () => {
		const res = await request(app).patch('/v1/me').send({ locale: 'en' });
		expect(res.status).toBe(401);
	});

	it('stores home coarsened by 20-30 m once, keeps it when sent back or left out, and clears it with null', async () => {
		const { id, auth } = await user();
		const raw = { lat: 46.056947, lng: 14.505751 };
		const patch = (body: object) => request(app).patch('/v1/me').set('Authorization', auth).send(body);

		const stored = (await patch({ home: raw })).body.home;
		const distance = metres(raw, stored);
		expect(distance).toBeGreaterThanOrEqual(19.5);
		expect(distance).toBeLessThanOrEqual(30.5);
		const [column] = await prisma.$queryRaw<{ lat: number; lng: number }[]>`
			select extensions.st_y(home_point::extensions.geometry) as lat, extensions.st_x(home_point::extensions.geometry) as lng
			from app.profiles where id = ${id}::uuid`;
		expect(column).toEqual(stored);

		expect((await patch({ home: stored })).body.home).toEqual(stored);
		expect((await patch({ home_radius_km: 3 })).body.home).toEqual(stored);
		expect((await request(app).get('/v1/me').set('Authorization', auth)).body.home).toEqual(stored);
		expect((await patch({ home: null })).body.home).toBeNull();
	});
});
