// Profiles (C3). Knows nothing about Express or tokens: the auth middleware passes the verified claims in.
import { LOCALES, type Locale } from '@zivali/types';

import UsersDao, { type AuthProfile } from './users.dao.ts';

export type { AuthProfile };

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

export default { ensureProfile };
