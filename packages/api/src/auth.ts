// C3 auth: Supabase Auth helpers (session handling stays in supabase-js) and the session hooks, which combine the
// Supabase session with GET /v1/me. Each app calls configureAuth(supabase, store) once at start-up.
import { useSyncExternalStore } from 'react';
import { skipToken } from '@reduxjs/toolkit/query';
import type { AuthError, Session, SupabaseClient } from '@supabase/supabase-js';

import type { Aal, Locale, Me, UserRole } from '@zivali/types';

import { ApiError, type ErrorCode } from './client.ts';
import { meApi, useGetMeQuery } from './me.ts';
import { api, type ApiStore } from './rtk.ts';

let supabase: SupabaseClient | undefined;
/** `undefined` until Supabase reports the initial session. */
let session: Session | null | undefined;
const listeners = new Set<() => void>();

/**
 * Follows the Supabase session. A different user (sign-in as someone else, sign-out) clears the whole API cache, so
 * no private query of the previous user survives; MFA verification, user updates and sign-in refetch GET /v1/me.
 */
export function configureAuth(client: SupabaseClient, store: Pick<ApiStore, 'dispatch'>): () => void {
	supabase = client;
	const { data } = client.auth.onAuthStateChange((event, next) => {
		if (session !== undefined && session?.user.id !== next?.user.id) store.dispatch(api.util.resetApiState());
		else if (event === 'MFA_CHALLENGE_VERIFIED' || event === 'USER_UPDATED' || event === 'SIGNED_IN')
			store.dispatch(meApi.util.invalidateTags(['Me']));
		session = next;
		for (const listener of listeners) listener();
	});
	return () => data.subscription.unsubscribe();
}

const auth = () => {
	if (!supabase) throw new Error('configureAuth() has not been called');
	return supabase.auth;
};

// Supabase Auth error codes → C1 codes, so the UI maps every error with t('errors.<code>'); the original code stays in
// `details.auth_code` (e.g. invalid_credentials vs. session_not_found, both UNAUTHENTICATED).
const AUTH_CODES: Record<string, ErrorCode> = {
	invalid_credentials: 'UNAUTHENTICATED',
	session_not_found: 'UNAUTHENTICATED',
	refresh_token_not_found: 'UNAUTHENTICATED',
	email_not_confirmed: 'UNVERIFIED_EMAIL',
	captcha_failed: 'CAPTCHA_FAILED',
	over_request_rate_limit: 'RATE_LIMITED',
	over_email_send_rate_limit: 'RATE_LIMITED',
	user_already_exists: 'CONFLICT',
	email_exists: 'CONFLICT',
	weak_password: 'VALIDATION',
	validation_failed: 'VALIDATION',
	email_address_invalid: 'VALIDATION',
	mfa_verification_failed: 'VALIDATION',
	// secure_password_change: a session over 24 h old must reauthenticate before a password update (sign in again).
	reauthentication_needed: 'UNAUTHENTICATED',
};

export function authError(error: AuthError): ApiError {
	const code =
		(error.code && AUTH_CODES[error.code]) ||
		(error.name === 'AuthRetryableFetchError' ? 'NETWORK' : error.status === 429 ? 'RATE_LIMITED' : 'INTERNAL');
	// Fixed message, no `cause`: Supabase's message may contain the user's email.
	return new ApiError(code, code, { status: error.status, details: { auth_code: error.code } });
}

/** supabase-js results are `{ data, error: null } | { data: null…, error }`: returns the success `data` or throws. */
type Success<R> = Extract<R, { error: null }> extends { data: infer D } ? D : never;
async function run<R extends { data: unknown; error: AuthError | null }>(result: Promise<R>): Promise<Success<R>> {
	const { data, error } = await result;
	if (error) throw authError(error);
	return data as Success<R>;
}

type Redirect = { redirectTo?: string };

/** `locale` goes to user_metadata: the profile (ensureProfile) and the localised emails read it. */
export const signUpWithEmail = (
	email: string,
	password: string,
	{ locale, captchaToken, redirectTo }: { locale: Locale; captchaToken?: string } & Redirect
) => run(auth().signUp({ email, password, options: { data: { locale }, captchaToken, emailRedirectTo: redirectTo } }));

export const signInWithEmail = (email: string, password: string) => run(auth().signInWithPassword({ email, password }));

