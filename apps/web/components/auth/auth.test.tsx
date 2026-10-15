import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type * as React from 'react';
import { Provider } from 'react-redux';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { AuthGate as Gate } from '@zivali/api/auth';
import { ApiError } from '@zivali/api/client';
import { createMockApi } from '@zivali/api/mock';
import { createApiStore } from '@zivali/api/rtk';
import en from '@zivali/i18n/dist/en.json';
import sl from '@zivali/i18n/dist/sl.json';

import { AuthGate, VerifiedOnly } from './gate';
import { ForgotForm, NewPasswordForm } from './reset';
import { metadataName, SessionSync } from './session-sync';
import { SignInForm } from './sign-in';
import { SignUpForm } from './sign-up';

vi.mock('next/navigation', async (actual) => ({
	...(await actual()),
	useRouter: () => ({ replace: vi.fn(), push: vi.fn(), prefetch: vi.fn() }),
	usePathname: () => '/vpis',
	useParams: () => ({ locale: 'sl' }),
}));

const auth = vi.hoisted(() => ({
	signIn: vi.fn(),
	signUp: vi.fn(),
	resendConfirmation: vi.fn(),
	requestPasswordReset: vi.fn(),
	updatePassword: vi.fn(),
	signInWithProvider: vi.fn(),
	providers: { google: false, apple: false },
}));
vi.mock('@/lib/auth', async (actual) => ({ ...(await actual<object>()), ...auth }));

const session = vi.hoisted(() => ({
	gate: 'signin' as Gate,
	me: null as null | { email: string; display_name: string | null; is_anonymous: boolean },
	user: undefined as undefined | { user_metadata: Record<string, unknown> },
	updateMe: vi.fn(),
}));
vi.mock('@zivali/api/auth', () => ({
	useRequireAuth: () => ({ gate: session.gate, me: session.me }),
	useSession: () => ({ me: session.me, session: session.user ? { user: session.user } : null }),
	configureAuth: () => () => {},
}));
vi.mock('@zivali/api/me', () => ({ useUpdateMeMutation: () => [session.updateMe] }));
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({}) }));

const catalogues = { sl, en };
const show = (node: React.ReactNode, locale: 'sl' | 'en' = 'sl') =>
	render(
		<NextIntlClientProvider locale={locale} messages={catalogues[locale]}>
			<Provider store={createApiStore(createMockApi())}>{node}</Provider>
		</NextIntlClientProvider>
	);
const type = (label: string | RegExp, value: string) =>
	fireEvent.change(screen.getByLabelText(label), { target: { value } });
const authError = (code: ConstructorParameters<typeof ApiError>[0]) => new ApiError(code, code);

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
	Object.assign(auth.providers, { google: false, apple: false });
});

