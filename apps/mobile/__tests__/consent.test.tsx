import 'react-native-reanimated';

import { PortalHost } from '@rn-primitives/portal';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';
import type { ReactNode } from 'react';

import {
	getConsent,
	getMockEvents,
	initAnalytics,
	needsConsentPrompt,
	resetMockEvents,
	setConsent,
	trackScreen,
} from '@zivali/analytics';
import sl from '@zivali/i18n/dist/sl.json';
import ConsentSettings from '@/app/settings/consent';
import { ConsentSheet } from '@/components/shell/consent';
import { toast } from '@/components/ui/sonner';
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
jest.mock('@/components/ui/sonner', () => ({ toast: Object.assign(jest.fn(), { success: jest.fn() }) }));

const store = new Map<string, string>();
const storage = { get: () => store.get('zz_consent') ?? null, set: (v: string) => void store.set('zz_consent', v) };

const Providers = ({ children }: { children: ReactNode }) => (
	<I18nProvider>
		{children}
		<PortalHost />
	</I18nProvider>
);
const sheet = () =>
	render(
		<Providers>
			<ConsentSheet />
		</Providers>
	);

beforeEach(() => {
	mockStorage.set('locale', 'sl');
	store.clear();
	resetMockEvents();
	initAnalytics({ provider: 'mock', storage });
});

describe('consent sheet', () => {
	test('first launch: equal buttons, nothing stored until a choice', async () => {
		await sheet();
		expect(screen.getByRole('heading', { name: sl.consent.title })).toBeOnTheScreen();
		for (const name of [sl.consent.reject_all, sl.consent.accept_all, sl.consent.customise])
			expect(screen.getByRole('button', { name })).toBeOnTheScreen();
		expect(getConsent()).toBeNull();
	});

	test('Accept all grants and re-fires the current screen; the sheet closes', async () => {
		trackScreen('/profile');
		await sheet();
		await fireEvent.press(screen.getByRole('button', { name: sl.consent.accept_all }));
		expect(getConsent()).toMatchObject({ v: 1, analytics: true });
		expect(getMockEvents().map((e) => e.name)).toContain('screen_view');
		// The gorhom mock keeps a closed sheet mounted, so closing is the prompt no longer being due.
		expect(needsConsentPrompt()).toBe(false);
	});

	test('Reject all keeps collection off', async () => {
		trackScreen('/profile');
		await sheet();
		await fireEvent.press(screen.getByRole('button', { name: sl.consent.reject_all }));
		expect(getConsent()).toMatchObject({ analytics: false });
		expect(getMockEvents()).toHaveLength(0);
	});

	test('Customise starts with analytics off and saves the switch', async () => {
		await sheet();
		await fireEvent.press(screen.getByRole('button', { name: sl.consent.customise }));
		const analytics = screen.getByRole('switch', { name: sl.consent.analytics_switch_a11y });
		expect(analytics.props.accessibilityState?.checked ?? false).toBe(false);
		await fireEvent.press(analytics);
		await fireEvent.press(screen.getByRole('button', { name: sl.consent.save }));
		expect(getConsent()).toMatchObject({ analytics: true });
	});

	test('does not show for a current choice, shows again after 12 months', async () => {
		setConsent({ analytics: false });
		await sheet();
		expect(needsConsentPrompt()).toBe(false);

		const old = { v: 1, analytics: true, ts: new Date(Date.now() - 400 * 864e5).toISOString() };
		store.set('zz_consent', JSON.stringify(old));
		initAnalytics({ provider: 'mock', storage });
		expect(needsConsentPrompt()).toBe(true);
		await screen.unmount();
		await sheet();
		expect(screen.getByText(sl.consent.reask_year)).toBeOnTheScreen();
	});
});

// TASK-13.4 QA (AC#4): Profile -> Cookie settings changes or withdraws the choice as easily as it was given.
describe('Cookie settings screen', () => {
	jest.setTimeout(60_000);
	const settings = () =>
		renderRouter({ 'settings/consent': ConsentSettings }, { initialUrl: '/settings/consent', wrapper: Providers });

	test('shows the stored grant; one switch and Save withdraw it at once, with a toast', async () => {
		setConsent({ analytics: true });
		await settings();
		const analytics = screen.getByRole('switch', { name: sl.consent.analytics_switch_a11y });
		expect(analytics).toBeChecked();
		await fireEvent.press(analytics);
		await fireEvent.press(screen.getByRole('button', { name: sl.consent.save }));
		expect(getConsent()).toMatchObject({ v: 1, analytics: false });
		expect(toast.success).toHaveBeenCalledWith(sl.consent.saved_toast);
		resetMockEvents();
		trackScreen('/profile');
		expect(getMockEvents()).toHaveLength(0);
		expect(screen.getByRole('switch', { name: sl.consent.analytics_switch_a11y })).not.toBeChecked();
	});

	test('after a decline, Accept all grants at once; Reject all withdraws again', async () => {
		setConsent({ analytics: false });
		await settings();
		expect(screen.getByRole('switch', { name: sl.consent.analytics_switch_a11y })).not.toBeChecked();
		await fireEvent.press(screen.getByRole('button', { name: sl.consent.accept_all }));
		expect(getConsent()).toMatchObject({ analytics: true });
		resetMockEvents();
		trackScreen('/profile');
		expect(getMockEvents().map((e) => e.name)).toContain('screen_view');
		await fireEvent.press(screen.getByRole('button', { name: sl.consent.reject_all }));
		expect(getConsent()).toMatchObject({ analytics: false });
		resetMockEvents();
		trackScreen('/map');
		expect(getMockEvents()).toHaveLength(0);
	});

	test('an expired grant shows the switch off: the stored choice is not treated as current', async () => {
		store.set(
			'zz_consent',
			JSON.stringify({ v: 1, analytics: true, ts: new Date(Date.now() - 400 * 864e5).toISOString() })
		);
		initAnalytics({ provider: 'mock', storage });
		await settings();
		expect(screen.getByRole('switch', { name: sl.consent.analytics_switch_a11y })).not.toBeChecked();
	});
});
