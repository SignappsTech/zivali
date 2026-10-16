import type { AuthError } from '@supabase/supabase-js';
import type { Locale } from 'next-intl';
import { z } from 'zod';

import { authError } from '@zivali/api/auth';
import { ApiError } from '@zivali/api/client';
import { getPathname } from '@/i18n/navigation';
import { env } from '@/lib/env';
import { createClient } from '@/lib/supabase/client';

// Web auth (P16, C3) in the browser: email and password, Google over Supabase OAuth (PKCE: the verifier waits in a
// cookie for the server-side exchange in app/[locale]/auth/callback), and the links in the auth emails. Errors are
// ApiError with C1 codes (`authError` from @zivali/api/auth, `details.auth_code` keeps Supabase's code).

/** The sign-up policy (supabase/config.toml minimum_password_length), shared with the API's convert-password. */
export { MIN_PASSWORD } from '@zivali/validation/me.schema';
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

/**
 * The finder's anonymous session (C7), unless this browser already has a session (anonymous or an account, which
 * the manage claim binds the same way). The captcha token is only asked for when a sign-in is needed.
 */
export async function ensureSession(getCaptchaToken: () => Promise<string | undefined>) {
	if ((await auth().getSession()).data.session) return;
	await check(auth().signInAnonymously({ options: { captchaToken: await getCaptchaToken() } }));
}

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

/** Conversion only ever touches the anonymous finder session (C7), never an account's address or password. */
async function assertAnonymous() {
	if (!(await auth().getSession()).data.session?.user.is_anonymous)
		throw new ApiError('UNAUTHENTICATED', 'UNAUTHENTICATED');
}

/**
 * C7 §6: the finder's anonymous session becomes the account in place, so the user id, report_managers and the manage
 * links stay. updateUser sets the name and the address (GoTrue mails the `email_change` link with PKCE, back to the
 * signup callback), then the API sets the password: GoTrue's own password update asks a session over 24 h old to
 * reauthenticate (secure_password_change), which an anonymous user cannot. The user stops being anonymous once the
 * link is opened. Refused on any other session.
 */
export async function convertAnonymous({
	name,
	email,
	password,
	locale,
	next,
}: {
	name: string;
	email: string;
	password: string;
	locale: Locale;
	next?: string;
}) {
	await assertAnonymous();
	const redirect = { emailRedirectTo: callbackUrl('signup', locale, next) };
	await check(auth().updateUser({ email, data: { locale, display_name: name } }, redirect));
	// Loaded here: the sign-up page has no store, so RTK stays out of its bundle.
	const [{ convertAnonymousPassword }, { makeApiClient }] = await Promise.all([
		import('@zivali/api/me'),
		import('@/lib/store'),
	]);
	await convertAnonymousPassword(makeApiClient(locale), { password });
}

export const resendConfirmation = (email: string, locale: Locale, captchaToken?: string) =>
	check(
		auth().resend({
			type: 'signup',
			email,
			options: { emailRedirectTo: callbackUrl('signup', locale), captchaToken },
		})
	);

/**
 * "Pošlji znova" after convertAnonymous: the address again. resend({ type: 'email_change' }) finds no one (an
 * anonymous user's email is empty) and carries no PKCE; a repeat within 60 s is RATE_LIMITED.
 */
export async function resendConversion(email: string, locale: Locale, next?: string) {
	await assertAnonymous();
	await check(auth().updateUser({ email }, { emailRedirectTo: callbackUrl('signup', locale, next) }));
}

/** The recovery email is localised from the user's metadata locale; the link opens the new-password form. */
export const requestPasswordReset = (email: string, locale: Locale, captchaToken?: string) =>
	check(auth().resetPasswordForEmail(email, { redirectTo: callbackUrl('recovery', locale), captchaToken }));

/**
 * A new password also signs out every other session (a stolen one included): GoTrue's password update revokes them
 * itself (checked on local Supabase: another session's refresh fails, this one's works), so no signOut('others') here.
 */
export const updatePassword = (password: string) => check(auth().updateUser({ password }));

/** Leaves the page for the provider; Supabase brings the browser back to the callback with a PKCE code. */
export const signInWithProvider = (provider: 'google' | 'apple', locale: Locale, next?: string) =>
	check(auth().signInWithOAuth({ provider, options: { redirectTo: callbackUrl('oauth', locale, next) } }));