describe('SignInForm (P16 W1)', () => {
	it('answers a wrong pair with one message for the whole form, keeping both values', async () => {
		auth.signIn.mockRejectedValue(authError('UNAUTHENTICATED'));
		show(<SignInForm />);
		type('E-naslov', 'ana@example.si');
		type('Geslo', 'napacno-geslo');
		fireEvent.click(screen.getByRole('button', { name: 'Vpiši se' }));

		expect((await screen.findByRole('alert')).textContent).toBe(sl.auth.error_credentials);
		expect(auth.signIn).toHaveBeenCalledWith('ana@example.si', 'napacno-geslo', undefined);
		expect(screen.getByLabelText<HTMLInputElement>('E-naslov').value).toBe('ana@example.si');
		expect(screen.getByLabelText<HTMLInputElement>('E-naslov').getAttribute('aria-invalid')).toBeNull();
		// Cleared when a field changes.
		type('Geslo', 'drugo');
		expect(screen.queryByRole('alert')).toBeNull();
	});

	it('names the fields for password managers and toggles the password with a renamed button', () => {
		show(<SignInForm email="ana@example.si" />, 'en');
		const password = screen.getByLabelText<HTMLInputElement>('Password');
		expect(screen.getByLabelText('Email address').getAttribute('autocomplete')).toBe('email');
		expect(password.getAttribute('autocomplete')).toBe('current-password');
		fireEvent.click(screen.getByRole('button', { name: 'Show password' }));
		expect(password.type).toBe('text');
		expect(screen.getByRole('button', { name: 'Hide password' })).toBeTruthy();
		expect(screen.getByRole('link', { name: 'Create an account' }).getAttribute('href')).toBe(
			'/en/sign-up?email=ana%40example.si'
		);
	});

	it('opens the check-email view for an unconfirmed address', async () => {
		auth.signIn.mockRejectedValue(authError('UNVERIFIED_EMAIL'));
		show(<SignInForm />);
		type('E-naslov', 'ana@example.si');
		type('Geslo', 'mačka v škornjih');
		fireEvent.click(screen.getByRole('button', { name: 'Vpiši se' }));

		const heading = await screen.findByRole('heading', { level: 1, name: sl.auth.check_title });
		expect(document.activeElement).toBe(heading);
		expect(screen.getByText(sl.auth.check_body.replace('{email}', 'ana@example.si'))).toBeTruthy();
		fireEvent.click(screen.getByRole('button', { name: sl.auth.check_resend }));
		await vi.waitFor(() => expect(auth.resendConfirmation).toHaveBeenCalledWith('ana@example.si', 'sl', undefined));
	});

	it('shows the calm rate-limit note and disables the primary; providers stay', async () => {
		auth.providers.google = true;
		auth.signIn.mockRejectedValue(authError('RATE_LIMITED'));
		show(<SignInForm />);
		type('E-naslov', 'ana@example.si');
		type('Geslo', 'mačka v škornjih');
		fireEvent.click(screen.getByRole('button', { name: 'Vpiši se' }));

		expect((await screen.findByRole('status')).textContent).toBe(sl.auth.error_rate_limited);
		expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Vpiši se' }).disabled).toBe(true);
		expect(screen.getByRole<HTMLButtonElement>('button', { name: sl.auth.google }).disabled).toBe(false);
		expect(screen.queryByRole('button', { name: sl.auth.apple })).toBeNull();
	});

	it('starts Google with the page to return to', () => {
		auth.providers.google = true;
		auth.signInWithProvider.mockReturnValue(new Promise(() => {}));
		show(<SignInForm next="/racun" />);
		fireEvent.click(screen.getByRole('button', { name: sl.auth.google }));
		expect(auth.signInWithProvider).toHaveBeenCalledWith('google', 'sl', '/racun');
	});

	it('tells about an expired link', () => {
		show(<SignInForm notice="expired" />, 'en');
		expect(screen.getByRole('status').textContent).toBe(`${en.auth.link_failed_title} ${en.auth.link_failed_body}`);
	});
});

