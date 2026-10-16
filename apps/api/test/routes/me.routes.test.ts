// GET/PATCH /v1/me (C3) over real auth.users rows: own profile with private fields, validation, no role changes,
// home coarsened once (C6); POST /v1/me/convert-password (C7 §6) with the Auth Admin API stubbed (fetch). The guards (requireVerified, requireVerifiedOrAnonymous) are covered with every actor
// type in test/middleware/auth.middleware.test.ts.
import { randomInt } from 'node:crypto';

import request from 'supertest';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';

import { app } from '../../app.ts';
import { config } from '../../lib/config.ts';
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

	it('copies a locale change to Auth user_metadata via the Admin API with the secret key', async () => {
		const { id, auth } = await user();
		const mutable = config as { SUPABASE_SECRET_KEY?: string };
		mutable.SUPABASE_SECRET_KEY = 'service-key';
		const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 200 }));
		try {
			const res = await request(app).patch('/v1/me').set('Authorization', auth).send({ locale: 'en' });
			expect(res.status).toBe(200);
			expect(spy).toHaveBeenCalledTimes(1);
			const [url, init] = spy.mock.calls[0]!;
			expect(url).toBe(`${config.SUPABASE_URL}/auth/v1/admin/users/${id}`);
			expect(init).toMatchObject({ method: 'PUT', body: JSON.stringify({ user_metadata: { locale: 'en' } }) });
			expect((init!.headers as Record<string, string>).Authorization).toBe('Bearer service-key');
			spy.mockClear();
			await request(app).patch('/v1/me').set('Authorization', auth).send({ display_name: 'x' });
			expect(spy).not.toHaveBeenCalled();
		} finally {
			spy.mockRestore();
			delete mutable.SUPABASE_SECRET_KEY;
		}
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
		const res = await request(app).patch('/v1/me').set('Authorization', auth).send({ display_name: 'Mallory' });
		expect(res.status).toBe(200);
		for (const body of [
			{ role: 'ADMIN' },
			{ is_anonymous: true },
			{ email: 'evil@example.com' },
			{ email_verified: true },
		]) {
			const bad = await request(app).patch('/v1/me').set('Authorization', auth).send(body);
			expect(bad.status, JSON.stringify(body)).toBe(400);
			expect(bad.body.error.code).toBe('VALIDATION');
		}
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