/** Web: OAuth redirect. Mobile: pass the native sign-in's `idToken` (and `nonce` for Apple). */
type ProviderSignIn = (Redirect & { skipBrowserRedirect?: boolean }) | { idToken: string; nonce?: string };
const signInWith = (provider: 'google' | 'apple', options: ProviderSignIn = {}) =>
	'idToken' in options
		? run(auth().signInWithIdToken({ provider, token: options.idToken, nonce: options.nonce }))
		: run(auth().signInWithOAuth({ provider, options }));
export const signInWithGoogle = (options?: ProviderSignIn) => signInWith('google', options);
export const signInWithApple = (options?: ProviderSignIn) => signInWith('apple', options);

/** Anonymous finder session (C7); the captcha is required in the cloud. */
export const signInAnonymously = (captchaToken?: string) =>
	run(auth().signInAnonymously({ options: { captchaToken } }));

/** The recovery email is localised from the user's metadata locale. */
export const requestPasswordReset = (email: string, options: Redirect & { captchaToken?: string } = {}) =>
	run(auth().resetPasswordForEmail(email, options));

/**
 * `cleanup` runs first: the app's push-token delete (C10) and, on mobile, wipeLocalData() (C17). The session ends
 * even if it fails; its error is rethrown afterwards. The API cache is cleared by configureAuth.
 */
export async function signOut(cleanup?: () => Promise<unknown>): Promise<void> {
	const failed = await cleanup?.().then(
		() => undefined,
		(error: unknown) => ({ error })
	);
	const { error } = await auth().signOut({ scope: 'local' });
	if (error) throw authError(error);
	if (failed) throw failed.error;
}

export const mfa = {
	enroll: () => run(auth().mfa.enroll({ factorType: 'totp' })),
	challengeAndVerify: (factorId: string, code: string) => run(auth().mfa.challengeAndVerify({ factorId, code })),
	/** The user's factors (`totp` holds the verified ones only, `all` also the unverified). Reads the user from Auth. */
	listFactors: () => run(auth().mfa.listFactors()),
	/** At aal1 only an unverified factor can be removed: the leftover of an enrolment that was never confirmed. */
	unenroll: (factorId: string) => run(auth().mfa.unenroll({ factorId })),
};

export type SessionState = {
	session: Session | null;
	me: Me | null;
	isAnonymous: boolean;
	isVerified: boolean;
	role: UserRole | null;
	aal: Aal | null;
	loading: boolean;
};

export function sessionState(
	current: Session | null | undefined,
	me: Me | undefined,
	meLoading: boolean
): SessionState {
	const own = (current && me) || null;
	return {
		session: current ?? null,
		me: own,
		isAnonymous: own?.is_anonymous ?? current?.user.is_anonymous ?? false,
		isVerified: own?.email_verified ?? false,
		role: own?.role ?? null,
		aal: own?.aal ?? null,
		loading: current === undefined || (current !== null && meLoading),
	};
}

const subscribe = (listener: () => void) => {
	listeners.add(listener);
	return () => void listeners.delete(listener);
};

export function useSession(): SessionState {
	const current = useSyncExternalStore(
		subscribe,
		() => session,
		() => undefined
	);
	const { data, isLoading } = useGetMeQuery(current ? undefined : skipToken);
	return sessionState(current, data, isLoading);
}

export type RequireAuth = { verified?: boolean; role?: 'MODERATOR' | 'ADMIN'; aal2?: boolean };
/**
 * What the screen must do: render (`ok`), wait, send the user to sign-in, email verification or TOTP, or show an
 * error state (`error`: signed in, but GET /v1/me failed).
 */
export type AuthGate = 'loading' | 'ok' | 'signin' | 'verify' | 'forbidden' | 'aal2' | 'error';

const STAFF: Record<NonNullable<RequireAuth['role']>, UserRole[]> = {
	MODERATOR: ['MODERATOR', 'ADMIN'],
	ADMIN: ['ADMIN'],
};

/** Signed-in areas need a real account: an anonymous finder session counts as signed out. */
export function authGate(state: SessionState, { verified, role, aal2 }: RequireAuth = {}): AuthGate {
	if (state.loading) return 'loading';
	if (!state.session || state.isAnonymous) return 'signin';
	if (!state.me) return 'error';
	if (verified && !state.isVerified) return 'verify';
	if (role && !STAFF[role].includes(state.me.role)) return 'forbidden';
	if (aal2 && state.aal !== 'aal2') return 'aal2';
	return 'ok';
}

/** The app redirects on `gate` (web: sign-in with `?next=`, mobile: router.replace); same name on both. */
export function useRequireAuth(require: RequireAuth = {}): SessionState & { gate: AuthGate } {
	const state = useSession();
	return { ...state, gate: authGate(state, require) };
}