describe('SignUpForm (P16 W2)', () => {
	it('checks every field on submit and moves focus to the first invalid one', () => {
		show(<SignUpForm />);
		type('E-naslov', 'ana.novak@gmail');
		fireEvent.click(screen.getByRole('button', { name: 'Ustvari račun' }));

		const name = screen.getByLabelText('Ime');
		expect(document.activeElement).toBe(name);
		expect(name.getAttribute('aria-invalid')).toBe('true');
		expect(screen.getAllByRole('alert').map((alert) => alert.textContent)).toEqual([
			sl.auth.error_name_required,
			sl.auth.error_email_invalid,
			sl.auth.error_password_short,
		]);
		expect(auth.signUp).not.toHaveBeenCalled();
	});

	it('treats a taken address like a new one, so the form never tells which addresses have an account', async () => {
		auth.signUp.mockRejectedValue(authError('CONFLICT'));
		show(<SignUpForm next="/racun" />);
		type('Ime', 'Ana');
		type('E-naslov', ' ana@example.si ');
		type('Geslo', 'mačka v škornjih');
		fireEvent.click(screen.getByRole('button', { name: 'Ustvari račun' }));

		await screen.findByRole('heading', { level: 1, name: sl.auth.check_title });
		expect(auth.signUp).toHaveBeenCalledWith({
			name: 'Ana',
			email: 'ana@example.si',
			password: 'mačka v škornjih',
			locale: 'sl',
			next: '/racun',
			captchaToken: undefined,
		});
		expect(screen.queryByText(sl.auth.error_email_taken)).toBeNull();
		// Just sent: resend waits, with the wait as text.
		expect(screen.getByRole<HTMLButtonElement>('button', { name: sl.auth.check_resend }).disabled).toBe(true);
		expect(screen.getByText(sl.auth.check_resend_wait.replace('{seconds}', '60'))).toBeTruthy();

		fireEvent.click(screen.getByRole('button', { name: sl.auth.check_change }));
		await vi.waitFor(() => expect(document.activeElement).toBe(screen.getByLabelText('E-naslov')));
		expect(screen.getByLabelText<HTMLInputElement>('E-naslov').value).toBe('ana@example.si');
	});

	it('links the terms and privacy pages in a plain sentence, no checkbox', () => {
		show(<SignUpForm />, 'en');
		expect(screen.getByRole('link', { name: 'terms of use' }).getAttribute('href')).toBe('/en/terms');
		expect(screen.getByRole('link', { name: 'privacy policy' }).getAttribute('href')).toBe('/en/privacy');
		expect(screen.queryByRole('checkbox')).toBeNull();
	});
});

describe('ForgotForm (P16 M6, M7)', () => {
	it('gives the same answer for every address and the rate-limit note on a repeat', async () => {
		auth.requestPasswordReset.mockResolvedValueOnce({}).mockRejectedValueOnce(authError('RATE_LIMITED'));
		show(<ForgotForm email="ana@example.si" />);
		const send = screen.getByRole<HTMLButtonElement>('button', { name: sl.auth.forgot_button });

		fireEvent.click(send);
		expect((await screen.findByRole('status')).textContent).toBe(sl.auth.forgot_done);
		expect(auth.requestPasswordReset).toHaveBeenCalledWith('ana@example.si', 'sl', undefined);

		fireEvent.click(send);
		await vi.waitFor(() => expect(screen.getByRole('status').textContent).toBe(sl.auth.error_rate_limited));
		expect(send.disabled).toBe(true);
	});

	it('checks the address first and tells about an expired link', () => {
		show(<ForgotForm expired />, 'en');
		expect(screen.getByRole('status').textContent).toContain(en.auth.link_failed_title);
		type('Email address', 'ana@');
		fireEvent.click(screen.getByRole('button', { name: en.auth.forgot_button }));
		expect(screen.getByRole('alert').textContent).toBe(en.auth.error_email_invalid);
		expect(auth.requestPasswordReset).not.toHaveBeenCalled();
	});
});

describe('NewPasswordForm (P16 M8)', () => {
	it('carries the address for password managers, checks the length, then confirms', async () => {
		auth.updatePassword.mockResolvedValue({});
		const { container } = show(<NewPasswordForm email="ana@example.si" />);
		expect(container.querySelector<HTMLInputElement>('input[autocomplete="username"]')?.value).toBe(
			'ana@example.si'
		);

		type('Novo geslo', 'kratko');
		fireEvent.click(screen.getByRole('button', { name: sl.auth.newpass_button }));
		expect(screen.getByRole('alert').textContent).toBe(sl.auth.error_password_short);
		expect(auth.updatePassword).not.toHaveBeenCalled();

		type('Novo geslo', 'mačka v škornjih');
		fireEvent.click(screen.getByRole('button', { name: sl.auth.newpass_button }));
		expect((await screen.findByRole('status')).textContent).toBe(sl.auth.newpass_done);
		expect(auth.updatePassword).toHaveBeenCalledWith('mačka v škornjih');
		expect(screen.getByRole('link', { name: sl.common.continue }).getAttribute('href')).toBe('/');
	});
});

