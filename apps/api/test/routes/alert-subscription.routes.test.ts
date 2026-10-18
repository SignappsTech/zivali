// GET/PUT/DELETE /v1/alert-subscription (C10) over real auth.users rows: guards for every actor type, validation,
// the centre coarsened once (C6), pausing, own subscription only.
import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';

import { app } from '../../app.ts';
import { prisma } from '../../prisma/prisma.ts';
import { createAuthUser, deleteAuthUsers, signTestToken, type TestTokenClaims } from '../helpers/token.ts';

const PATH = '/v1/alert-subscription';
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

const body = { center: { lat: 46.056947, lng: 14.505751 }, radius_km: 5, species: ['dog', 'cat'], paused: false };
const put = (auth: string, payload: object = body) => request(app).put(PATH).set('Authorization', auth).send(payload);
const get = (auth: string) => request(app).get(PATH).set('Authorization', auth);
const del = (auth: string) => request(app).delete(PATH).set('Authorization', auth);

describe('guards', () => {
	it('answers 401 UNAUTHENTICATED without a token and for anonymous finders, on every method', async () => {
		const anonymous = await user({ is_anonymous: true });
		for (const auth of [undefined, anonymous.auth]) {
			for (const res of [
				await request(app)
					.get(PATH)
					.set('Authorization', auth ?? ''),
				await request(app)
					.put(PATH)
					.set('Authorization', auth ?? '')
					.send(body),
				await request(app)
					.delete(PATH)
					.set('Authorization', auth ?? ''),
			]) {
				expect(res.status).toBe(401);
				expect(res.body.error.code).toBe('UNAUTHENTICATED');
			}
		}
		expect(await prisma.alert_subscriptions.count({ where: { user_id: anonymous.id } })).toBe(0);
	});

	it('needs a confirmed email to subscribe (UNVERIFIED_EMAIL); such a user reads null and may delete', async () => {
		const { id, auth } = await user({ email_verified: false });
		const res = await put(auth);
		expect(res.status).toBe(403);
		expect(res.body.error.code).toBe('UNVERIFIED_EMAIL');
		expect(await prisma.alert_subscriptions.count({ where: { user_id: id } })).toBe(0);
		expect((await get(auth)).body).toBeNull();
		expect((await del(auth)).status).toBe(204);
	});

	it('lets every verified role (user, moderator and admin at aal1 and aal2) manage only their own subscription', async () => {
		const owner = await user();
		expect((await put(owner.auth)).status).toBe(200);
		for (const [role, aal] of [
			['USER', 'aal1'],
			['MODERATOR', 'aal1'],
			['MODERATOR', 'aal2'],
			['ADMIN', 'aal2'],
		] as const) {
			const other = await user({}, { aal });
			await prisma.profiles.upsert({ where: { id: other.id }, create: { id: other.id, role }, update: { role } });
			expect((await get(other.auth)).body, role).toBeNull();
			expect((await del(other.auth)).status).toBe(204);
			const own = await put(other.auth, { ...body, radius_km: 1 });
			expect(own.status, `${role} ${aal}`).toBe(200);
			expect(own.body.radius_km).toBe(1);
		}
		expect((await get(owner.auth)).body.radius_km).toBe(5);
	});
});

describe('PUT /v1/alert-subscription', () => {
	it('rejects radius outside 1-25 km, unknown species, a bad centre and a missing paused', async () => {
		const { id, auth } = await user();
		for (const payload of [
			{ ...body, radius_km: 0 },
			{ ...body, radius_km: 26 },
			{ ...body, radius_km: 2.5 },
			{ ...body, species: ['bird'] },
			{ ...body, species: ['dog', 'cat', 'dog'] },
			{ ...body, center: { lat: 91, lng: 14.5 } },
			{ ...body, center: undefined },
			{ ...body, paused: undefined },
		]) {
			const res = await put(auth, payload);
			expect(res.status, JSON.stringify(payload)).toBe(400);
			expect(res.body.error.code).toBe('VALIDATION');
		}
		expect(await prisma.alert_subscriptions.count({ where: { user_id: id } })).toBe(0);
	});

	it('creates the subscription with the centre coarsened by 20-30 m and the default daily cap', async () => {
		const { id, auth } = await user();
		const res = await put(auth, { ...body, species: ['cat', 'cat'] });
		expect(res.status).toBe(200);
		expect(res.body).toMatchObject({ radius_km: 5, species: ['cat'], paused: false, daily_cap: 5 });
		expect(Object.keys(res.body).sort()).toEqual(
			['center', 'created_at', 'daily_cap', 'paused', 'radius_km', 'species', 'updated_at'].sort()
		);
		const distance = metres(body.center, res.body.center);
		expect(distance).toBeGreaterThanOrEqual(19.5);
		expect(distance).toBeLessThanOrEqual(30.5);
		const [column] = await prisma.$queryRaw<{ lat: number; lng: number }[]>`
			select extensions.st_y(center_point::extensions.geometry) as lat,
				extensions.st_x(center_point::extensions.geometry) as lng
			from app.alert_subscriptions where user_id = ${id}::uuid`;
		expect(column).toEqual(res.body.center);
	});

	it('keeps the stored centre when it is sent back, coarsens a new one, and supports pausing', async () => {
		const { auth } = await user();
		const stored = (await put(auth)).body.center;
		const paused = await put(auth, { ...body, center: stored, paused: true, radius_km: 25, species: ['dog'] });
		expect(paused.body).toMatchObject({ center: stored, paused: true, radius_km: 25, species: ['dog'] });
		expect((await get(auth)).body).toEqual(paused.body);

		const moved = { lat: 46.239, lng: 15.267 };
		const next = (await put(auth, { ...body, center: moved })).body;
		expect(next.paused).toBe(false);
		expect(metres(moved, next.center)).toBeGreaterThanOrEqual(19.5);
		expect(metres(moved, next.center)).toBeLessThanOrEqual(30.5);
	});

	it('accepts no animals: nothing selected is stored as an empty list (no alerts, TASK-114.14)', async () => {
		const { auth } = await user();
		const res = await put(auth, { ...body, species: [] });
		expect(res.status).toBe(200);
		expect(res.body).toMatchObject({ species: [], paused: false });
		expect((await get(auth)).body.species).toEqual([]);
	});
});

describe('GET and DELETE /v1/alert-subscription', () => {
	it('returns null without a subscription, the subscription after PUT, and null again after DELETE', async () => {
		const { id, auth } = await user();
		const empty = await get(auth);
		expect(empty.status).toBe(200);
		expect(empty.body).toBeNull();
		const saved = (await put(auth)).body;
		expect((await get(auth)).body).toEqual(saved);
		const res = await del(auth);
		expect(res.status).toBe(204);
		expect(await prisma.alert_subscriptions.count({ where: { user_id: id } })).toBe(0);
		expect((await get(auth)).body).toBeNull();
	});
});
