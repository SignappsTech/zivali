// authMiddleware, optionalAuth and the guards (C1, C3) with locally signed tokens for every actor type over real
// auth.users rows (email_verified comes from email_confirmed_at), plus one real ES256 token from the local Supabase
// Auth (JWKS path).
import { randomUUID } from 'node:crypto';

import { SignJWT } from 'jose';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { USER_ROLE } from '../../generated/enums.ts';
import { config } from '../../lib/config.ts';
import { AppError } from '../../lib/errors.ts';
import {
	authMiddleware,
	createTokenVerifier,
	invalidateProfile,
	optionalAuth,
} from '../../middleware/auth.middleware.ts';
import {
	rejectAnonymous,
	requireAal2,
	requireRole,
	requireVerified,
	requireVerifiedOrAnonymous,
} from '../../middleware/permission.middleware.ts';
import { prisma } from '../../prisma/prisma.ts';
import { testApp } from '../helpers/app.ts';
import { createAuthUser, deleteAuthUsers, signTestToken, type TestTokenClaims } from '../helpers/token.ts';

const app = testApp((a) => {
	const echo = (req: { user?: unknown }, res: { json: (v: unknown) => void }) => res.json(req.user ?? null);
	a.get('/auth', authMiddleware, echo);
	a.get('/optional', optionalAuth, echo);
	a.get('/real-account', authMiddleware, rejectAnonymous, echo);
	a.get('/verified', authMiddleware, requireVerified, echo);
	a.get('/verified-or-anonymous', authMiddleware, requireVerifiedOrAnonymous, echo);
	a.get('/staff', authMiddleware, requireRole('moderator'), requireAal2, echo);
	a.get('/admin', authMiddleware, requireRole('admin'), requireAal2, echo);
});

const ids: string[] = [];
const newId = () => {
	const id = randomUUID();
	ids.push(id);
	return id;
};
const newUser = async (options?: Parameters<typeof createAuthUser>[0]) => {
	const id = await createAuthUser(options);
	ids.push(id);
	return id;
};
const staff = {} as Record<Extract<USER_ROLE, 'MODERATOR' | 'ADMIN' | 'SHELTER_MEMBER'>, string>;

beforeAll(async () => {
	for (const role of ['MODERATOR', 'ADMIN', 'SHELTER_MEMBER'] as const) staff[role] = await newUser();
	await prisma.profiles.createMany({
		data: Object.entries(staff).map(([role, id]) => ({ id, role: role as USER_ROLE })),
	});
});

afterAll(async () => {
	await deleteAuthUsers(ids);
});

const get = async (path: string, claims?: TestTokenClaims | string) => {
	const req = request(app).get(path);
	if (claims === undefined) return req;
	const token = typeof claims === 'string' ? claims : await signTestToken(claims);
	return req.set('Authorization', `Bearer ${token}`);
};

