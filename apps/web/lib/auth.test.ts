import { AuthError } from '@supabase/supabase-js';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@zivali/api/client';

import {
	callbackUrl,
	convertAnonymous,
	ensureSession,
	passwordTooLong,
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

	describe('signs up a new address, refuses one with a confirmed account (TASK-114.1)', () => {
		const signingUp = () =>
			signUp({ name: 'Ana', email: 'ana@example.si', password: 'mačka v škornjih', locale: 'sl' });
		const answer = (identities: unknown[]) => ({
			data: { user: { id: 'u-1', identities }, session: null },
			error: null,
		});

		it('a new address: the confirmation is sent', async () => {
			supabase.signUp.mockResolvedValue(answer([{ provider: 'email' }]));
			await expect(signingUp()).resolves.toMatchObject({ data: { user: { id: 'u-1' } } });
		});

		it('an address with a confirmed account: 200 with no identities and no email, so CONFLICT', async () => {
			supabase.signUp.mockResolvedValue(answer([]));
			const failure = await signingUp().catch((error: unknown) => error);
			expect(failure).toBeInstanceOf(ApiError);
			expect(failure).toMatchObject({ code: 'CONFLICT', details: { auth_code: 'user_already_exists' } });
		});

		it('an unconfirmed address keeps its identity and gets the confirmation again, as today', async () => {
			supabase.signUp.mockResolvedValue(
				answer([{ provider: 'email', identity_data: { email_verified: false } }])
			);
			await expect(signingUp()).resolves.toMatchObject({ data: { user: { id: 'u-1' } } });
		});
	});

	const anonymous = { data: { session: { user: { id: 'u-anon', is_anonymous: true } } }, error: null };
	const account = { name: 'Ana', email: 'ana@example.si', password: 'mačka v škornjih', locale: 'sl' } as const;
	const ok = { data: { user: { id: 'u-anon' } }, error: null };
	const refused = (code: string, status = 400) => ({ data: {}, error: new AuthError('x', status, code) });
	/** The conversion link's callback; with `set`, its next is the set-password form, then the page that asked. */
	const callback = (locale: '' | '/en', next: string, set = false) =>
		`${origin}${locale}/auth/callback?${new URLSearchParams({
			type: 'signup',
			next: set
				? `${locale}/${locale ? 'reset-password' : 'pozabljeno-geslo'}?set=1&next=${encodeURIComponent(next)}`
				: next,
		})}`;

	it('converts the anonymous session in place with one updateUser: password, name and address together (C7 §6)', async () => {
		supabase.getSession.mockResolvedValue(anonymous);
		supabase.updateUser.mockResolvedValue(ok);
		await expect(convertAnonymous({ ...account, next: '/r/Xy7pQ2mK' })).resolves.toEqual({ setPassword: false });
		// One call: GoTrue sets the password before it mails the email_change link, so the link survives.
		expect(supabase.updateUser.mock.calls).toEqual([
			[
				{ email: 'ana@example.si', password: 'mačka v škornjih', data: { locale: 'sl', display_name: 'Ana' } },
				{ emailRedirectTo: callback('', '/r/Xy7pQ2mK') },
			],
		]);
		// Same user: no new one, no sign-out, so report_managers and the manage link stay.
		expect(supabase.signUp).not.toHaveBeenCalled();
		expect(supabase.signInAnonymously).not.toHaveBeenCalled();
	});

	it('on reauthentication_needed (a session over 24 h old) sends the address alone, to the set-password form', async () => {
		supabase.getSession.mockResolvedValue(anonymous);
		supabase.updateUser.mockResolvedValueOnce(refused('reauthentication_needed')).mockResolvedValueOnce(ok);
		const converting = convertAnonymous({ ...account, locale: 'en', next: '/en/r/Xy7pQ2mK' });
		await expect(converting).resolves.toEqual({ setPassword: true });
		expect(supabase.updateUser.mock.calls).toEqual([
			[expect.objectContaining({ password: 'mačka v škornjih' }), expect.anything()],
			[
				{ email: 'ana@example.si', data: { locale: 'en', display_name: 'Ana' } },
				{ emailRedirectTo: callback('/en', '/en/r/Xy7pQ2mK', true) },
			],
		]);

		// The address alone can fail too (the 60 s email limit): thrown, not tried again.
		supabase.updateUser
			.mockResolvedValueOnce(refused('reauthentication_needed'))
			.mockResolvedValueOnce(refused('over_email_send_rate_limit', 429));
		await expect(convertAnonymous(account)).rejects.toMatchObject({ code: 'RATE_LIMITED' });
		expect(supabase.updateUser).toHaveBeenCalledTimes(4);
	});

	it('maps every other failure to C1 codes and never retries: a taken or invalid address, the email limit, the password', async () => {
		supabase.getSession.mockResolvedValue(anonymous);
		for (const [auth_code, status, code] of [
			['email_exists', 422, 'CONFLICT'],
			['email_address_invalid', 400, 'VALIDATION'],
			['over_email_send_rate_limit', 429, 'RATE_LIMITED'],
			['weak_password', 422, 'VALIDATION'],
			// More than 72 bytes (GoTrue's own limit, also checked on the form).
			['validation_failed', 400, 'VALIDATION'],
		] as const) {
			supabase.updateUser.mockResolvedValueOnce(refused(auth_code, status));
			await expect(convertAnonymous(account)).rejects.toMatchObject({ code, details: { auth_code } });
		}
		expect(supabase.updateUser).toHaveBeenCalledTimes(5);
	});

	it('sends the conversion link again by setting the address again, to the same callback; 60 s apart', async () => {
		supabase.getSession.mockResolvedValue(anonymous);
		supabase.updateUser.mockResolvedValue(ok);
		await resendConversion('ana@example.si', 'en', '/en/r/Xy7pQ2mK');
		await resendConversion('ana@example.si', 'sl', '/r/Xy7pQ2mK', true);
		expect(supabase.updateUser.mock.calls).toEqual([
			[{ email: 'ana@example.si' }, { emailRedirectTo: callback('/en', '/en/r/Xy7pQ2mK') }],
			[{ email: 'ana@example.si' }, { emailRedirectTo: callback('', '/r/Xy7pQ2mK', true) }],
		]);
		supabase.updateUser.mockResolvedValueOnce(refused('over_email_send_rate_limit', 429));
		await expect(resendConversion('ana@example.si', 'en')).rejects.toMatchObject({ code: 'RATE_LIMITED' });
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
	});

	it('counts the password in UTF-8 bytes, as GoTrue does', () => {
		expect(passwordTooLong('x'.repeat(72))).toBe(false);
		expect(passwordTooLong('x'.repeat(73))).toBe(true);
		// 37 characters, 74 bytes: GoTrue refuses it (checked on local Supabase).
		expect(passwordTooLong('č'.repeat(37))).toBe(true);
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
