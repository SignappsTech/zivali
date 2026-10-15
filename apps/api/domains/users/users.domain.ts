// Profiles (C3). Knows nothing about Express or tokens: the auth middleware passes the verified claims in.
import { LOCALES, type Locale, type UpdateMeInput } from '@zivali/types';
import { coarsenPoint } from '@zivali/validation/geo';

import type { Ctx } from '../../lib/ctx.ts';
import { AppError } from '../../lib/errors.ts';
import { prisma } from '../../prisma/prisma.ts';
import UsersDao, { type AuthProfile, type MeRow } from './users.dao.ts';

export type { AuthProfile, MeRow };

export type EnsureProfileInput = { user_id: string; is_anonymous: boolean; locale?: unknown };

const toLocale = (value: unknown): Locale => (LOCALES.includes(value as Locale) ? (value as Locale) : 'sl');

/**
 * The profile row is created on the first authenticated request (locale from user_metadata.locale). A converted
 * anonymous user keeps the same id; the first request with a non-anonymous token flips is_anonymous (C3, C7).
 */
export async function ensureProfile(input: EnsureProfileInput): Promise<AuthProfile> {
	const existing = await UsersDao.getAuthProfile(input.user_id);
	if (existing && existing.is_anonymous === input.is_anonymous) return existing;
	return UsersDao.upsertAuthProfile({
		id: input.user_id,
		locale: toLocale(input.locale),
		is_anonymous: input.is_anonymous,
	});
}

function actorId(ctx: Ctx): string {
	if (!ctx.actor) throw new AppError('UNAUTHENTICATED', 'Sign in required');
	return ctx.actor.user_id;
}

/** The caller's own profile (authMiddleware has run ensureProfile, so the row exists). */
export async function getMe(_input: void, ctx: Ctx): Promise<MeRow> {
	const row = await UsersDao.getMe(actorId(ctx), ctx.tx);
	if (!row) throw new AppError('NOT_FOUND', 'Profile not found');
	return row;
}

/**
 * Own profile only: the id comes from ctx, and the input has no role, email or is_anonymous (the schema strips them).
 * home is coarsened once at write (C6); the stored point sent back unchanged is kept, never coarsened again.
 */
export async function updateMe(input: UpdateMeInput, ctx: Ctx): Promise<MeRow> {
	const id = actorId(ctx);
	const { home, ...fields } = input;
	return prisma.$transaction(async (tx) => {
		const current = await UsersDao.getMe(id, tx);
		if (!current) throw new AppError('NOT_FOUND', 'Profile not found');
		if (home !== undefined) {
			const unchanged = home && home.lat === current.home_lat && home.lng === current.home_lng;
			if (!unchanged) await UsersDao.setHomePoint(id, home && coarsenPoint(home), tx);
		}
		if (Object.keys(fields).length) await UsersDao.updateProfile(id, fields, tx);
		return (await UsersDao.getMe(id, tx))!;
	});
}

export default { ensureProfile, getMe, updateMe };
