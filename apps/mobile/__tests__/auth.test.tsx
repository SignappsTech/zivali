// Loads the jest.setup Reanimated mock (with useReducedMotion) before expo-router's testing mocks register their own.
import 'react-native-reanimated';

import { PortalHost } from '@rn-primitives/portal';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { router, Stack } from 'expo-router';
import { renderRouter } from 'expo-router/testing-library';
import * as React from 'react';
import { Linking } from 'react-native';

import { getMockEvents, initAnalytics, resetMockEvents, setConsent } from '@zivali/analytics';
import { ApiError } from '@zivali/api/client';
import en from '@zivali/i18n/dist/en.json';
import sl from '@zivali/i18n/dist/sl.json';
import AuthLayout from '@/app/auth/_layout';
import AuthCallback from '@/app/auth/callback';
import CheckEmail from '@/app/auth/check-email';
import ForgotPassword from '@/app/auth/forgot-password';
import NewPassword from '@/app/auth/new-password';
import { signOutProviders } from '@/lib/auth';
import SignIn from '@/app/auth/sign-in';
import SignUp from '@/app/auth/sign-up';
import AccountSettings from '@/app/settings/account';
import SettingsLayout from '@/app/settings/_layout';
import { AuthGate } from '@/components/auth/gate';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/sonner';
import { Text } from '@/components/ui/text';
import { I18nProvider } from '@/lib/i18n';

const mockStorage = new Map<string, string>();
jest.mock('expo-sqlite/localStorage/install', () => {
	globalThis.localStorage = {
		getItem: (name: string) => mockStorage.get(name) ?? null,
		setItem: (name: string, value: string) => void mockStorage.set(name, value),
		removeItem: (name: string) => void mockStorage.delete(name),
	} as Storage;
	return {};
});
// jest-expo renders as iOS, where native Google needs both client ids; Apple stays flagged off.
jest.mock('@/lib/env', () => ({
	env: {
		EXPO_PUBLIC_APP_URL: 'https://najdimo.test',
		EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: 'web.apps.googleusercontent.com',
		EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID: 'ios.apps.googleusercontent.com',
		EXPO_PUBLIC_APPLE_SIGN_IN: false,
	},
}));

const mockSupabase = {
	signUp: jest.fn(),
	resend: jest.fn(),
	updateUser: jest.fn(),
	exchangeCodeForSession: jest.fn(),
	getSession: jest.fn(),
};
jest.mock('@/lib/supabase', () => ({
	supabase: {
		get auth() {
			return mockSupabase;
		},
	},
}));

type MockSession = {
	session: object | null;
	me: {
		email: string;
		display_name: string | null;
		phone: string | null;
		home: null | object;
		home_radius_km: number;
	} | null;
	gate: string;
	isAnonymous?: boolean;
};
const signedOut: MockSession = { session: null, me: null, gate: 'signin' };
const me = { email: 'ana@primer.si', display_name: 'Ana', phone: null, home: null, home_radius_km: 5 };
const mockSession = {
	value: signedOut,
	listeners: new Set<() => void>(),
	set(value: MockSession) {
		this.value = value;
		for (const listener of this.listeners) listener();
	},
};
const mockApiAuth = { signInWithEmail: jest.fn(), requestPasswordReset: jest.fn(), signInWithGoogle: jest.fn() };
jest.mock('@zivali/api/auth', () => {
	const { useSyncExternalStore } = jest.requireActual<typeof import('react')>('react');
	const use = () =>
		useSyncExternalStore(
			(listener: () => void) => {
				mockSession.listeners.add(listener);
				return () => void mockSession.listeners.delete(listener);
			},
			() => mockSession.value
		);
	return {
		// Supabase errors arrive here already as ApiError.
		authError: (error: unknown) => error,
		useSession: use,
		useRequireAuth: use,
		signInWithEmail: (...args: unknown[]) => mockApiAuth.signInWithEmail(...args),
		requestPasswordReset: (...args: unknown[]) => mockApiAuth.requestPasswordReset(...args),
		signInWithGoogle: (...args: unknown[]) => mockApiAuth.signInWithGoogle(...args),
		signInWithApple: jest.fn(),
	};
});
const mockUpdateMe = jest.fn();
jest.mock('@zivali/api/me', () => ({
	useUpdateMeMutation: () => [(patch: unknown) => ({ unwrap: () => mockUpdateMe(patch) }), { isLoading: false }],
}));
const ljubljana = {
	label: 'Ljubljana',
	lat: 46.0569,
	lng: 14.5058,
	kind: 'settlement',
	municipality_slug: 'ljubljana',
};
jest.mock('@zivali/api/geocode', () => ({
	useReversePlaceQuery: () => ({ data: ljubljana }),
}));
const mockGoogleSignIn = jest.fn();
const mockGoogleSignOut = jest.fn();
jest.mock('@react-native-google-signin/google-signin', () => ({
	GoogleSignin: {
		configure: jest.fn(),
		hasPlayServices: jest.fn(async () => true),
		signIn: () => mockGoogleSignIn(),
		signOut: () => mockGoogleSignOut(),
	},
}));
jest.mock('@/components/ui/sonner', () => ({
	toast: Object.assign(jest.fn(), { success: jest.fn(), error: jest.fn() }),
}));