describe('authMiddleware', () => {
	it('answers 401 UNAUTHENTICATED without a bearer token', async () => {
		for (const res of [await get('/auth'), await request(app).get('/auth').set('Authorization', 'Basic abc')]) {
			expect(res.status).toBe(401);
			expect(res.body.error.code).toBe('UNAUTHENTICATED');
		}
	});

	it('builds the actor and creates the missing profile with the token locale (ensureProfile)', async () => {
		const sub = await newUser();
		const res = await get('/auth', { sub, locale: 'en' });
		expect(res.status).toBe(200);
		expect(res.body).toEqual({
			user_id: sub,
			role: 'USER',
			is_anonymous: false,
			aal: 'aal1',
			email_verified: true,
			locale: 'en',
		});
		expect(await prisma.profiles.findUnique({ where: { id: sub }, select: { locale: true, role: true } })).toEqual({
			locale: 'en',
			role: 'USER',
		});
	});

	it('ignores email_verified forged into user_metadata (updateUser) on an unconfirmed account', async () => {
		const sub = await newUser({ email_verified: false });
		for (const email_verified of [true, 'true']) {
			const forged = { sub, user_metadata: { email_verified } } as unknown as TestTokenClaims;
			expect((await get('/auth', forged)).body).toMatchObject({ user_id: sub, email_verified: false });
			const res = await get('/verified', forged);
			expect(res.status).toBe(403);
			expect(res.body.error.code).toBe('UNVERIFIED_EMAIL');
		}
	});

	it('reads email_verified from auth.users.email_confirmed_at, cached with the profile for 60 s', async () => {
		const sub = await newUser({ email_verified: false });
		expect((await get('/verified', { sub })).status).toBe(403);
		await prisma.$executeRaw`update auth.users set email_confirmed_at = now() where id = ${sub}::uuid`;
		expect((await get('/verified', { sub })).status).toBe(403);
		invalidateProfile(sub);
		expect((await get('/verified', { sub })).status).toBe(200);
	});

	it('never fails on odd optional claims (unknown aal = aal1)', async () => {
		const res = await get('/auth', { sub: newId(), aal: 'aal9' } as unknown as TestTokenClaims);
		expect(res.body).toMatchObject({ aal: 'aal1', email_verified: false });
	});

	it.each([
		['expired', { expiresIn: Math.floor(Date.now() / 1000) - 60 }],
		['signed with another secret', { secret: 'another-secret-another-secret-another-secret' }],
		['for another audience', { audience: 'service_role' }],
		['from another issuer', { issuer: 'https://evil.example/auth/v1' }],
	] as const)('rejects a token %s with 401', async (_name, claims) => {
		const res = await get('/auth', { sub: newId(), ...claims });
		expect(res.status).toBe(401);
		expect(res.body).toEqual({ error: { code: 'UNAUTHENTICATED', message: 'Invalid or expired token' } });
	});

	it('rejects unsigned (alg none) and garbage tokens', async () => {
		const b64 = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
		const exp = Math.floor(Date.now() / 1000) + 600;
		const unsigned = `${b64({ alg: 'none', typ: 'JWT' })}.${b64({ sub: newId(), aud: 'authenticated', iss: `${config.SUPABASE_URL}/auth/v1`, exp })}.`;
		expect((await get('/auth', unsigned)).status).toBe(401);
		expect((await get('/auth', 'not-a-jwt')).status).toBe(401);
	});

	it('accepts the HS256 secret only when APP_ENV=local', async () => {
		const token = await signTestToken({ sub: newId() });
		const local = createTokenVerifier({ ...config, APP_ENV: 'local' });
		await expect(local(token)).resolves.toMatchObject({ aal: 'aal1' });
		for (const APP_ENV of ['staging', 'production'] as const) {
			const verify = createTokenVerifier({ ...config, APP_ENV });
			await expect(verify(token)).rejects.toMatchObject({ code: 'UNAUTHENTICATED' });
			await expect(verify(token)).rejects.toBeInstanceOf(AppError);
		}
	});

	it('takes the role from app.profiles, never from token claims, cached for 60 s', async () => {
		const sub = newId();
		const claims = { sub, app_metadata: { role: 'ADMIN' }, user_role: 'ADMIN', aal: 'aal2' } as TestTokenClaims;
		expect((await get('/admin', claims)).body.error.code).toBe('FORBIDDEN');
		await prisma.profiles.update({ where: { id: sub }, data: { role: 'ADMIN' } });
		expect((await get('/admin', claims)).status).toBe(403);
		invalidateProfile(sub);
		expect((await get('/admin', claims)).status).toBe(200);
	});

	it('flips is_anonymous on the first request after an anonymous finder converts (same id)', async () => {
		const sub = await newUser({ is_anonymous: true });
		expect((await get('/auth', { sub, is_anonymous: true })).body).toMatchObject({
			is_anonymous: true,
			email_verified: false,
		});
		expect((await prisma.profiles.findUnique({ where: { id: sub } }))?.is_anonymous).toBe(true);
		await prisma.$executeRaw`
			update auth.users set is_anonymous = false, email = ${`${sub}@test.invalid`}, email_confirmed_at = now()
			where id = ${sub}::uuid`;
		expect((await get('/auth', { sub })).body).toMatchObject({ is_anonymous: false, email_verified: true });
		expect((await prisma.profiles.findUnique({ where: { id: sub } }))?.is_anonymous).toBe(false);
	});

	it('verifies a real ES256 token from local Supabase Auth through the JWKS', async () => {
		const apikey = await new SignJWT({ role: 'anon' })
			.setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
			.setIssuedAt()
			.setExpirationTime('5m')
			.sign(new TextEncoder().encode(config.SUPABASE_JWT_SECRET));
		const signup = await fetch(`${config.SUPABASE_URL}/auth/v1/signup`, {
			method: 'POST',
			headers: { apikey, 'Content-Type': 'application/json' },
			body: '{}',
		});
		const { access_token, user } = (await signup.json()) as { access_token: string; user: { id: string } };
		ids.push(user.id);
		expect(JSON.parse(Buffer.from(access_token.split('.')[0], 'base64url').toString()).alg).not.toBe('HS256');
		const res = await get('/auth', access_token);
		expect(res.status).toBe(200);
		expect(res.body).toMatchObject({ user_id: user.id, is_anonymous: true, role: 'USER', aal: 'aal1' });
	});
});

