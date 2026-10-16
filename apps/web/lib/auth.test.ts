import { AuthError } from '@supabase/supabase-js';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@zivali/api/client';

import {
	callbackUrl,
	convertAnonymous,
	ensureSession,
	requestPasswordReset,
	resendConversion,
	signIn,
	signInWithProvider,
	signUp,
	updatePassword,
} from './auth';

const supabase = vi.hoisted(() => ({
	signInWithPassword: vi.fn(),
	signUp: vi.fn(),
	resetPasswordForEmail: vi.fn(),
	signInWithOAuth: vi.fn(),
	updateUser: vi.fn(),
	getSession: vi.fn(),
	signInAnonymously: vi.fn(),
}));
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({ auth: supabase }) }));
// The REST client of POST /v1/me/convert-password (the real @zivali/api/me helper calls it).
const api = vi.hoisted(() => ({ request: vi.fn(), locale: undefined as string | undefined }));
vi.mock('@/lib/store', () => ({
	makeApiClient: (locale: string) => ((api.locale = locale), { request: api.request }),
}));

afterEach(() => vi.clearAllMocks());

describe('Supabase calls', () => {
	const origin = window.location.origin;

	it('builds the localised callback with its type and the page to return to', () => {
		expect(callbackUrl('oauth', 'en', '/en/account')).toBe(
			`${origin}/en/auth/callback?type=oauth&next=%2Fen%2Faccount`
		);
		expect(callbackUrl('recovery', 'sl')).toBe(`${origin}/auth/callback?type=recovery`);
	});

	it('signs in anonymously with a captcha token only when the browser has no session (C7)', async () => {
		const token = vi.fn(async () => 'cf-token');
		supabase.getSession.mockResolvedValue({ data: { session: { access_token: 'a' } }, error: null });
		await ensureSession(token);
		expect(token).not.toHaveBeenCalled();
		expect(supabase.signInAnonymously).not.toHaveBeenCalled();

		supabase.getSession.mockResolvedValue({ data: { session: null }, error: null });
		supabase.signInAnonymously.mockResolvedValue({ data: {}, error: null });
		await ensureSession(token);
		expect(supabase.signInAnonymously).toHaveBeenCalledWith({ options: { captchaToken: 'cf-token' } });

		supabase.signInAnonymously.mockResolvedValue({
			data: {},
			error: new AuthError('captcha protection: request disallowed', 400, 'captcha_failed'),
		});
		await expect(ensureSession(token)).rejects.toMatchObject({ code: 'CAPTCHA_FAILED' });
	});

	it('sends the captcha token and maps a wrong pair to UNAUTHENTICATED', async () => {
		supabase.signInWithPassword.mockResolvedValue({
			data: { user: null, session: null },
			error: new AuthError('Invalid login credentials', 400, 'invalid_credentials'),
		});
		const failure = await signIn('ana@example.si', 'wrong', 'cf-token').catch((error: unknown) => error);
		expect(supabase.signInWithPassword).toHaveBeenCalledWith({
			email: 'ana@example.si',
			password: 'wrong',
			options: { captchaToken: 'cf-token' },
		});
		expect(failure).toBeInstanceOf(ApiError);
		expect(failure).toMatchObject({ code: 'UNAUTHENTICATED', details: { auth_code: 'invalid_credentials' } });
	});

	it('signs up with the name and locale in metadata and the confirmation link back to the callback', async () => {
		supabase.signUp.mockResolvedValue({ data: {}, error: null });
		await signUp({
			name: 'Ana',
			email: 'ana@example.si',
			password: 'mačka v škornjih',
			locale: 'sl',
			next: '/racun',
		});
		expect(supabase.signUp).toHaveBeenCalledWith({
			email: 'ana@example.si',
			password: 'mačka v škornjih',
			options: {
				data: { locale: 'sl', display_name: 'Ana' },
				captchaToken: undefined,
				emailRedirectTo: `${origin}/auth/callback?type=signup&next=%2Fracun`,
			},
		});
	});

	const anonymous = { data: { session: { user: { id: 'u-anon', is_anonymous: true } } }, error: null };
	const account = { name: 'Ana', email: 'ana@example.si', password: 'mačka v škornjih', locale: 'sl' } as const;

	it('converts the anonymous session in place: the address with updateUser, then the password through the API (C7 §6)', async () => {
		supabase.getSession.mockResolvedValue(anonymous);
		supabase.updateUser.mockResolvedValue({ data: { user: { id: 'u-anon' } }, error: null });
		api.request.mockResolvedValue(undefined);
		await convertAnonymous({ ...account, next: '/r/Xy7pQ2mK' });
		// No password here: GoTrue would ask a session over 24 h old to reauthenticate (secure_password_change).
		expect(supabase.updateUser).toHaveBeenCalledWith(
			{ email: 'ana@example.si', data: { locale: 'sl', display_name: 'Ana' } },
			{ emailRedirectTo: `${origin}/auth/callback?type=signup&next=%2Fr%2FXy7pQ2mK` }
		);
		expect(api.request).toHaveBeenCalledWith('POST', '/v1/me/convert-password', {
			body: { password: 'mačka v škornjih' },
		});
		expect(api.locale).toBe('sl');
		// The address is pending before the API is asked for the password.
		expect(supabase.updateUser.mock.invocationCallOrder[0]).toBeLessThan(api.request.mock.invocationCallOrder[0]!);
		// Same user: no new one, no sign-out, so report_managers and the manage link stay.
		expect(supabase.signUp).not.toHaveBeenCalled();
		expect(supabase.signInAnonymously).not.toHaveBeenCalled();
	});

	it('maps GoTrue and API failures to C1 codes; a refused address never reaches the API', async () => {
		supabase.getSession.mockResolvedValue(anonymous);
		for (const [auth_code, code] of [
			['email_exists', 'CONFLICT'],
			['email_address_invalid', 'VALIDATION'],
			['over_email_send_rate_limit', 'RATE_LIMITED'],
			['reauthentication_needed', 'UNAUTHENTICATED'],
		] as const) {
			supabase.updateUser.mockResolvedValueOnce({ data: {}, error: new AuthError('x', 422, auth_code) });
			await expect(convertAnonymous(account)).rejects.toMatchObject({ code, details: { auth_code } });
		}
		expect(api.request).not.toHaveBeenCalled();

		supabase.updateUser.mockResolvedValue({ data: { user: { id: 'u-anon' } }, error: null });
		const weak = new ApiError('VALIDATION', 'Password refused', { issues: [{ path: 'password', message: 'x' }] });
		api.request.mockRejectedValueOnce(weak);
		await expect(convertAnonymous(account)).rejects.toBe(weak);
		api.request.mockRejectedValueOnce(new ApiError('RATE_LIMITED', 'Too many requests'));
		await expect(convertAnonymous(account)).rejects.toMatchObject({ code: 'RATE_LIMITED' });
	});

	it('sends the conversion link again by setting the address again, not resend(); 60 s apart', async () => {
		supabase.getSession.mockResolvedValue(anonymous);
		supabase.updateUser.mockResolvedValueOnce({ data: { user: { id: 'u-anon' } }, error: null });
		await resendConversion('ana@example.si', 'en', '/en/r/Xy7pQ2mK');
		expect(supabase.updateUser).toHaveBeenCalledWith(
			{ email: 'ana@example.si' },
			{ emailRedirectTo: `${origin}/en/auth/callback?type=signup&next=%2Fen%2Fr%2FXy7pQ2mK` }
		);
		supabase.updateUser.mockResolvedValueOnce({
			data: {},
			error: new AuthError('wait 60 s', 429, 'over_email_send_rate_limit'),
		});
		await expect(resendConversion('ana@example.si', 'en')).rejects.toMatchObject({ code: 'RATE_LIMITED' });
		expect(api.request).not.toHaveBeenCalled();
	});

	it('never changes the address or password of an account or a missing session', async () => {
		for (const session of [{ user: { id: 'u-1', is_anonymous: false } }, null]) {
			supabase.getSession.mockResolvedValue({ data: { session }, error: null });
			await expect(convertAnonymous({ ...account, locale: 'en' })).rejects.toMatchObject({
				code: 'UNAUTHENTICATED',
			});
			await expect(resendConversion(account.email, 'en')).rejects.toMatchObject({ code: 'UNAUTHENTICATED' });
		}
		expect(supabase.updateUser).not.toHaveBeenCalled();
		expect(api.request).not.toHaveBeenCalled();
	});

	it('asks for the reset link with the recovery callback; a repeat is RATE_LIMITED', async () => {
		supabase.resetPasswordForEmail.mockResolvedValue({
			data: null,
			error: new AuthError('For security purposes…', 429, 'over_email_send_rate_limit'),
		});
		await expect(requestPasswordReset('ana@example.si', 'en', 'cf')).rejects.toMatchObject({
			code: 'RATE_LIMITED',
		});
		expect(supabase.resetPasswordForEmail).toHaveBeenCalledWith('ana@example.si', {
			redirectTo: `${origin}/en/auth/callback?type=recovery`,
			captchaToken: 'cf',
		});
	});

	it('saves a new password; a refusal is an ApiError', async () => {
		supabase.updateUser.mockResolvedValue({ data: {}, error: null });
		await updatePassword('nova mačka 2');
		expect(supabase.updateUser).toHaveBeenCalledWith({ password: 'nova mačka 2' });

		supabase.updateUser.mockResolvedValue({
			data: {},
			error: new AuthError('New password should be different', 422, 'same_password'),
		});
		await expect(updatePassword('nova mačka 2')).rejects.toBeInstanceOf(ApiError);
	});

	it('starts Google over OAuth with the callback as redirect', async () => {
		supabase.signInWithOAuth.mockResolvedValue({ data: {}, error: null });
		await signInWithProvider('google', 'sl', '/r/Hk3vT9qP');
		expect(supabase.signInWithOAuth).toHaveBeenCalledWith({
			provider: 'google',
			options: { redirectTo: `${origin}/auth/callback?type=oauth&next=%2Fr%2FHk3vT9qP` },
		});
	});
});
