// Profiles (C3). Knows nothing about Express or tokens: the auth middleware passes the verified claims in.
import { LOCALES, type ConvertPasswordInput, type Locale, type UpdateMeInput } from '@zivali/types';
import { coarsenPoint } from '@zivali/validation/geo';

import { config } from '../../lib/config.ts';
import type { Ctx } from '../../lib/ctx.ts';
import { AppError } from '../../lib/errors.ts';
import { logger } from '../../lib/logger.ts';
import { prisma, type Prisma } from '../../prisma/prisma.ts';
import { AuditDao } from '../platform/index.ts';
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
	const run = async (tx: Prisma.TransactionClient) => {
		const current = await UsersDao.getMe(id, tx);
		if (!current) throw new AppError('NOT_FOUND', 'Profile not found');
		if (home !== undefined) {
			const unchanged = home && home.lat === current.home_lat && home.lng === current.home_lng;
			if (!unchanged) await UsersDao.setHomePoint(id, home && coarsenPoint(home), tx);
		}
		if (Object.keys(fields).length) await UsersDao.updateProfile(id, fields, tx);
		return (await UsersDao.getMe(id, tx))!;
	};
	const row = await (ctx.tx ? run(ctx.tx) : prisma.$transaction(run));
	if (fields.locale) await syncAuthLocale(id, fields.locale);
	return row;
}

/** One Auth user over the Admin API, with the server-only secret key (never sent to clients or logged). */
const authAdmin = (id: string, key: string, init: RequestInit = {}) =>
	fetch(`${config.SUPABASE_URL}/auth/v1/admin/users/${id}`, {
		...init,
		headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
	});

/** Auth emails read user_metadata.locale: keep it in step with the profile (best effort, the profile is the truth). */
async function syncAuthLocale(id: string, locale: Locale): Promise<void> {
	const key = config.SUPABASE_SECRET_KEY;
	if (!key) return;
	try {
		const res = await authAdmin(id, key, { method: 'PUT', body: JSON.stringify({ user_metadata: { locale } }) });
		if (!res.ok) logger.warn({ status: res.status }, 'auth locale sync failed');
	} catch {
		logger.warn('auth locale sync failed');
	}
}

const NOT_ANONYMOUS = 'Only an anonymous session can be converted';

/**
 * C7 §6: the password of an anonymous finder whose session is becoming the account. The client has just set the
 * address (updateUser({ email }), which mails the email_change link); GoTrue's own password update asks for a
 * reauthentication once the session is 24 h old (secure_password_change), which an anonymous user cannot do, so the
 * password is set here with the Admin API. Only while the token and Auth both say anonymous and an address is pending,
 * so a real account's password never changes here.
 */
export async function convertPassword(input: ConvertPasswordInput, ctx: Ctx): Promise<void> {
	const id = actorId(ctx);
	if (!ctx.actor!.is_anonymous) throw new AppError('FORBIDDEN', NOT_ANONYMOUS);
	const key = config.SUPABASE_SECRET_KEY;
	if (!key) throw new AppError('SERVICE_UNAVAILABLE', 'Auth Admin API is not configured');
	const found = await authAdmin(id, key);
	if (found.status === 404) throw new AppError('UNAUTHENTICATED', 'Sign in required');
	if (!found.ok) throw new Error(`Auth Admin API get user answered ${found.status}`);
	const user = (await found.json()) as { is_anonymous?: boolean; new_email?: string | null };
	if (!user.is_anonymous) throw new AppError('FORBIDDEN', NOT_ANONYMOUS);
	if (!user.new_email) throw new AppError('FORBIDDEN', 'Set the email address first');
	const updated = await authAdmin(id, key, { method: 'PUT', body: JSON.stringify({ password: input.password }) });
	// GoTrue's own policy (weak_password, length): said on the field, with its code as the client mapping keeps it.
	if (updated.status === 400 || updated.status === 422) {
		const body = (await updated.json().catch(() => ({}))) as { error_code?: string };
		throw new AppError('VALIDATION', 'Password refused', { auth_code: body.error_code }, [
			{ path: 'password', message: 'Password refused' },
		]);
	}
	if (!updated.ok) throw new Error(`Auth Admin API update user answered ${updated.status}`);
	// No secret and no address in the trail: who, and that it happened.
	await AuditDao.write(ctx.tx, {
		actor_id: id,
		action: 'user.password.convert',
		target_type: 'profile',
		target_id: id,
	});
}

export default { ensureProfile, getMe, updateMe, convertPassword };
