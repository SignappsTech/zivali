// Loads the jest.setup Reanimated mock (with useReducedMotion) before expo-router's testing mocks register their own.
import 'react-native-reanimated';

import { PortalHost } from '@rn-primitives/portal';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { router, Stack } from 'expo-router';
import { renderRouter } from 'expo-router/testing-library';
import type { ReactNode } from 'react';
import { Linking } from 'react-native';

import en from '@zivali/i18n/dist/en.json';
import sl from '@zivali/i18n/dist/sl.json';
import TabsLayout from '@/app/(tabs)/_layout';
import InboxTab from '@/app/(tabs)/inbox';
import MapTab from '@/app/(tabs)/index';
import ProfileTab from '@/app/(tabs)/profile';
import ReportTab from '@/app/(tabs)/report';
import SettingsPlaceholder from '@/app/settings/[section]';
import ConsentSettings from '@/app/settings/consent';
import SettingsLayout from '@/app/settings/_layout';
import LanguageSettings from '@/app/settings/language';
import { PermissionNote, PermissionPrimer } from '@/components/shell/permission-primer';
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
jest.mock('@/lib/env', () => ({ env: { EXPO_PUBLIC_APP_URL: 'https://najdimo.test' } }));

// The auth helpers behind the Profile tab load the Supabase client; no call reaches it here.
const mockResend = jest.fn();
jest.mock('@/lib/supabase', () => ({ supabase: { auth: { resend: (...args: unknown[]) => mockResend(...args) } } }));

let mockSession = {
	session: null as object | null,
	me: null as object | null,
	isAnonymous: false,
	loading: false,
};
jest.mock('@zivali/api/auth', () => ({ useSession: () => mockSession }));
const mockSignOutAndWipe = jest.fn();
jest.mock('@/lib/offline/wipe', () => ({ signOutAndWipe: (options: unknown) => mockSignOutAndWipe(options) }));

const mockSignOutProviders = jest.fn();
jest.mock('@/lib/auth', () => ({
	...jest.requireActual('@/lib/auth'),
	signOutProviders: () => mockSignOutProviders(),
}));

const routes = {
	// The root Stack of app/_layout.tsx, without its fonts and store.
	_layout: () => <Stack screenOptions={{ headerShown: false }} />,
	'(tabs)/_layout': TabsLayout,
	'(tabs)/index': MapTab,
	'(tabs)/inbox': InboxTab,
	'(tabs)/report': ReportTab,
	'(tabs)/profile': ProfileTab,
	'settings/_layout': SettingsLayout,
	'settings/consent': ConsentSettings,
	'settings/language': LanguageSettings,
	'settings/[section]': SettingsPlaceholder,
	// Stand-ins for the flow and auth screens that later stories add.
	'report/lost': () => null,
	'report/found': () => null,
	'auth/sign-in': () => null,
	'auth/sign-up': () => null,
	'auth/check-email': () => null,
};

function Providers({ children }: { children: ReactNode }) {
	return (
		<I18nProvider>
			{children}
			<PortalHost />
		</I18nProvider>
	);
}

// renderRouter's result is a promise with the router getters attached; awaiting it would drop them.
const shell = async (initialUrl = '/') => {
	const result = renderRouter(routes, { initialUrl, wrapper: Providers });
	await result;
	return { getPathname: result.getPathname, getSearchParams: result.getSearchParams };
};

jest.setTimeout(60_000);

beforeEach(() => {
	mockStorage.clear();
	mockStorage.set('locale', 'sl');
	mockSession = { session: null, me: null, isAnonymous: false, loading: false };
	mockSignOutAndWipe.mockReset().mockResolvedValue(true);
});

