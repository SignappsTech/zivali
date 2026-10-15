// Route guards after authMiddleware (C1). Anonymous finders count as signed out (UNAUTHENTICATED) everywhere except
// requireVerifiedOrAnonymous. Ownership ("manager of this report") is checked in domains, not here.
import type { Request, RequestHandler } from 'express';

import type { Actor } from '../lib/ctx.ts';
import { AppError } from '../lib/errors.ts';

function signedIn(req: Request): Actor {
	if (!req.user || req.user.is_anonymous) throw new AppError('UNAUTHENTICATED', 'Sign in required');
	return req.user;
}

/** Routes that need a real account (payments, alerts). */
export const rejectAnonymous: RequestHandler = (req, _res, next) => {
	signedIn(req);
	next();
};

/** A real account with a confirmed email. */
export const requireVerified: RequestHandler = (req, _res, next) => {
	if (!signedIn(req).email_verified) throw new AppError('UNVERIFIED_EMAIL', 'Confirm your email address first');
	next();
};

/** Where the contract lets anonymous finders in: they pass, real accounts still need a confirmed email. */
export const requireVerifiedOrAnonymous: RequestHandler = (req, _res, next) => {
	if (!req.user) throw new AppError('UNAUTHENTICATED', 'Sign in required');
	if (!req.user.is_anonymous && !req.user.email_verified)
		throw new AppError('UNVERIFIED_EMAIL', 'Confirm your email address first');
	next();
};

const ALLOWED_ROLES = { moderator: ['MODERATOR', 'ADMIN'], admin: ['ADMIN'] } as const;

/** Role from app.profiles (loaded by authMiddleware), never from token claims. Pair staff routes with requireAal2. */
export function requireRole(role: keyof typeof ALLOWED_ROLES): RequestHandler {
	const allowed: readonly string[] = ALLOWED_ROLES[role];
	return (req, _res, next) => {
		if (!allowed.includes(signedIn(req).role)) throw new AppError('FORBIDDEN', 'Not allowed');
		next();
	};
}

/** Staff routes: the session must have passed TOTP (aal2). */
export const requireAal2: RequestHandler = (req, _res, next) => {
	if (signedIn(req).aal !== 'aal2') throw new AppError('AAL2_REQUIRED', 'Two-factor verification required');
	next();
};

export default { rejectAnonymous, requireVerified, requireVerifiedOrAnonymous, requireRole, requireAal2 };
