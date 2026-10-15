// Locally signed Supabase-style access tokens for tests (HS256 with the local SUPABASE_JWT_SECRET, ADR-020).
import { randomUUID } from 'node:crypto';

import { SignJWT } from 'jose';

import { config } from '../../lib/config.ts';

export type TestTokenClaims = {
	sub?: string;
	email?: string;
	is_anonymous?: boolean;
	aal?: 'aal1' | 'aal2';
	expiresIn?: string;
};

export async function signTestToken(claims: TestTokenClaims = {}): Promise<string> {
	if (!config.SUPABASE_JWT_SECRET) throw new Error('SUPABASE_JWT_SECRET is not set (apps/api/.env.local)');
	const { sub = randomUUID(), expiresIn = '1h', is_anonymous = false, aal = 'aal1', ...rest } = claims;
	return new SignJWT({ role: 'authenticated', is_anonymous, aal, session_id: randomUUID(), ...rest })
		.setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
		.setSubject(sub)
		.setAudience('authenticated')
		.setIssuedAt()
		.setExpirationTime(expiresIn)
		.sign(new TextEncoder().encode(config.SUPABASE_JWT_SECRET));
}
