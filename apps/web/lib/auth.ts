import type { AuthError } from '@supabase/supabase-js';
import type { Locale } from 'next-intl';
import { z } from 'zod';

import { authError } from '@zivali/api/auth';
import { getPathname } from '@/i18n/navigation';
import { env } from '@/lib/env';
import { createClient } from '@/lib/supabase/client';

// Web auth (P16, C3) in the browser: email and password, Google over Supabase OAuth (PKCE: the verifier waits in a
// cookie for the server-side exchange in app/[locale]/auth/callback), and the links in the auth emails. Errors are
// ApiError with C1 codes (`authError` from @zivali/api/auth, `details.auth_code` keeps Supabase's code).

/** The Supabase minimum (supabase/config.toml minimum_password_length). */
export const MIN_PASSWORD = 8;
export const validEmail = (value: string) => z.email().safeParse(value).success;

/** Provider buttons show only for providers enabled in Supabase Auth (env flags); Apple is off until its account exists. */
export const providers = {
	google: env.NEXT_PUBLIC_GOOGLE_SIGN_IN === 'true',
	apple: env.NEXT_PUBLIC_APPLE_SIGN_IN === 'true',
};

export type CallbackType = 'signup' | 'recovery' | 'oauth';

/** Where Supabase sends the browser back to (allow-listed `<APP_URL>/**`, C3); `next` is the page to return to. */
export function callbackUrl(type: CallbackType, locale: Locale, next?: string) {
	const query = new URLSearchParams({ type, ...(next && { next }) });
	return `${window.location.origin}${getPathname({ locale, href: '/auth/callback' })}?${query}`;
}

async function check<R extends { error: AuthError | null }>(request: Promise<R>): Promise<R> {
	const result = await request;
	if (result.error) throw authError(result.error);
	return result;
}

const auth = () => createClient().auth;

export const signIn = (email: string, password: string, captchaToken?: string) =>
	check(auth().signInWithPassword({ email, password, options: { captchaToken } }));

/** The name waits in user_metadata until the first session saves it to the profile (components/auth/session-sync.tsx). */
export const signUp = ({
	name,
	email,
	password,
	locale,
	next,
	captchaToken,
}: {
	name: string;
	email: string;
	password: string;
	locale: Locale;
	next?: string;
	captchaToken?: string;
}) =>
	check(
		auth().signUp({
			email,
			password,
			options: {
				data: { locale, display_name: name },
				captchaToken,
				emailRedirectTo: callbackUrl('signup', locale, next),
			},
		})
	);

export const resendConfirmation = (email: string, locale: Locale, captchaToken?: string) =>
	check(
		auth().resend({
			type: 'signup',
			email,
			options: { emailRedirectTo: callbackUrl('signup', locale), captchaToken },
		})
	);

/** The recovery email is localised from the user's metadata locale; the link opens the new-password form. */
export const requestPasswordReset = (email: string, locale: Locale, captchaToken?: string) =>
	check(auth().resetPasswordForEmail(email, { redirectTo: callbackUrl('recovery', locale), captchaToken }));

export const updatePassword = (password: string) => check(auth().updateUser({ password }));

/** Leaves the page for the provider; Supabase brings the browser back to the callback with a PKCE code. */
export const signInWithProvider = (provider: 'google' | 'apple', locale: Locale, next?: string) =>
	check(auth().signInWithOAuth({ provider, options: { redirectTo: callbackUrl('oauth', locale, next) } }));