describe('optionalAuth', () => {
	it('never blocks: no token or a bad token is signed out, a valid token sets the actor', async () => {
		expect((await get('/optional')).body).toBeNull();
		expect((await get('/optional', 'not-a-jwt')).status).toBe(200);
		expect((await get('/optional', 'not-a-jwt')).body).toBeNull();
		const sub = newId();
		expect((await get('/optional', { sub })).body).toMatchObject({ user_id: sub });
	});
});

describe('guards (C1 codes)', () => {
	const actors: Record<string, () => Promise<TestTokenClaims>> = {
		'anonymous finder': async () => ({ sub: await newUser({ is_anonymous: true }), is_anonymous: true }),
		'unverified user': async () => ({ sub: await newUser({ email_verified: false }) }),
		'verified user': async () => ({ sub: await newUser() }),
		'shelter member': async () => ({ sub: staff.SHELTER_MEMBER, aal: 'aal2' }),
		'moderator aal1': async () => ({ sub: staff.MODERATOR }),
		'moderator aal2': async () => ({ sub: staff.MODERATOR, aal: 'aal2' }),
		'admin aal1': async () => ({ sub: staff.ADMIN }),
		'admin aal2': async () => ({ sub: staff.ADMIN, aal: 'aal2' }),
	};
	const OK = 200;
	// Expected per route: 200 or the error code.
	const matrix: Record<string, Record<string, number | string>> = {
		'/real-account': { 'anonymous finder': 'UNAUTHENTICATED', 'unverified user': OK, 'verified user': OK },
		'/verified': {
			'anonymous finder': 'UNAUTHENTICATED',
			'unverified user': 'UNVERIFIED_EMAIL',
			'verified user': OK,
			'admin aal2': OK,
		},
		'/verified-or-anonymous': {
			'anonymous finder': OK,
			'unverified user': 'UNVERIFIED_EMAIL',
			'verified user': OK,
		},
		'/staff': {
			'anonymous finder': 'UNAUTHENTICATED',
			'verified user': 'FORBIDDEN',
			'shelter member': 'FORBIDDEN',
			'moderator aal1': 'AAL2_REQUIRED',
			'moderator aal2': OK,
			'admin aal1': 'AAL2_REQUIRED',
			'admin aal2': OK,
		},
		'/admin': {
			'anonymous finder': 'UNAUTHENTICATED',
			'verified user': 'FORBIDDEN',
			'moderator aal2': 'FORBIDDEN',
			'admin aal1': 'AAL2_REQUIRED',
			'admin aal2': OK,
		},
	};
	const status = { UNAUTHENTICATED: 401, UNVERIFIED_EMAIL: 403, FORBIDDEN: 403, AAL2_REQUIRED: 403 } as const;
	const cases = Object.entries(matrix).flatMap(([path, row]) =>
		Object.entries(row).map(([actor, expected]) => [path, actor, expected] as const)
	);

	it.each(cases)('%s as %s → %s', async (path, actor, expected) => {
		const res = await get(path, await actors[actor]());
		if (expected === OK) expect(res.status).toBe(200);
		else {
			expect(res.status).toBe(status[expected as keyof typeof status]);
			expect(res.body.error.code).toBe(expected);
		}
	});

	it('every guard answers 401 when no actor is set', async () => {
		const bare = testApp((a) => {
			for (const [path, guard] of Object.entries({
				'/a': rejectAnonymous,
				'/b': requireVerified,
				'/c': requireVerifiedOrAnonymous,
				'/d': requireRole('moderator'),
				'/e': requireAal2,
			}))
				a.get(path, guard, (_req, res) => res.json({}));
		});
		for (const path of ['/a', '/b', '/c', '/d', '/e']) expect((await request(bare).get(path)).status).toBe(401);
	});
});