describe('AuthGate (P16 W3)', () => {
	it('asks a signed-out visitor to sign in or sign up, both returning to this page', () => {
		window.history.pushState({}, '', '/r/Hk3vT9qP?pogled=1');
		session.gate = 'signin';
		const onOpenChange = vi.fn();
		show(<AuthGate reason="contact" open onOpenChange={onOpenChange} />);

		const dialog = screen.getByRole('dialog', { name: sl.auth.gate_title_contact });
		expect(within(dialog).getByText(sl.auth.gate_kept)).toBeTruthy();
		expect(within(dialog).getByRole('link', { name: sl.auth.gate_signin }).getAttribute('href')).toBe(
			'/vpis?next=%2Fr%2FHk3vT9qP%3Fpogled%3D1'
		);
		expect(within(dialog).getByRole('link', { name: sl.auth.gate_signup }).getAttribute('href')).toBe(
			'/registracija?next=%2Fr%2FHk3vT9qP%3Fpogled%3D1'
		);
		fireEvent.click(within(dialog).getByRole('button', { name: sl.auth.gate_cancel }));
		expect(onOpenChange).toHaveBeenCalledWith(false);
	});

	it('is the "confirm your email" variant for an unconfirmed account, with resend as the primary', async () => {
		session.gate = 'verify';
		session.me = { email: 'ana@example.si', display_name: 'Ana', is_anonymous: false };
		auth.resendConfirmation.mockResolvedValue({});
		show(<AuthGate reason="alerts" open onOpenChange={vi.fn()} />);

		const dialog = screen.getByRole('dialog', { name: sl.auth.gate_unverified_title });
		expect(
			within(dialog).getByText(sl.auth.gate_unverified_body.replace('{email}', 'ana@example.si'))
		).toBeTruthy();
		fireEvent.click(within(dialog).getByRole('button', { name: sl.auth.gate_unverified_resend }));
		await vi.waitFor(() => expect(auth.resendConfirmation).toHaveBeenCalledWith('ana@example.si', 'sl', undefined));
	});

	it('steps aside for a confirmed account and continues the action', () => {
		session.gate = 'ok';
		const onOpenChange = vi.fn();
		const onReady = vi.fn();
		show(<AuthGate reason="contact" open onOpenChange={onOpenChange} onReady={onReady} />);
		expect(screen.queryByRole('dialog')).toBeNull();
		expect(onOpenChange).toHaveBeenCalledWith(false);
		expect(onReady).toHaveBeenCalledOnce();
	});
});

describe('VerifiedOnly', () => {
	it('shows alerts and chat to a confirmed account, the prompt to an unconfirmed one', () => {
		session.me = { email: 'ana@example.si', display_name: 'Ana', is_anonymous: false };
		session.gate = 'verify';
		show(<VerifiedOnly>alert settings</VerifiedOnly>, 'en');
		expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(en.auth.gate_unverified_title);
		expect(screen.queryByText('alert settings')).toBeNull();
		cleanup();

		session.gate = 'ok';
		show(<VerifiedOnly>alert settings</VerifiedOnly>, 'en');
		expect(screen.getByText('alert settings')).toBeTruthy();
	});
});

describe('SessionSync', () => {
	it('saves the name from sign-up (or Google) to a new profile once', () => {
		expect(metadataName({ user_metadata: { full_name: '  Ana Novak ' } } as never)).toBe('Ana Novak');
		session.me = { email: 'ana@example.si', display_name: null, is_anonymous: false };
		session.user = { user_metadata: { display_name: 'Ana' } };
		show(<SessionSync />);
		expect(session.updateMe).toHaveBeenCalledWith({ display_name: 'Ana' });

		cleanup();
		session.updateMe.mockClear();
		session.me = { ...session.me, display_name: 'Ana' };
		show(<SessionSync />);
		expect(session.updateMe).not.toHaveBeenCalled();
	});
});