const mockReady = jest.fn();
/** A flow step that needs an account: its draft must survive the trip through the auth screens. */
function Step() {
	const [open, setOpen] = React.useState(false);
	return (
		<>
			<Text>draft: Pes Luna</Text>
			<Button onPress={() => setOpen(true)}>Objavi</Button>
			<Button onPress={() => router.push('/auth/sign-in')}>Vpis</Button>
			<AuthGate reason="report" open={open} onOpenChange={setOpen} onReady={mockReady} />
		</>
	);
}

const routes = {
	_layout: () => <Stack screenOptions={{ headerShown: false }} />,
	index: Step,
	profile: () => <Text>profile</Text>,
	'auth/_layout': AuthLayout,
	'auth/sign-in': SignIn,
	'auth/sign-up': SignUp,
	'auth/check-email': CheckEmail,
	'auth/forgot-password': ForgotPassword,
	'auth/new-password': NewPassword,
	'auth/callback': AuthCallback,
	'settings/_layout': SettingsLayout,
	'settings/account': AccountSettings,
	// The picker screen itself is covered in alerts.test.tsx.
	'settings/home-area': () => <Text>home-area</Text>,
};

function Providers({ children }: { children: React.ReactNode }) {
	return (
		<I18nProvider>
			{children}
			<PortalHost />
		</I18nProvider>
	);
}

const app = async (initialUrl = '/') => {
	const result = renderRouter(routes, { initialUrl, wrapper: Providers });
	await result;
	return { getPathname: result.getPathname };
};
const type = (label: string, text: string) => fireEvent.changeText(screen.getByLabelText(label), text);
const press = (name: string) => fireEvent.press(screen.getByRole('button', { name }));

jest.setTimeout(60_000);

beforeEach(() => {
	mockStorage.clear();
	mockStorage.set('locale', 'sl');
	mockSession.set(signedOut);
	for (const mock of [
		...Object.values(mockSupabase),
		...Object.values(mockApiAuth),
		mockUpdateMe,
		mockGoogleSignIn,
		mockGoogleSignOut,
		mockReady,
	])
		mock.mockReset();
	jest.mocked(toast).mockReset();
	jest.mocked(toast.success).mockReset();
});

