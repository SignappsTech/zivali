// Locally signed Supabase-style access tokens for tests (HS256 with the local SUPABASE_JWT_SECRET, ADR-020): same
// audience, issuer and claims as the local stack, so authMiddleware accepts them when APP_ENV=local. email_verified is
// not a claim: it comes from auth.users, so tests that need it create a real row with createAuthUser.
import { randomUUID } from 'node:crypto';

import { SignJWT } from 'jose';

import { config } from '../../lib/config.ts';
import { prisma } from '../../prisma/prisma.ts';

/** A real auth.users row in the local Supabase (confirmed email unless told otherwise); returns its id. */
export async function createAuthUser({ email_verified = true, is_anonymous = false } = {}): Promise<string> {
	const id = randomUUID();
	const email = is_anonymous ? null : `${id}@test.invalid`;
	const confirmed = email_verified && !is_anonymous ? new Date() : null;
	await prisma.$executeRaw`
		insert into auth.users (id, aud, role, email, email_confirmed_at, is_anonymous, created_at, updated_at)
		values (${id}::uuid, 'authenticated', 'authenticated', ${email}, ${confirmed}, ${is_anonymous}, now(), now())`;
	return id;
}

export async function deleteAuthUsers(ids: string[]): Promise<void> {
	await prisma.$executeRaw`delete from auth.users where id = any(${ids}::uuid[])`;
	await prisma.profiles.deleteMany({ where: { id: { in: ids } } });
}

export type TestTokenClaims = {
	// 'anon' gives the equivalent of the anon key (PostgREST exposure tests).
	role?: 'anon' | 'authenticated';
	sub?: string;
	email?: string;
	is_anonymous?: boolean;
	aal?: 'aal1' | 'aal2';
	locale?: 'sl' | 'en';
	expiresIn?: string | number;
	audience?: string;
	issuer?: string;
	secret?: string;
};

export async function signTestToken(claims: TestTokenClaims = {}): Promise<string> {
	if (!config.SUPABASE_JWT_SECRET) throw new Error('SUPABASE_JWT_SECRET is not set (apps/api/.env.local)');
	const {
		sub = randomUUID(),
		expiresIn = '1h',
		is_anonymous = false,
		aal = 'aal1',
		locale,
		audience = 'authenticated',
		issuer = `${config.SUPABASE_URL}/auth/v1`,
		secret = config.SUPABASE_JWT_SECRET,
		...rest
	} = claims;
	const user_metadata = { ...(locale && { locale }) };
	return new SignJWT({ role: 'authenticated', is_anonymous, aal, session_id: randomUUID(), user_metadata, ...rest })
		.setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
		.setSubject(sub)
		.setAudience(audience)
		.setIssuer(issuer)
		.setIssuedAt()
		.setExpirationTime(expiresIn)
		.sign(new TextEncoder().encode(secret));
}