describe('bottom navigation', () => {
	test('shows three tabs and the Prijavi action, signed out, and switches tabs', async () => {
		const result = await shell();

		expect(screen.getAllByRole('tab')).toHaveLength(3);
		expect(screen.getByRole('tab', { name: sl.nav.tab_map, selected: true })).toBeOnTheScreen();
		expect(screen.getByRole('tab', { name: sl.nav.tab_inbox, selected: false })).toBeOnTheScreen();
		expect(screen.getByRole('tab', { name: sl.nav.tab_profile, selected: false })).toBeOnTheScreen();
		// The Report action is a button, not a tab.
		expect(screen.getByRole('button', { name: sl.nav.tab_report_a11y })).toBeOnTheScreen();

		await fireEvent.press(screen.getByRole('tab', { name: sl.nav.tab_inbox }));
		expect(result.getPathname()).toBe('/inbox');
		expect(screen.getByRole('tab', { name: sl.nav.tab_inbox, selected: true })).toBeOnTheScreen();
	});

	test('Prijavi opens the Report sheet; a choice starts its flow and closes the sheet', async () => {
		const result = await shell();
		const action = screen.getByRole('button', { name: sl.nav.tab_report_a11y });

		await fireEvent.press(action);
		expect(action).toBeExpanded();
		expect(screen.getByRole('heading', { name: sl.nav.report_menu_title })).toBeOnTheScreen();

		await fireEvent.press(
			screen.getByRole('button', { name: `${sl.nav.report_sighted_title}, ${sl.nav.report_sighted_desc}` })
		);
		expect(action).toBeCollapsed();
		expect(result.getPathname()).toBe('/report/found');
		expect(result.getSearchParams()).toEqual({ type: 'sighted' });
	});
});

describe('signed-out tabs', () => {
	test('Inbox explains what appears there and offers sign-in', async () => {
		const result = await shell('/inbox');

		expect(screen.getByRole('heading', { name: sl.inbox.signed_out_title })).toBeOnTheScreen();
		expect(screen.getByText(sl.inbox.signed_out_body)).toBeOnTheScreen();
		await fireEvent.press(screen.getByRole('button', { name: sl.inbox.signed_out_sign_in }));
		expect(result.getPathname()).toBe('/auth/sign-in');
	});

	test('Profile has sign-in, the language sheet and cookie settings, which work signed out', async () => {
		const result = await shell('/profile');

		expect(screen.getByRole('heading', { name: sl.profile.signed_out_title })).toBeOnTheScreen();
		expect(screen.getByRole('button', { name: sl.profile.signed_out_create })).toBeOnTheScreen();

		await fireEvent.press(
			screen.getByRole('button', { name: `${sl.profile.row_language}, ${sl.nav.language_sl_full}` })
		);
		await fireEvent.press(screen.getByRole('radio', { name: en.nav.language_en_full }));
		expect(screen.getByRole('heading', { name: en.profile.signed_out_title })).toBeOnTheScreen();
		expect(mockStorage.get('locale')).toBe('en');

		await fireEvent.press(screen.getByRole('button', { name: en.profile.row_cookie_settings }));
		expect(result.getPathname()).toBe('/settings/consent');
		expect(screen.getByText(en.consent.necessary_locked)).toBeOnTheScreen();
	});
});