describe('sign in', () => {
	test('a wrong pair gets one message; success leaves the auth screens for the step, draft intact', async () => {
		const result = await app();
		await press('Vpis');
		expect(screen.getByRole('heading', { name: sl.auth.signin_title })).toBeOnTheScreen();

		await type(sl.auth.email_label, ' ana@primer.si ');
		await type(sl.auth.password_label, 'napačno');
		mockApiAuth.signInWithEmail.mockRejectedValueOnce(new ApiError('UNAUTHENTICATED', 'UNAUTHENTICATED'));
		await press(sl.auth.signin_button);
		expect(mockApiAuth.signInWithEmail).toHaveBeenCalledWith('ana@primer.si', 'napačno');
		expect(screen.getByText(sl.auth.error_credentials)).toBeOnTheScreen();

		await type(sl.auth.password_label, 'mačka v škornjih');
		expect(screen.queryByText(sl.auth.error_credentials)).toBeNull();
		mockApiAuth.signInWithEmail.mockResolvedValueOnce({});
		await press(sl.auth.signin_button);
		expect(result.getPathname()).toBe('/');
		expect(screen.getByText('draft: Pes Luna')).toBeOnTheScreen();
	});

	test('the eye button shows the password and is renamed', async () => {
		await app('/auth/sign-in');
		expect(screen.getByLabelText(sl.auth.password_label)).toHaveProp('secureTextEntry', true);
		await press(sl.auth.password_show);
		expect(screen.getByLabelText(sl.auth.password_label)).toHaveProp('secureTextEntry', false);
		expect(screen.getByRole('button', { name: sl.auth.password_hide })).toBeOnTheScreen();
	});

	test('an unconfirmed address goes to Check your email; too many attempts disable the primary with a note', async () => {
		const result = await app('/auth/sign-in');
		await type(sl.auth.email_label, 'ana@primer.si');
		mockApiAuth.signInWithEmail.mockRejectedValueOnce(new ApiError('UNVERIFIED_EMAIL', 'UNVERIFIED_EMAIL'));
		await press(sl.auth.signin_button);
		expect(result.getPathname()).toBe('/auth/check-email');
		expect(screen.getByText(sl.auth.check_body.replace('{email}', 'ana@primer.si'))).toBeOnTheScreen();
		// Nothing was sent from here, so resend is available at once.
		expect(screen.getByRole('button', { name: sl.auth.check_resend })).toBeEnabled();

		await act(() => router.back());
		mockApiAuth.signInWithEmail.mockRejectedValueOnce(new ApiError('RATE_LIMITED', 'RATE_LIMITED'));
		await press(sl.auth.signin_button);
		expect(screen.getByText(sl.auth.error_rate_limited)).toBeOnTheScreen();
		expect(screen.getByRole('button', { name: sl.auth.signin_button })).toBeDisabled();
	});

	test('works in English', async () => {
		mockStorage.set('locale', 'en');
		await app('/auth/sign-in');
		expect(screen.getByRole('heading', { name: en.auth.signin_title })).toBeOnTheScreen();
		expect(screen.getByRole('button', { name: en.auth.forgot_link })).toBeOnTheScreen();
		expect(screen.getByRole('button', { name: en.auth.google })).toBeOnTheScreen();
	});
});

