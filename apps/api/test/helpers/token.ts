// Locally signed Supabase-style access tokens for tests (HS256 with the local SUPABASE_JWT_SECRET, ADR-020): same
// audience, issuer and claims as the local stack, so authMiddleware accepts them when APP_ENV=local.
import { randomUUID } from 'node:crypto';

import { SignJWT } from 'jose';

import { config } from '../../lib/config.ts';

export type TestTokenClaims = {
	// 'anon' gives the equivalent of the anon key (PostgREST exposure tests).
	role?: 'anon' | 'authenticated';
	sub?: string;
	email?: string;
	is_anonymous?: boolean;
	aal?: 'aal1' | 'aal2';
	/** Default: confirmed email (true) unless anonymous. */
	email_verified?: boolean;
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
		email_verified = !is_anonymous,
		locale,
		audience = 'authenticated',
		issuer = `${config.SUPABASE_URL}/auth/v1`,
		secret = config.SUPABASE_JWT_SECRET,
		...rest
	} = claims;
	const user_metadata = { ...(!is_anonymous && { email_verified }), ...(locale && { locale }) };
	return new SignJWT({ role: 'authenticated', is_anonymous, aal, session_id: randomUUID(), user_metadata, ...rest })
		.setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
		.setSubject(sub)
		.setAudience(audience)
		.setIssuer(issuer)
		.setIssuedAt()
		.setExpirationTime(expiresIn)
		.sign(new TextEncoder().encode(secret));
}
