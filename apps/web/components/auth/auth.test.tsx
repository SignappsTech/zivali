import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type * as React from 'react';
import { Provider } from 'react-redux';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getMockEvents, initAnalytics, resetMockEvents, setConsent } from '@zivali/analytics';
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
import { CheckEmail, SignUpForm } from './sign-up';

vi.mock('next/navigation', async (actual) => ({
	...(await actual()),
	useRouter: () => ({ replace: vi.fn(), push: vi.fn(), prefetch: vi.fn() }),
	usePathname: () => '/vpis',
	useParams: () => ({ locale: 'sl' }),
}));

const auth = vi.hoisted(() => ({
	signIn: vi.fn(),
	signUp: vi.fn(),
	convertAnonymous: vi.fn(),
	resendConfirmation: vi.fn(),
	resendConversion: vi.fn(),
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

		const alert = await screen.findByRole('alert');
		expect(alert.textContent).toBe(sl.auth.error_credentials);
		expect(auth.signIn).toHaveBeenCalledWith('ana@example.si', 'napacno-geslo', undefined);
		expect(screen.getByLabelText<HTMLInputElement>('E-naslov').value).toBe('ana@example.si');
		// Both fields carry the one message.
		for (const label of ['E-naslov', 'Geslo']) {
			const field = screen.getByLabelText(label);
			expect(field.getAttribute('aria-invalid')).toBe('true');
			expect(field.getAttribute('aria-describedby')).toBe(alert.id);
		}
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

	it('refuses a password over 72 bytes before GoTrue does ("č" counts 2)', () => {
		show(<SignUpForm />);
		type('Ime', 'Ana');
		type('E-naslov', 'ana@example.si');
		type('Geslo', 'č'.repeat(37));
		fireEvent.click(screen.getByRole('button', { name: 'Ustvari račun' }));
		expect(screen.getByRole('alert').textContent).toBe(sl.auth.error_password_long);
		expect(document.activeElement).toBe(screen.getByLabelText('Geslo'));
		expect(auth.signUp).not.toHaveBeenCalled();
	});

	it('links the terms and privacy pages in a plain sentence, no checkbox', () => {
		show(<SignUpForm />, 'en');
		expect(screen.getByRole('link', { name: 'terms of use' }).getAttribute('href')).toBe('/en/terms');
		expect(screen.getByRole('link', { name: 'privacy policy' }).getAttribute('href')).toBe('/en/privacy');
		expect(screen.queryByRole('checkbox')).toBeNull();
	});
});

describe('SignUpForm converting an anonymous finder (C7 §6)', () => {
	beforeEach(() => {
		initAnalytics();
		setConsent({ analytics: true });
		resetMockEvents();
		auth.convertAnonymous.mockResolvedValue({ setPassword: false });
	});

	const fill = () => {
		type('Ime', 'Ana');
		type('E-naslov', ' ana@example.si ');
		type('Geslo', 'mačka v škornjih');
		fireEvent.click(screen.getByRole('button', { name: 'Ustvari račun' }));
	};

	it('converts the session in place instead of signing up, then waits for the email change link', async () => {
		auth.providers.google = true;
		show(<SignUpForm convert />);
		expect(screen.getByText(sl.auth.convert_note)).toBeTruthy();
		// Google would start another user, so the reports would not come along.
		expect(screen.queryByRole('button', { name: sl.auth.google })).toBeNull();
		fill();

		await screen.findByRole('heading', { level: 1, name: sl.auth.check_title });
		expect(auth.convertAnonymous).toHaveBeenCalledWith({
			name: 'Ana',
			email: 'ana@example.si',
			password: 'mačka v škornjih',
			locale: 'sl',
			next: undefined,
		});
		expect(auth.signUp).not.toHaveBeenCalled();
		expect(getMockEvents()).toEqual([{ name: 'sign_up', params: { method: 'convert' } }]);
		expect(screen.queryByText(sl.auth.check_set_password)).toBeNull();
	});

	it('says the password comes after the link when the conversion could not set it (a session over 24 h old)', async () => {
		auth.convertAnonymous.mockResolvedValueOnce({ setPassword: true });
		show(<SignUpForm convert next="/r/Xy7pQ2mK" />);
		fill();
		await screen.findByRole('heading', { level: 1, name: sl.auth.check_title });
		expect(screen.getByText(sl.auth.check_set_password)).toBeTruthy();
		expect(getMockEvents()).toEqual([{ name: 'sign_up', params: { method: 'convert' } }]);
	});

	it("resends the conversion's link by setting the address again, to the same callback", async () => {
		show(<CheckEmail email="ana@example.si" sent={false} onChange={() => {}} convert next="/r/Xy7pQ2mK" />);
		fireEvent.click(screen.getByRole('button', { name: sl.auth.check_resend }));
		await vi.waitFor(() =>
			expect(auth.resendConversion).toHaveBeenCalledWith('ana@example.si', 'sl', '/r/Xy7pQ2mK', false)
		);
		cleanup();
		show(<CheckEmail email="ana@example.si" sent={false} onChange={() => {}} convert setPassword />);
		fireEvent.click(screen.getByRole('button', { name: sl.auth.check_resend }));
		await vi.waitFor(() =>
			expect(auth.resendConversion).toHaveBeenLastCalledWith('ana@example.si', 'sl', undefined, true)
		);
		// resend() would find no user by the address (an anonymous user has none) and carry no PKCE.
		expect(auth.resendConfirmation).not.toHaveBeenCalled();
	});

	it('sends nothing to analytics without consent', async () => {
		setConsent({ analytics: false });
		show(<SignUpForm convert />);
		fill();
		await screen.findByRole('heading', { level: 1, name: sl.auth.check_title });
		expect(getMockEvents()).toEqual([]);
	});

	it('names a taken address and says to sign in and then open the private link, offering sign-in', async () => {
		auth.convertAnonymous.mockRejectedValueOnce(authError('CONFLICT'));
		show(<SignUpForm convert />);
		fill();

		const alert = await screen.findByRole('alert');
		expect(alert.textContent).toBe(sl.auth.convert_email_taken);
		const email = screen.getByLabelText('E-naslov');
		expect(email.getAttribute('aria-describedby')).toContain(alert.id);
		expect(document.activeElement).toBe(email);
		expect(screen.getByRole('link', { name: sl.auth.to_signin }).getAttribute('href')).toBe(
			'/vpis?email=ana%40example.si'
		);
		expect(getMockEvents()).toEqual([]);
	});

	it('puts a weak password on its field and the rate limit and network errors under the form, without retrying', async () => {
		// GoTrue's own policy (weak_password), stricter on the hosted project than the length checked here.
		auth.convertAnonymous.mockRejectedValueOnce(
			new ApiError('VALIDATION', 'VALIDATION', { details: { auth_code: 'weak_password' } })
		);
		show(<SignUpForm convert />);
		type('Ime', 'Ana');
		type('E-naslov', 'ana@example.si');
		type('Geslo', 'č'.repeat(37));
		fireEvent.click(screen.getByRole('button', { name: 'Ustvari račun' }));
		// Over 72 bytes is refused on the form, before GoTrue.
		expect(screen.getByRole('alert').textContent).toBe(sl.auth.error_password_long);
		expect(auth.convertAnonymous).not.toHaveBeenCalled();
		type('Geslo', 'mačka v škornjih');
		fireEvent.click(screen.getByRole('button', { name: 'Ustvari račun' }));
		expect((await screen.findByRole('alert')).textContent).toBe(sl.auth.error_password_weak);
		expect(document.activeElement).toBe(screen.getByLabelText('Geslo'));

		auth.convertAnonymous.mockRejectedValueOnce(authError('NETWORK'));
		fireEvent.click(screen.getByRole('button', { name: 'Ustvari račun' }));
		expect((await screen.findByRole('alert')).textContent).toBe(sl.errors.NETWORK);

		auth.convertAnonymous.mockRejectedValueOnce(authError('RATE_LIMITED'));
		fireEvent.click(screen.getByRole('button', { name: 'Ustvari račun' }));
		expect((await screen.findByRole('status')).textContent).toBe(sl.auth.error_rate_limited);
		expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Ustvari račun' }).disabled).toBe(true);
		expect(auth.convertAnonymous).toHaveBeenCalledTimes(3);
		expect(auth.signUp).not.toHaveBeenCalled();
	});

	it('is the plain form without convert: no note, the providers, sign-up', async () => {
		auth.providers.google = true;
		show(<SignUpForm />);
		expect(screen.queryByText(sl.auth.convert_note)).toBeNull();
		expect(screen.getByRole('button', { name: sl.auth.google })).toBeTruthy();
		fill();
		await screen.findByRole('heading', { level: 1, name: sl.auth.check_title });
		expect(auth.convertAnonymous).not.toHaveBeenCalled();
		expect(auth.signUp).toHaveBeenCalled();
		expect(getMockEvents()).toEqual([]);
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

	it("sets a converted finder's first password (C7 §6), refuses one over 72 bytes, then goes on to next", async () => {
		auth.updatePassword.mockResolvedValue({});
		show(<NewPasswordForm email="ana@example.si" set next="/en/r/Xy7pQ2mK" />, 'en');
		expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(en.auth.setpass_title);
		expect(screen.getByText(en.auth.setpass_body)).toBeTruthy();

		type('New password', 'č'.repeat(37));
		fireEvent.click(screen.getByRole('button', { name: en.auth.newpass_button }));
		expect(screen.getByRole('alert').textContent).toBe(en.auth.error_password_long);
		expect(auth.updatePassword).not.toHaveBeenCalled();

		type('New password', 'mačka v škornjih');
		fireEvent.click(screen.getByRole('button', { name: en.auth.newpass_button }));
		expect((await screen.findByRole('status')).textContent).toBe(en.auth.setpass_done);
		expect(auth.updatePassword).toHaveBeenCalledWith('mačka v škornjih');
		expect(screen.getByRole('link', { name: en.common.continue }).getAttribute('href')).toBe('/en/r/Xy7pQ2mK');
	});
});

describe('AuthGate (P16 W3)', () => {
	it('asks a signed-out visitor to sign in or sign up, both returning to this page', async () => {
		window.history.pushState({}, '', '/r/Hk3vT9qP?pogled=1');
		session.gate = 'signin';
		const onOpenChange = vi.fn();
		show(<AuthGate reason="contact" open onOpenChange={onOpenChange} />);

		const dialog = await screen.findByRole('dialog', { name: sl.auth.gate_title_contact });
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

		const dialog = await screen.findByRole('dialog', { name: sl.auth.gate_unverified_title });
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
	it('shows alerts and chat to a confirmed account, the prompt to an unconfirmed one', async () => {
		session.me = { email: 'ana@example.si', display_name: 'Ana', is_anonymous: false };
		session.gate = 'verify';
		show(<VerifiedOnly>alert settings</VerifiedOnly>, 'en');
		expect((await screen.findByRole('heading', { level: 1 })).textContent).toBe(en.auth.gate_unverified_title);
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