describe('POST /v1/me/convert-password (C7 §6)', () => {
	const mutable = config as { SUPABASE_SECRET_KEY?: string };
	/** What the Auth Admin API answers: GET admin/users/:id (the user) and PUT (the password). */
	const gotrue = { user: {} as Record<string, unknown>, put: () => new Response('{}', { status: 200 }) };
	let spy: MockInstance<typeof fetch>;
	const puts = () => spy.mock.calls.filter(([, init]) => init?.method === 'PUT');

	beforeEach(() => {
		mutable.SUPABASE_SECRET_KEY = 'service-key';
		gotrue.put = () => new Response('{}', { status: 200 });
		spy = vi
			.spyOn(globalThis, 'fetch')
			.mockImplementation(async (_url, init) =>
				init?.method === 'PUT' ? gotrue.put() : new Response(JSON.stringify(gotrue.user), { status: 200 })
			);
	});
	afterEach(() => {
		spy.mockRestore();
		delete mutable.SUPABASE_SECRET_KEY;
	});
	afterAll(async () => {
		await prisma.rate_limits.deleteMany({ where: { name: 'me.convert_password' } });
		await prisma.audit_log.deleteMany({ where: { actor_id: { in: ids } } });
	});

	// Its own client IP per call (trust proxy), so only the rate limit test trips the 10 per hour.
	const ip = () => `10.17.${randomInt(256)}.${randomInt(1, 255)}`;
	const convert = (auth: string | null, body: object = { password: 'mačka v škornjih' }, from = ip()) => {
		const req = request(app).post('/v1/me/convert-password').set('X-Forwarded-For', from);
		if (auth) req.set('Authorization', auth);
		return req.send(body);
	};

	it('sets the password of an anonymous session with a pending address through the Admin API, audited without it', async () => {
		const { id, auth } = await user({ is_anonymous: true });
		gotrue.user = { id, is_anonymous: true, email: '', new_email: 'ana@example.si' };
		const res = await convert(auth);
		expect(res.status).toBe(204);

		const url = `${config.SUPABASE_URL}/auth/v1/admin/users/${id}`;
		expect(spy.mock.calls.map(([to, init]) => [to, init?.method ?? 'GET'])).toEqual([
			[url, 'GET'],
			[url, 'PUT'],
		]);
		const [, init] = puts()[0]!;
		expect(init!.body).toBe(JSON.stringify({ password: 'mačka v škornjih' }));
		expect((init!.headers as Record<string, string>).Authorization).toBe('Bearer service-key');

		const audit = await prisma.audit_log.findMany({ where: { actor_id: id } });
		expect(audit).toMatchObject([{ action: 'user.password.convert', target_type: 'profile', target_id: id }]);
		expect(JSON.stringify(audit)).not.toMatch(/mačka|ana@example/);
		// Still anonymous until the email_change link is opened.
		expect((await request(app).get('/v1/me').set('Authorization', auth)).body.is_anonymous).toBe(true);
	});

	it('refuses every account (user, moderator, admin with TOTP), and a session Auth no longer calls anonymous, with FORBIDDEN', async () => {
		for (const [role, aal] of [
			['USER', 'aal1'],
			['MODERATOR', 'aal2'],
			['ADMIN', 'aal2'],
		] as const) {
			const account = await user({}, { aal });
			await prisma.profiles.create({ data: { id: account.id, role } });
			gotrue.user = { id: account.id, is_anonymous: false, new_email: 'x@y.si' };
			const res = await convert(account.auth);
			expect([res.status, res.body.error.code], role).toEqual([403, 'FORBIDDEN']);
		}
		// The token alone refuses them: Auth is not even asked.
		expect(spy).not.toHaveBeenCalled();

		// Converted meanwhile (the link was opened) while the old anonymous token is still valid.
		const stale = await user({ is_anonymous: true });
		gotrue.user = { id: stale.id, is_anonymous: false, email: 'ana@example.si' };
		const again = await convert(stale.auth);
		expect([again.status, again.body.error.code]).toEqual([403, 'FORBIDDEN']);
		expect(puts()).toEqual([]);
	});

	it('refuses an anonymous session without a pending address', async () => {
		const { id, auth } = await user({ is_anonymous: true });
		for (const pending of [undefined, null, '']) {
			gotrue.user = { id, is_anonymous: true, email: '', new_email: pending };
			const res = await convert(auth);
			expect([res.status, res.body.error.code]).toEqual([403, 'FORBIDDEN']);
		}
		expect(puts()).toEqual([]);
	});

	it("refuses a weak password: the sign-up policy before Auth is asked, then GoTrue's own", async () => {
		const { id, auth } = await user({ is_anonymous: true });
		gotrue.user = { id, is_anonymous: true, new_email: 'ana@example.si' };
		for (const body of [
			{ password: '1234567' },
			{ password: 'x'.repeat(73) },
			{},
			{ password: 'mačka v škornjih', email: 'a@b.si' },
		]) {
			const res = await convert(auth, body);
			expect([res.status, res.body.error.code], JSON.stringify(body)).toEqual([400, 'VALIDATION']);
		}
		expect(spy).not.toHaveBeenCalled();

		gotrue.put = () =>
			new Response(
				JSON.stringify({ code: 422, error_code: 'weak_password', msg: 'Password is known to be weak' }),
				{
					status: 422,
				}
			);
		const res = await convert(auth, { password: 'password123' });
		expect(res.status).toBe(400);
		expect(res.body.error).toMatchObject({
			code: 'VALIDATION',
			details: { auth_code: 'weak_password' },
			issues: [{ path: 'password' }],
		});
		expect(await prisma.audit_log.count({ where: { actor_id: id } })).toBe(0);
	});

	it('answers UNAUTHENTICATED without a session, and SERVICE_UNAVAILABLE without the Admin API key', async () => {
		const res = await convert(null);
		expect([res.status, res.body.error.code]).toEqual([401, 'UNAUTHENTICATED']);
		const { auth } = await user({ is_anonymous: true });
		delete mutable.SUPABASE_SECRET_KEY;
		const off = await convert(auth);
		expect([off.status, off.body.error.code]).toEqual([503, 'SERVICE_UNAVAILABLE']);
		expect(spy).not.toHaveBeenCalled();
	});

	it('limits each IP to 10 per hour, whichever anonymous session sends them', async () => {
		const from = ip();
		const sessions = await Promise.all(Array.from({ length: 11 }, () => user({ is_anonymous: true })));
		gotrue.user = { is_anonymous: true, new_email: 'ana@example.si' };
		for (const session of sessions.slice(0, 10))
			expect((await convert(session.auth, undefined, from)).status).toBe(204);
		const res = await convert(sessions[10]!.auth, undefined, from);
		expect([res.status, res.body.error.code]).toEqual([429, 'RATE_LIMITED']);
		expect(Number(res.headers['retry-after'])).toBeGreaterThan(0);
		expect(puts()).toHaveLength(10);
	});
});