describe('sign up', () => {
	test('checks the fields, sends the name and locale, then waits for the email with resend cooling down', async () => {
		const result = await app('/auth/sign-up');
		await press(sl.auth.signup_button);
		expect(screen.getByText(sl.auth.error_name_required)).toBeOnTheScreen();
		expect(screen.getByText(sl.auth.error_email_invalid)).toBeOnTheScreen();
		expect(screen.getByText(sl.auth.error_password_short)).toBeOnTheScreen();
		expect(mockSupabase.signUp).not.toHaveBeenCalled();

		await type(sl.auth.name_label, 'Ana');
		await type(sl.auth.email_label, 'ana@primer.si');
		await type(sl.auth.password_label, 'mačka v škornjih');
		expect(screen.queryByText(sl.auth.error_name_required)).toBeNull();
		mockSupabase.signUp.mockResolvedValueOnce({ data: {}, error: null });
		await press(sl.auth.signup_button);

		expect(mockSupabase.signUp).toHaveBeenCalledWith({
			email: 'ana@primer.si',
			password: 'mačka v škornjih',
			options: {
				data: { locale: 'sl', display_name: 'Ana' },
				emailRedirectTo: expect.stringMatching(/auth\/callback\?type=signup$/),
			},
		});
		expect(result.getPathname()).toBe('/auth/check-email');
		expect(screen.getByRole('button', { name: sl.auth.check_resend })).toBeDisabled();
		expect(screen.getByText(sl.auth.check_resend_wait.replace('{seconds}', '60'))).toBeOnTheScreen();
	});

	test('an invalid-address error from the server is an email field error, any other validation is generic', async () => {
		await app('/auth/sign-up');
		await type(sl.auth.name_label, 'Ana');
		await type(sl.auth.email_label, 'ana@primer.si');
		await type(sl.auth.password_label, 'mačka v škornjih');
		mockSupabase.signUp.mockResolvedValueOnce({
			data: {},
			error: new ApiError('VALIDATION', 'VALIDATION', { details: { auth_code: 'email_address_invalid' } }),
		});
		await press(sl.auth.signup_button);
		expect(screen.getByText(sl.auth.error_email_invalid)).toBeOnTheScreen();
		mockSupabase.signUp.mockResolvedValueOnce({
			data: {},
			error: new ApiError('VALIDATION', 'VALIDATION', { details: { auth_code: 'weak_password' } }),
		});
		await press(sl.auth.signup_button);
		expect(screen.getByText(sl.errors.VALIDATION)).toBeOnTheScreen();
	});

	test('a taken address looks like success', async () => {
		await app('/auth/sign-up');
		await type(sl.auth.name_label, 'Ana');
		await type(sl.auth.email_label, 'ana@primer.si');
		await type(sl.auth.password_label, 'mačka v škornjih');
		mockSupabase.signUp.mockResolvedValueOnce({ data: {}, error: new ApiError('CONFLICT', 'CONFLICT') });
		await press(sl.auth.signup_button);
		expect(screen.queryByText(sl.auth.error_email_taken)).toBeNull();
		expect(await screen.findByRole('heading', { name: sl.auth.check_title })).toBeOnTheScreen();
	});

	test('from an anonymous finder session it converts that session in place, never a new user (C7 §6)', async () => {
		initAnalytics({ provider: 'mock', storage: { get: () => null, set: () => {} } });
		setConsent({ analytics: true });
		resetMockEvents();
		mockSession.set({ ...signedOut, session: {}, isAnonymous: true });
		mockSupabase.getSession.mockResolvedValue({
			data: { session: { user: { id: 'u-anon', is_anonymous: true } } },
			error: null,
		});
		mockSupabase.updateUser.mockResolvedValue({ data: { user: { id: 'u-anon' } }, error: null });
		const result = await app('/auth/sign-up?convert=1');
		expect(screen.getByText(sl.auth.convert_note)).toBeOnTheScreen();
		// Google would start another user, so the reports would not come along.
		expect(screen.queryByRole('button', { name: sl.auth.google })).toBeNull();
		await type(sl.auth.name_label, 'Ana');
		await type(sl.auth.email_label, 'ana@primer.si');
		await type(sl.auth.password_label, 'mačka v škornjih');
		await press(sl.auth.signup_button);

		// One call: GoTrue sets the password before it mails the email_change link, so the link survives.
		expect(mockSupabase.updateUser.mock.calls).toEqual([
			[
				{ email: 'ana@primer.si', password: 'mačka v škornjih', data: { locale: 'sl', display_name: 'Ana' } },
				{ emailRedirectTo: expect.stringMatching(/auth\/callback\?type=signup$/) },
			],
		]);
		expect(mockSupabase.signUp).not.toHaveBeenCalled();
		expect(result.getPathname()).toBe('/auth/check-email');
		expect(screen.queryByText(sl.auth.check_set_password)).toBeNull();
		expect(getMockEvents()).toEqual([{ name: 'sign_up', params: { method: 'convert' } }]);
	});

	test('a session over 24 h old (reauthentication_needed) sends the address alone; its link sets the password', async () => {
		mockSession.set({ ...signedOut, session: {}, isAnonymous: true });
		mockSupabase.getSession.mockResolvedValue({
			data: { session: { user: { id: 'u-anon', is_anonymous: true } } },
			error: null,
		});
		mockSupabase.updateUser
			.mockResolvedValueOnce({
				data: {},
				error: new ApiError('UNAUTHENTICATED', 'x', { details: { auth_code: 'reauthentication_needed' } }),
			})
			.mockResolvedValue({ data: { user: { id: 'u-anon' } }, error: null });
		const result = await app('/auth/sign-up?convert=1');
		await type(sl.auth.name_label, 'Ana');
		await type(sl.auth.email_label, 'ana@primer.si');
		await type(sl.auth.password_label, 'mačka v škornjih');
		await press(sl.auth.signup_button);

		const setPassword = expect.stringMatching(/auth\/callback\?type=signup&next=%2Fauth%2Fnew-password$/);
		expect(mockSupabase.updateUser).toHaveBeenCalledTimes(2);
		expect(mockSupabase.updateUser).toHaveBeenLastCalledWith(
			{ email: 'ana@primer.si', data: { locale: 'sl', display_name: 'Ana' } },
			{ emailRedirectTo: setPassword }
		);
		expect(result.getPathname()).toBe('/auth/check-email');
		expect(screen.getByText(sl.auth.check_set_password)).toBeOnTheScreen();
	});

	test('"Pošlji znova" after that keeps the set-password link', async () => {
		mockSupabase.getSession.mockResolvedValue({
			data: { session: { user: { id: 'u-anon', is_anonymous: true } } },
			error: null,
		});
		mockSupabase.updateUser.mockResolvedValue({ data: { user: { id: 'u-anon' } }, error: null });
		await app('/auth/check-email?email=ana%40primer.si&convert=1&setPassword=1');
		expect(screen.getByText(sl.auth.check_set_password)).toBeOnTheScreen();
		await press(sl.auth.check_resend);
		await waitFor(() =>
			expect(mockSupabase.updateUser).toHaveBeenCalledWith(
				{ email: 'ana@primer.si' },
				{ emailRedirectTo: expect.stringMatching(/auth\/callback\?type=signup&next=%2Fauth%2Fnew-password$/) }
			)
		);
	});

	test("that link's fresh session (no reauthentication) sets the password on the new-password screen", async () => {
		mockSupabase.exchangeCodeForSession.mockResolvedValueOnce({ data: {}, error: null });
		const link = await app('/auth/callback?type=signup&code=abc&next=%2Fauth%2Fnew-password');
		expect(await screen.findByRole('heading', { name: sl.auth.setpass_title })).toBeOnTheScreen();
		expect(link.getPathname()).toBe('/auth/new-password');
		expect(screen.getByText(sl.auth.setpass_body)).toBeOnTheScreen();
		await type(sl.auth.newpass_label, 'č'.repeat(37));
		await press(sl.auth.newpass_button);
		expect(screen.getByText(sl.auth.error_password_long)).toBeOnTheScreen();
		mockSupabase.updateUser.mockResolvedValueOnce({ data: {}, error: null });
		await type(sl.auth.newpass_label, 'mačka v škornjih');
		await press(sl.auth.newpass_button);
		expect(mockSupabase.updateUser).toHaveBeenCalledWith({ password: 'mačka v škornjih' });
		expect(toast.success).toHaveBeenCalledWith(sl.auth.setpass_done);
	});

	test("the conversion's link is sent again by setting the address again; too soon is a toast", async () => {
		mockSupabase.getSession.mockResolvedValue({
			data: { session: { user: { id: 'u-anon', is_anonymous: true } } },
			error: null,
		});
		mockSupabase.updateUser.mockResolvedValue({ data: { user: { id: 'u-anon' } }, error: null });
		await app('/auth/check-email?email=ana%40primer.si&convert=1');
		await press(sl.auth.check_resend);
		await waitFor(() =>
			expect(mockSupabase.updateUser).toHaveBeenCalledWith(
				{ email: 'ana@primer.si' },
				{ emailRedirectTo: expect.stringMatching(/auth\/callback\?type=signup$/) }
			)
		);
		// resend() would find no user by the address (an anonymous user has none) and carry no PKCE.
		expect(mockSupabase.resend).not.toHaveBeenCalled();
	});

	test('"Spremeni e-naslov" goes back to the conversion form, so a resubmit converts again, never signs up', async () => {
		mockSession.set({ ...signedOut, session: {}, isAnonymous: true });
		mockSupabase.getSession.mockResolvedValue({
			data: { session: { user: { id: 'u-anon', is_anonymous: true } } },
			error: null,
		});
		mockSupabase.updateUser.mockResolvedValue({ data: { user: { id: 'u-anon' } }, error: null });
		const result = await app('/auth/sign-up?convert=1');
		await type(sl.auth.name_label, 'Ana');
		await type(sl.auth.email_label, 'ana@primer.si');
		await type(sl.auth.password_label, 'mačka v škornjih');
		await press(sl.auth.signup_button);
		expect(result.getPathname()).toBe('/auth/check-email');

		await press(sl.auth.check_change);
		expect(result.getPathname()).toBe('/auth/sign-up');
		expect(screen.getByText(sl.auth.convert_note)).toBeOnTheScreen();
		await type(sl.auth.email_label, 'ana.novak@primer.si');
		await press(sl.auth.signup_button);
		expect(mockSupabase.updateUser).toHaveBeenLastCalledWith(
			{ email: 'ana.novak@primer.si', password: 'mačka v škornjih', data: { locale: 'sl', display_name: 'Ana' } },
			expect.anything()
		);
		expect(mockSupabase.updateUser).toHaveBeenCalledTimes(2);
		expect(mockSupabase.signUp).not.toHaveBeenCalled();
		expect(result.getPathname()).toBe('/auth/check-email');
	});

	test('converting: a taken address, a long or weak password, the email limit; another session is refused', async () => {
		mockSession.set({ ...signedOut, session: {}, isAnonymous: true });
		mockSupabase.getSession.mockResolvedValue({
			data: { session: { user: { id: 'u-anon', is_anonymous: true } } },
			error: null,
		});
		await app('/auth/sign-up?convert=1');
		await type(sl.auth.name_label, 'Ana');
		await type(sl.auth.email_label, 'ana@primer.si');
		await type(sl.auth.password_label, 'mačka v škornjih');
		mockSupabase.updateUser.mockResolvedValueOnce({ data: {}, error: new ApiError('CONFLICT', 'CONFLICT') });
		await press(sl.auth.signup_button);
		expect(screen.getByText(sl.auth.convert_email_taken)).toBeOnTheScreen();
		expect(screen.getByRole('button', { name: sl.auth.to_signin })).toBeOnTheScreen();

		// Over 72 bytes ("č" counts 2) is refused on the form, before GoTrue.
		mockSupabase.updateUser.mockClear();
		await type(sl.auth.password_label, 'č'.repeat(37));
		await press(sl.auth.signup_button);
		expect(screen.getByText(sl.auth.error_password_long)).toBeOnTheScreen();
		expect(mockSupabase.updateUser).not.toHaveBeenCalled();

		// GoTrue's own policy (weak_password), stricter on the hosted project than the length checked here.
		await type(sl.auth.password_label, 'mačka v škornjih');
		mockSupabase.updateUser.mockResolvedValueOnce({
			data: {},
			error: new ApiError('VALIDATION', 'x', { details: { auth_code: 'weak_password' } }),
		});
		await press(sl.auth.signup_button);
		expect(screen.getByText(sl.auth.error_password_weak)).toBeOnTheScreen();

		// Signed in to an account meanwhile: its address and password are never touched.
		mockSupabase.updateUser.mockClear();
		mockSupabase.getSession.mockResolvedValue({
			data: { session: { user: { id: 'u-1', is_anonymous: false } } },
			error: null,
		});
		await press(sl.auth.signup_button);
		expect(await screen.findByText(sl.errors.UNAUTHENTICATED)).toBeOnTheScreen();
		expect(mockSupabase.updateUser).not.toHaveBeenCalled();
		expect(mockSupabase.signUp).not.toHaveBeenCalled();
	});

	test('converting: the email limit (one a minute) is the note with the wait, never retried behind the back', async () => {
		mockSession.set({ ...signedOut, session: {}, isAnonymous: true });
		mockSupabase.getSession.mockResolvedValue({
			data: { session: { user: { id: 'u-anon', is_anonymous: true } } },
			error: null,
		});
		mockSupabase.updateUser.mockResolvedValueOnce({
			data: {},
			error: new ApiError('RATE_LIMITED', 'x', { details: { auth_code: 'over_email_send_rate_limit' } }),
		});
		await app('/auth/sign-up?convert=1');
		await type(sl.auth.name_label, 'Ana');
		await type(sl.auth.email_label, 'ana@primer.si');
		await type(sl.auth.password_label, 'mačka v škornjih');
		await press(sl.auth.signup_button);
		expect(await screen.findByText(sl.auth.error_rate_limited)).toBeOnTheScreen();
		await press(sl.auth.signup_button);
		expect(mockSupabase.updateUser).toHaveBeenCalledTimes(1);
	});

	test('convert=1 without an anonymous session is the plain sign-up', async () => {
		mockSupabase.signUp.mockResolvedValueOnce({ data: {}, error: null });
		await app('/auth/sign-up?convert=1');
		expect(screen.queryByText(sl.auth.convert_note)).toBeNull();
		expect(screen.getByRole('button', { name: sl.auth.google })).toBeOnTheScreen();
		await type(sl.auth.name_label, 'Ana');
		await type(sl.auth.email_label, 'ana@primer.si');
		await type(sl.auth.password_label, 'mačka v škornjih');
		await press(sl.auth.signup_button);
		expect(mockSupabase.signUp).toHaveBeenCalled();
		expect(mockSupabase.updateUser).not.toHaveBeenCalled();
	});

	test('"Odpri e-pošto" opens the mail app', async () => {
		const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
		await app('/auth/check-email?email=ana%40primer.si');
		await press(sl.auth.check_open_mail);
		expect(openURL).toHaveBeenCalledWith('message:');
	});
});

