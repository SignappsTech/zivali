import { AuthError } from '@supabase/supabase-js';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@zivali/api/client';

import { callbackUrl, requestPasswordReset, safeNext, signIn, signInWithProvider, signUp } from './auth';

const supabase = vi.hoisted(() => ({
	signInWithPassword: vi.fn(),
	signUp: vi.fn(),
	resetPasswordForEmail: vi.fn(),
	signInWithOAuth: vi.fn(),
}));
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({ auth: supabase }) }));

afterEach(() => vi.clearAllMocks());

describe('safeNext', () => {
	it.each([
		['/racun', '/racun'],
		['/en/account?tab=alerts#x', '/en/account?tab=alerts'],
		['/r/Hk3vT9qP', '/r/Hk3vT9qP'],
	])('keeps the same-site path %s', (next, kept) => expect(safeNext(next)).toBe(kept));

	it.each([
		'https://evil.example/',
		'//evil.example/x',
		'/\\evil.example',
		'javascript:alert(1)',
		'racun',
		'',
		null,
		7,
	])('drops %j', (next) => expect(safeNext(next)).toBeUndefined());
});

describe('Supabase calls', () => {
	const origin = window.location.origin;

	it('builds the localised callback with its type and the page to return to', () => {
		expect(callbackUrl('oauth', 'en', '/en/account')).toBe(
			`${origin}/en/auth/callback?type=oauth&next=%2Fen%2Faccount`
		);
		expect(callbackUrl('recovery', 'sl')).toBe(`${origin}/auth/callback?type=recovery`);
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

	it('starts Google over OAuth with the callback as redirect', async () => {
		supabase.signInWithOAuth.mockResolvedValue({ data: {}, error: null });
		await signInWithProvider('google', 'sl', '/r/Hk3vT9qP');
		expect(supabase.signInWithOAuth).toHaveBeenCalledWith({
			provider: 'google',
			options: { redirectTo: `${origin}/auth/callback?type=oauth&next=%2Fr%2FHk3vT9qP` },
		});
	});
});