describe('signed in', () => {
	beforeEach(() => {
		mockSession = { session: {}, me: null, isAnonymous: false, loading: false };
	});

	test('Profile leads to the settings stack, and back returns to Profile', async () => {
		const result = await shell();
		await fireEvent.press(screen.getByRole('tab', { name: sl.nav.tab_profile }));

		expect(screen.getByRole('heading', { name: sl.profile.title })).toBeOnTheScreen();
		for (const [name, path] of [
			[sl.profile.row_alerts, '/settings/alerts'],
			[sl.alerts.channels_title, '/settings/notifications'],
			[sl.profile.row_payments, '/settings/payments'],
		]) {
			await fireEvent.press(screen.getByRole('button', { name }));
			expect(result.getPathname()).toBe(path);
			expect(screen.getByText(sl.common.empty_title)).toBeOnTheScreen();
			// The settings stack sits above the tabs, so the bottom navigation is gone until back.
			expect(screen.queryByRole('tab')).toBeNull();
			await act(() => router.back());
			expect(screen.getByRole('tab', { name: sl.nav.tab_profile, selected: true })).toBeOnTheScreen();
			expect(result.getPathname()).toBe('/profile');
		}
	});

	test('Profile shows the account header; an unconfirmed address can get a new link', async () => {
		mockSession.me = { display_name: 'Ana', email: 'ana@primer.si', email_verified: false };
		mockResend.mockResolvedValueOnce({ data: {}, error: null });
		const result = await shell('/profile');

		expect(screen.getByLabelText('Ana')).toBeOnTheScreen();
		expect(screen.getByText('ana@primer.si')).toBeOnTheScreen();
		expect(screen.getByText(sl.profile.email_unverified)).toBeOnTheScreen();
		await fireEvent.press(screen.getByRole('button', { name: sl.profile.email_send_link }));
		expect(mockResend).toHaveBeenCalledWith(expect.objectContaining({ type: 'signup', email: 'ana@primer.si' }));
		expect(result.getPathname()).toBe('/auth/check-email');
	});

	test('Profile marks a confirmed address as verified', async () => {
		mockSession.me = { display_name: 'Ana', email: 'ana@primer.si', email_verified: true };
		await shell('/profile');
		expect(screen.getByText(sl.profile.email_verified)).toBeOnTheScreen();
		expect(screen.queryByRole('button', { name: sl.profile.email_send_link })).toBeNull();
	});

	test('sign-out asks first and passes the remove-links choice to the wipe', async () => {
		await shell('/profile');

		await fireEvent.press(screen.getByRole('button', { name: sl.profile.sign_out }));
		expect(screen.getByRole('heading', { name: sl.profile.sign_out_title })).toBeOnTheScreen();
		await fireEvent.press(screen.getByRole('checkbox', { name: sl.profile.sign_out_remove_links }));
		const buttons = screen.getAllByRole('button', { name: sl.profile.sign_out_confirm });
		await fireEvent.press(buttons[buttons.length - 1]);

		expect(mockSignOutAndWipe).toHaveBeenCalledWith(expect.objectContaining({ removeManageLinks: true }));
		expect(mockSignOutProviders).toHaveBeenCalled();
	});

	test('the settings language screen switches the language', async () => {
		await shell('/settings/language');

		await fireEvent.press(screen.getByRole('radio', { name: en.nav.language_en_full }));
		expect(mockStorage.get('locale')).toBe('en');
	});
});

describe('permission primer', () => {
	const primer = (request: () => Promise<boolean>, onResult: (granted: boolean) => void) => (
		<Providers>
			<PermissionPrimer kind="camera" open request={request} onResult={onResult} />
		</Providers>
	);

	test('explains the permission and asks the OS only after "Allow"', async () => {
		const request = jest.fn().mockResolvedValue(true);
		const onResult = jest.fn();
		await render(primer(request, onResult));

		expect(screen.getByRole('heading', { name: sl.permissions.camera_title })).toBeOnTheScreen();
		expect(screen.getByText(sl.permissions.camera_body)).toBeOnTheScreen();
		expect(request).not.toHaveBeenCalled();

		await fireEvent.press(screen.getByRole('button', { name: sl.permissions.camera_allow }));
		expect(request).toHaveBeenCalledTimes(1);
		expect(onResult).toHaveBeenCalledWith(true);
	});

	test('"Ne zdaj" and a failed OS prompt both end in the fallback, without asking again', async () => {
		const request = jest.fn().mockRejectedValue(new Error('no activity'));
		const onResult = jest.fn();
		await render(primer(request, onResult));

		await fireEvent.press(screen.getByRole('button', { name: sl.permissions.not_now }));
		expect(request).not.toHaveBeenCalled();
		expect(onResult).toHaveBeenLastCalledWith(false);

		await fireEvent.press(screen.getByRole('button', { name: sl.permissions.camera_allow }));
		expect(onResult).toHaveBeenLastCalledWith(false);
	});

	test('the denied note names the alternative and opens the phone settings', async () => {
		const openSettings = jest.spyOn(Linking, 'openSettings').mockResolvedValue();
		await render(
			<Providers>
				<PermissionNote kind="location" />
			</Providers>
		);

		expect(screen.getByText(sl.permissions.location_denied)).toBeOnTheScreen();
		await fireEvent.press(screen.getByRole('button', { name: sl.permissions.open_settings }));
		expect(openSettings).toHaveBeenCalled();
	});
});