describe('reset and email links', () => {
	test('forgot password always gives the same answer and asks for a recovery link back into the app', async () => {
		await app('/auth/forgot-password?email=ana%40primer.si');
		mockApiAuth.requestPasswordReset.mockResolvedValueOnce({});
		await press(sl.auth.forgot_button);
		expect(mockApiAuth.requestPasswordReset).toHaveBeenCalledWith('ana@primer.si', {
			redirectTo: expect.stringMatching(/auth\/callback\?type=recovery$/),
		});
		expect(screen.getByText(sl.auth.forgot_done)).toBeOnTheScreen();
	});

	test('a confirmation link signs in and shows "E-naslov je potrjen"', async () => {
		mockSupabase.exchangeCodeForSession.mockResolvedValueOnce({ data: {}, error: null });
		await app('/auth/callback?type=signup&code=abc');
		expect(mockSupabase.exchangeCodeForSession).toHaveBeenCalledWith('abc');
		expect(await screen.findByRole('heading', { name: sl.auth.verified_title })).toBeOnTheScreen();
		expect(screen.queryByRole('button', { name: sl.common.close })).toBeNull();
	});

	test('a reset link continues to the new password, which saves and confirms', async () => {
		mockSupabase.exchangeCodeForSession.mockResolvedValueOnce({ data: {}, error: null });
		const result = await app('/auth/callback?type=recovery&code=abc');
		expect(await screen.findByRole('heading', { name: sl.auth.newpass_title })).toBeOnTheScreen();
		expect(result.getPathname()).toBe('/auth/new-password');

		await type(sl.auth.newpass_label, 'kratko');
		await press(sl.auth.newpass_button);
		expect(screen.getByText(sl.auth.error_password_short)).toBeOnTheScreen();
		mockSupabase.updateUser.mockResolvedValueOnce({ data: {}, error: null });
		await type(sl.auth.newpass_label, 'mačka v škornjih');
		await press(sl.auth.newpass_button);
		expect(mockSupabase.updateUser).toHaveBeenCalledWith({ password: 'mačka v škornjih' });
		expect(toast.success).toHaveBeenCalledWith(sl.auth.newpass_done);
	});

	test('the new password screen without a recovery link goes to forgot password', async () => {
		const result = await app('/auth/new-password');
		expect(result.getPathname()).toBe('/auth/forgot-password');
	});

	test('a reset link that no longer works offers a new one', async () => {
		mockSupabase.exchangeCodeForSession.mockResolvedValueOnce({ data: {}, error: new ApiError('INTERNAL', 'x') });
		const result = await app('/auth/callback?type=recovery&code=used');
		expect(await screen.findByRole('heading', { name: sl.auth.link_failed_title })).toBeOnTheScreen();
		await press(sl.auth.forgot_button);
		expect(result.getPathname()).toBe('/auth/forgot-password');
	});
});

