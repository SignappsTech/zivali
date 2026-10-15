// Supabase access tokens (C3): verified with jose against the project JWKS (asymmetric keys), audience
// `authenticated`, issuer `${SUPABASE_URL}/auth/v1`, exp checked. The HS256 shared secret is accepted only when
// APP_ENV=local. req.user = { user_id, role, is_anonymous, aal, email_verified, locale }; role and locale come from
// app.profiles (cached 60 s), never from token claims. Tokens are never logged.
import type { Request, RequestHandler } from 'express';
import { createRemoteJWKSet, errors, jwtVerify, type JWTVerifyGetKey } from 'jose';
import { z } from 'zod';

import { UsersDomain, type AuthProfile } from '../domains/users/index.ts';
import { config, type Config } from '../lib/config.ts';
import type { Actor } from '../lib/ctx.ts';
import { AppError } from '../lib/errors.ts';

const Claims = z.object({
	sub: z.uuid(),
	is_anonymous: z.boolean().default(false),
	// Lenient on the rest: an odd value must never lock a user out, nor grant more (unknown aal = aal1).
	aal: z.enum(['aal1', 'aal2']).catch('aal1'),
	user_metadata: z.object({ email_verified: z.unknown(), locale: z.unknown() }).partial().nullish().catch(null),
});
export type Claims = z.infer<typeof Claims>;

const unauthenticated = () => new AppError('UNAUTHENTICATED', 'Invalid or expired token');

export function createTokenVerifier(cfg: Pick<Config, 'APP_ENV' | 'SUPABASE_URL' | 'SUPABASE_JWT_SECRET'>) {
	const issuer = `${cfg.SUPABASE_URL.replace(/\/+$/, '')}/auth/v1`;
	const jwks = createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`));
	const secret =
		cfg.APP_ENV === 'local' && cfg.SUPABASE_JWT_SECRET
			? new TextEncoder().encode(cfg.SUPABASE_JWT_SECRET)
			: undefined;
	const getKey: JWTVerifyGetKey = (header, token) =>
		secret && header.alg === 'HS256' ? secret : jwks(header, token);
	const algorithms = secret ? ['ES256', 'RS256', 'HS256'] : ['ES256', 'RS256'];

	return async function verifyToken(token: string): Promise<Claims> {
		try {
			const { payload } = await jwtVerify(token, getKey, { audience: 'authenticated', issuer, algorithms });
			const claims = Claims.safeParse(payload);
			if (!claims.success) throw unauthenticated();
			return claims.data;
		} catch (err) {
			// A bad token is the caller's problem; an unreachable or broken JWKS endpoint is ours (500, logged).
			if (err instanceof errors.JWKSTimeout || err instanceof errors.JWKSInvalid) throw err;
			if (err instanceof errors.JOSEError) throw unauthenticated();
			throw err;
		}
	};
}

const verifyToken = createTokenVerifier(config);

const PROFILE_TTL_MS = 60_000;
const PROFILE_CACHE_MAX = 10_000;
const profiles = new Map<string, { profile: AuthProfile; expires: number }>();

/** Drop a cached profile, e.g. after a role change, so the next request reads app.profiles again. */
export function invalidateProfile(userId?: string): void {
	if (userId) profiles.delete(userId);
	else profiles.clear();
}

async function loadProfile(claims: Claims): Promise<AuthProfile> {
	const hit = profiles.get(claims.sub);
	// A flipped is_anonymous (converted finder) must reach ensureProfile at once, so it skips the cache.
	if (hit && hit.expires > Date.now() && hit.profile.is_anonymous === claims.is_anonymous) return hit.profile;
	const profile = await UsersDomain.ensureProfile({
		user_id: claims.sub,
		is_anonymous: claims.is_anonymous,
		locale: claims.user_metadata?.locale,
	});
	if (profiles.size >= PROFILE_CACHE_MAX) profiles.clear();
	profiles.set(claims.sub, { profile, expires: Date.now() + PROFILE_TTL_MS });
	return profile;
}

function bearer(req: Request): string | undefined {
	const [scheme, token] = (req.get('authorization') ?? '').split(' ');
	return scheme?.toLowerCase() === 'bearer' && token ? token : undefined;
}

async function authenticate(token: string): Promise<Actor> {
	const claims = await verifyToken(token);
	const profile = await loadProfile(claims);
	return {
		user_id: claims.sub,
		role: profile.role,
		is_anonymous: claims.is_anonymous,
		aal: claims.aal,
		// Supabase sets user_metadata.email_verified once the address is confirmed (email) or the provider says so
		// (some providers send the string "true").
		email_verified: !claims.is_anonymous && String(claims.user_metadata?.email_verified) === 'true',
		locale: profile.locale === 'en' ? 'en' : 'sl',
	};
}

/** Required auth: 401 UNAUTHENTICATED without a valid token. Anonymous finders pass; guards decide the rest. */
export const authMiddleware: RequestHandler = async (req, _res, next) => {
	const token = bearer(req);
	if (!token) throw new AppError('UNAUTHENTICATED', 'Sign in required');
	req.user = await authenticate(token);
	next();
};

/** Optional auth: a missing or invalid token means signed out; never answers 401. */
export const optionalAuth: RequestHandler = async (req, _res, next) => {
	const token = bearer(req);
	if (token) {
		try {
			req.user = await authenticate(token);
		} catch (err) {
			if (!(err instanceof AppError)) throw err;
		}
	}
	next();
};

export default { authMiddleware, optionalAuth, invalidateProfile, createTokenVerifier };
