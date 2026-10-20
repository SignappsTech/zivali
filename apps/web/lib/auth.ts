import type { AuthError } from '@supabase/supabase-js';
import type { Locale } from 'next-intl';

import { setUserRole } from '@zivali/analytics';
import { authError } from '@zivali/api/auth';
import { ApiError } from '@zivali/api/client';
import { getPathname } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/client';

// Web auth (P16, C3) in the browser: email and password, Google over Supabase OAuth (PKCE: the verifier waits in a
// cookie for the server-side exchange in app/[locale]/auth/callback), and the links in the auth emails. Errors are
// ApiError with C1 codes (`authError` from @zivali/api/auth, `details.auth_code` keeps Supabase's code). The public
// auth forms load it on demand (loadAuth); their checks and provider flags are in lib/auth-light.ts (TASK-9.9).

export type CallbackType = 'signup' | 'recovery' | 'oauth';

/**
 * Where Supabase sends the browser back to (allow-listed `<APP_URL>/**`, C3); `next` is the page to return to,
 * `provider` the one a return comes from (its C12 sign_up or login method; the callback marks it).
 */
export function callbackUrl(type: CallbackType, locale: Locale, next?: string, provider?: 'google' | 'apple') {
	const query = new URLSearchParams({ type, ...(provider && { provider }), ...(next && { next }) });
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
 * the manage claim binds the same way). The captcha token is only asked for when a sign-in is needed. An anonymous
 * session is the analytics `finder` (C12 user_role; an account's role comes from SessionSync).
 */
export async function ensureSession(getCaptchaToken: () => Promise<string | undefined>) {
	const current = (await auth().getSession()).data.session;
	if (!current) await check(auth().signInAnonymously({ options: { captchaToken: await getCaptchaToken() } }));
	if (!current || current.user.is_anonymous) setUserRole('finder');
}

/**
 * The name waits in user_metadata until the first session saves it to the profile (components/auth/session-sync.tsx).
 * An address with a confirmed account gets a 200 with no identities and no email (Supabase's enumeration protection):
 * thrown as CONFLICT, as `user_already_exists` is, so the form offers sign-in instead of waiting for a mail that never
 * comes (owner, TASK-114.1: the clearer answer over hiding which addresses are registered). An unconfirmed address
 * keeps its identity in the answer and gets the confirmation again.
 */
export async function signUp({
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
}) {
	const result = await check(
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
	if (result.data.user?.identities?.length === 0)
		throw new ApiError('CONFLICT', 'CONFLICT', { details: { auth_code: 'user_already_exists' } });
	return result;
}

/** Conversion only ever touches the anonymous finder session (C7), never an account's address or password. */
async function assertAnonymous() {
	if (!(await auth().getSession()).data.session?.user.is_anonymous)
		throw new ApiError('UNAUTHENTICATED', 'UNAUTHENTICATED');
}

/**
 * The conversion link's callback (C7 §6). `setPassword`: the password did not go with the address, so after the link
 * the new-password form sets it (/reset-password?set=1, then on to `next`); the callback goes straight there.
 */
const conversionCallback = (locale: Locale, next: string | undefined, setPassword: boolean) =>
	callbackUrl(
		'signup',
		locale,
		setPassword
			? getPathname({ locale, href: { pathname: '/reset-password', query: { set: '1', ...(next && { next }) } } })
			: next
	);

/**
 * C7 §6: the finder's anonymous session becomes the account in place, so the user id, report_managers and the manage
 * links stay. One updateUser sets the password, the name and the address: GoTrue applies the password first, then
 * mails the `email_change` link (PKCE, back to the signup callback) in the same transaction, so the link survives
 * (checked on local Supabase). The user stops being anonymous once the link is opened. A session over 24 h old gets
 * `reauthentication_needed` (secure_password_change; an anonymous user has no address to reauthenticate with): then
 * the address goes alone, and the link's fresh session sets the password (`setPassword`). Any other failure is
 * thrown as is, never retried. Refused on any other session.
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
}): Promise<{ setPassword: boolean }> {
	await assertAnonymous();
	const data = { locale, display_name: name };
	try {
		await check(
			auth().updateUser({ email, password, data }, { emailRedirectTo: conversionCallback(locale, next, false) })
		);
		return { setPassword: false };
	} catch (failure) {
		if (!(failure instanceof ApiError && failure.details?.auth_code === 'reauthentication_needed')) throw failure;
	}
	await check(auth().updateUser({ email, data }, { emailRedirectTo: conversionCallback(locale, next, true) }));
	return { setPassword: true };
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
 * "Pošlji znova" after convertAnonymous: the address again, to the same callback. resend({ type: 'email_change' })
 * finds no one (an anonymous user's email is empty) and carries no PKCE; a repeat within 60 s is RATE_LIMITED.
 */
export async function resendConversion(email: string, locale: Locale, next?: string, setPassword = false) {
	await assertAnonymous();
	await check(auth().updateUser({ email }, { emailRedirectTo: conversionCallback(locale, next, setPassword) }));
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
	check(auth().signInWithOAuth({ provider, options: { redirectTo: callbackUrl('oauth', locale, next, provider) } }));