describe('Google', () => {
	test('a cancelled window is a quiet toast; a native ID token signs in and leaves', async () => {
		const result = await app();
		await press('Vpis');
		mockGoogleSignIn.mockResolvedValueOnce({ type: 'cancelled', data: null });
		await press(sl.auth.google);
		await waitFor(() => expect(toast).toHaveBeenCalledWith(sl.auth.provider_cancelled));
		expect(result.getPathname()).toBe('/auth/sign-in');

		mockGoogleSignIn.mockResolvedValueOnce({ type: 'success', data: { idToken: 'google-id-token' } });
		await press(sl.auth.google);
		await waitFor(() => expect(result.getPathname()).toBe('/'));
		expect(mockApiAuth.signInWithGoogle).toHaveBeenCalledWith({ idToken: 'google-id-token' });
	});
});

describe('provider sign-out', () => {
	test('clears the Google account and swallows its errors', async () => {
		mockGoogleSignOut.mockResolvedValueOnce(undefined);
		await signOutProviders();
		expect(mockGoogleSignOut).toHaveBeenCalledTimes(1);
		mockGoogleSignOut.mockRejectedValueOnce(new Error('no account'));
		await expect(signOutProviders()).resolves.toBeUndefined();
	});
});

describe('contextual gate', () => {
	test('signed out it offers sign-in; after it the step continues with its draft', async () => {
		const result = await app();
		await press('Objavi');
		expect(screen.getByRole('heading', { name: sl.auth.gate_title_report })).toBeOnTheScreen();
		expect(screen.getByText(sl.auth.gate_kept)).toBeOnTheScreen();

		await press(sl.auth.gate_signin);
		expect(result.getPathname()).toBe('/auth/sign-in');
		mockApiAuth.signInWithEmail.mockImplementationOnce(async () =>
			mockSession.set({ session: {}, me: { ...me }, gate: 'ok' })
		);
		await press(sl.auth.signin_button);

		expect(result.getPathname()).toBe('/');
		expect(screen.getByText('draft: Pes Luna')).toBeOnTheScreen();
		expect(mockReady).toHaveBeenCalledTimes(1);
	});

	test('an unconfirmed account gets the "Potrdite svoj e-naslov" variant with resend', async () => {
		mockSession.set({ session: {}, me: { ...me }, gate: 'verify' });
		await app();
		await press('Objavi');
		expect(screen.getByRole('heading', { name: sl.auth.gate_unverified_title })).toBeOnTheScreen();
		mockSupabase.resend.mockResolvedValueOnce({ data: {}, error: null });
		await press(sl.auth.gate_unverified_resend);
		expect(mockSupabase.resend).toHaveBeenCalledWith(expect.objectContaining({ type: 'signup', email: me.email }));
		expect(mockReady).not.toHaveBeenCalled();
	});

	test('with an account already, the action goes straight on', async () => {
		mockSession.set({ session: {}, me: { ...me }, gate: 'ok' });
		await app();
		await press('Objavi');
		expect(mockReady).toHaveBeenCalledTimes(1);
	});
});

