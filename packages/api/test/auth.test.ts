import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { AuthChangeEvent, AuthError, Session, SupabaseClient } from '@supabase/supabase-js';

import { adminMe, anonymousMe, me } from '../src/__fixtures__/me.ts';
import {
	authError,
	authGate,
	configureAuth,
	sessionState,
	signInWithEmail,
	signInWithGoogle,
	signOut,
	signUpWithEmail,
} from '../src/auth.ts';
import { meApi } from '../src/me.ts';
import { createMockApi } from '../src/mock.ts';
import { createApiStore } from '../src/rtk.ts';

const session = (id: string, isAnonymous = false) => ({ user: { id, is_anonymous: isAnonymous } }) as Session;
const authFailure = (code: string, status = 400, name = 'AuthApiError') =>
	({ name, code, status, message: code }) as unknown as AuthError;

// Records calls; `result` is what every auth method resolves to.
function fakeSupabase(result: { data: unknown; error: AuthError | null } = { data: {}, error: null }) {
	let emit: (event: AuthChangeEvent, next: Session | null) => void = () => {};
	const calls: [string, unknown][] = [];
	const method = (name: string) => async (arg: unknown) => (calls.push([name, arg]), result);
	const auth = {
		onAuthStateChange: (callback: typeof emit) => (
			(emit = callback),
			{ data: { subscription: { unsubscribe() {} } } }
		),
		signUp: method('signUp'),
		signInWithPassword: method('signInWithPassword'),
		signInWithOAuth: method('signInWithOAuth'),
		signInWithIdToken: method('signInWithIdToken'),
		signOut: method('signOut'),
	};
	return {
		client: { auth } as unknown as SupabaseClient,
		calls,
		emit: (e: AuthChangeEvent, s: Session | null) => emit(e, s),
	};
}

test('Supabase errors map to C1 codes and keep the auth code', () => {
	const cases: [AuthError, string][] = [
		[authFailure('invalid_credentials'), 'UNAUTHENTICATED'],
		[authFailure('email_not_confirmed'), 'UNVERIFIED_EMAIL'],
		[authFailure('captcha_failed'), 'CAPTCHA_FAILED'],
		[authFailure('over_email_send_rate_limit', 429), 'RATE_LIMITED'],
		[authFailure('user_already_exists', 422), 'CONFLICT'],
		[authFailure('weak_password', 422), 'VALIDATION'],
		[authFailure('unexpected', 0, 'AuthRetryableFetchError'), 'NETWORK'],
		[authFailure('something_new', 500), 'INTERNAL'],
	];
	for (const [error, code] of cases) assert.equal(authError(error).code, code, error.code);
	assert.deepEqual(authError(authFailure('weak_password')).details, { auth_code: 'weak_password' });
});

test('authError never carries the raw Supabase message or cause', () => {
	const raw = { ...authFailure('email_exists', 422), message: 'User ana@example.si already registered' } as AuthError;
	const error = authError(raw);
	assert.equal(error.status, 422);
	assert.equal(error.cause, undefined);
	assert.doesNotMatch(JSON.stringify({ m: error.message, d: error.details }), /ana@example\.si/);
	assert.deepEqual(error.details, { auth_code: 'email_exists' });
});

test('helpers pass the contract arguments to supabase-js and throw ApiError', async () => {
	const ok = fakeSupabase();
	configureAuth(ok.client, createApiStore(createMockApi()));
	await signUpWithEmail('ana@example.si', 'geslo-123', { locale: 'en', captchaToken: 'c1' });
	await signInWithGoogle({ redirectTo: 'https://najdimo.si/auth/callback' });
	await signInWithGoogle({ idToken: 'google-id-token' });
	assert.deepEqual(ok.calls, [
		[
			'signUp',
			{
				email: 'ana@example.si',
				password: 'geslo-123',
				options: { data: { locale: 'en' }, captchaToken: 'c1', emailRedirectTo: undefined },
			},
		],
		['signInWithOAuth', { provider: 'google', options: { redirectTo: 'https://najdimo.si/auth/callback' } }],
		['signInWithIdToken', { provider: 'google', token: 'google-id-token', nonce: undefined }],
	]);

	const failing = fakeSupabase({ data: { user: null, session: null }, error: authFailure('invalid_credentials') });
	configureAuth(failing.client, createApiStore(createMockApi()));
	await assert.rejects(signInWithEmail('ana@example.si', 'narobe'), { name: 'ApiError', code: 'UNAUTHENTICATED' });
});

test('signOut runs the app cleanup first and still ends the session when it fails', async () => {
	const fake = fakeSupabase({ data: null, error: null });
	configureAuth(fake.client, createApiStore(createMockApi()));
	const order: string[] = [];
	await signOut(async () => void order.push('cleanup'));
	await assert.rejects(
		signOut(async () => {
			throw new Error('offline');
		}),
		/offline/
	);
	assert.deepEqual([order, fake.calls.map(([name]) => name)], [['cleanup'], ['signOut', 'signOut']]);
	assert.deepEqual(fake.calls[0][1], { scope: 'local' });
});

test('configureAuth: another user clears the API cache; MFA verification refetches me', async () => {
	const client = createMockApi({ 'GET /v1/me': me });
	const store = createApiStore(client);
	const fake = fakeSupabase();
	configureAuth(fake.client, store);
	const cached = () => Object.keys(store.getState().api.queries).length;

	fake.emit('INITIAL_SESSION', session('u1'));
	const sub = store.dispatch(meApi.endpoints.getMe.initiate());
	await sub;
	fake.emit('TOKEN_REFRESHED', session('u1'));
	assert.equal(cached(), 1);

	fake.emit('MFA_CHALLENGE_VERIFIED', session('u1'));
	await new Promise((resolve) => setTimeout(resolve, 10));
	assert.equal(client.calls.length, 2);

	fake.emit('SIGNED_IN', session('u1'));
	await new Promise((resolve) => setTimeout(resolve, 10));
	assert.equal(client.calls.length, 3);

	fake.emit('SIGNED_IN', session('u2'));
	assert.equal(cached(), 0);
	sub.unsubscribe();
});

test('sessionState and authGate', () => {
	assert.equal(sessionState(undefined, undefined, false).loading, true);
	assert.equal(sessionState(session('u1'), undefined, true).loading, true);
	const signedOut = sessionState(null, undefined, false);
	assert.deepEqual(signedOut, {
		session: null,
		me: null,
		isAnonymous: false,
		isVerified: false,
		role: null,
		aal: null,
		loading: false,
	});

	const user = sessionState(session(me.id), me, false);
	assert.deepEqual([user.isVerified, user.role, user.aal], [true, 'USER', 'aal1']);
	const unverified = sessionState(session(me.id), { ...me, email_verified: false }, false);
	const anonymous = sessionState(session(me.id, true), anonymousMe, false);
	const admin = sessionState(session(me.id), adminMe, false);

	assert.equal(authGate(sessionState(undefined, undefined, false)), 'loading');
	assert.equal(authGate(signedOut), 'signin');
	assert.equal(authGate(anonymous), 'signin');
	assert.equal(authGate(sessionState(session(me.id), undefined, false)), 'error');
	assert.equal(authGate(user), 'ok');
	assert.equal(authGate(unverified, { verified: true }), 'verify');
	assert.equal(authGate(user, { role: 'MODERATOR' }), 'forbidden');
	assert.equal(authGate({ ...admin, aal: 'aal1' }, { role: 'MODERATOR', aal2: true }), 'aal2');
	assert.equal(authGate(admin, { role: 'ADMIN', aal2: true }), 'ok');
});