describe('account', () => {
	beforeEach(() => mockSession.set({ session: {}, me: { ...me }, gate: 'ok' }));

	test('edits the name and the optional phone; a bad phone number says how to write it', async () => {
		await app('/settings/account');
		await type(sl.profile.row_phone, 'pokliči me');
		await press(sl.common.save);
		expect(screen.getByText(sl.profile.phone_invalid)).toBeOnTheScreen();
		expect(mockUpdateMe).not.toHaveBeenCalled();

		await type(sl.profile.name_label, ' Ana N. ');
		await type(sl.profile.row_phone, '041 123 456');
		mockUpdateMe.mockResolvedValueOnce({});
		await press(sl.common.save);
		expect(mockUpdateMe).toHaveBeenCalledWith({ display_name: 'Ana N.', phone: '041 123 456' });
		expect(toast.success).toHaveBeenCalledWith(sl.profile.saved);
		// The language row is here too (it works signed out on the Profile tab as well).
		expect(
			screen.getByRole('button', { name: `${sl.profile.row_language}, ${sl.nav.language_sl_full}` })
		).toBeOnTheScreen();
	});

	test('the home area row opens the home-area picker', async () => {
		const result = await app('/settings/account');
		await press(`${sl.profile.row_home_area}, ${sl.alerts.area_none}`);
		expect(result.getPathname()).toBe('/settings/home-area');
	});

	test('signed out, the account screens go back to Profile', async () => {
		mockSession.set(signedOut);
		const result = await app('/settings/account');
		expect(result.getPathname()).toBe('/profile');
	});
});
