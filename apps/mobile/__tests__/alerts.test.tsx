// Loads the jest.setup Reanimated mock (with useReducedMotion) before expo-router's testing mocks register their own.
import 'react-native-reanimated';

import { PortalHost } from '@rn-primitives/portal';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Stack } from 'expo-router';
import { renderRouter } from 'expo-router/testing-library';
import * as React from 'react';
import { Provider } from 'react-redux';

import { getMockEvents, initAnalytics, resetMockEvents, setConsent } from '@zivali/analytics';
import { alertSubscription } from '@zivali/api/__fixtures__/notifications';
import { createMockApi, mockError, type MockRequest, type MockRoutes } from '@zivali/api/mock';
import { type ApiStore, createApiStore } from '@zivali/api/rtk';
import sl from '@zivali/i18n/dist/sl.json';
import type { AlertSubscription, AlertSubscriptionInput, LatLng } from '@zivali/types';
import AlertSettings from '@/app/settings/alerts';
import HomeAreaSettings from '@/app/settings/home-area';
import { toast } from '@/components/ui/sonner';
import { distanceKm } from '@/lib/geo';
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
jest.mock('@/components/ui/sonner', () => ({
	toast: Object.assign(jest.fn(), { success: jest.fn(), error: jest.fn() }),
}));
jest.mock('@/lib/auth', () => ({
	providers: { google: false, apple: false },
	signInWithProvider: jest.fn(),
	resendConfirmation: jest.fn(),
	openMailApp: jest.fn(),
}));
// The loading and error parts come from the inbox view, which also imports push and Realtime.
jest.mock('@/lib/push', () => ({}));
jest.mock('@/lib/supabase', () => ({ supabase: {} }));
// The picker (home area): coarsening randomness, GPS and network state.
jest.mock('expo-crypto', () => ({
	getRandomValues: (array: Uint32Array) => jest.requireActual('node:crypto').getRandomValues(array),
}));
jest.mock('expo-location', () => ({
	Accuracy: { High: 4 },
	getForegroundPermissionsAsync: jest.fn(),
	requestForegroundPermissionsAsync: jest.fn(),
	getCurrentPositionAsync: jest.fn(),
}));
jest.mock('expo-network', () => ({
	useNetworkState: () => ({}),
	getNetworkStateAsync: async () => ({}),
	addNetworkStateListener: () => ({ remove: () => undefined }),
	NetworkStateType: { WIFI: 'WIFI', ETHERNET: 'ETHERNET' },
}));
const mockSiska = { label: 'Šiška, Ljubljana', lat: 46.0739, lng: 14.4851, kind: 'district', municipality_slug: 'x' };
jest.mock('@zivali/api/geocode', () => ({
	PLACE_SEARCH_MIN_CHARS: 3,
	usePlaceSearch: () => ({ places: [], isFetching: false }),
	useReversePlaceQuery: () => ({ data: mockSiska, currentData: mockSiska }),
}));

const HOME: LatLng = alertSubscription.center; // the profile's home area and the subscription agree
const ME = { display_name: 'Ana', email: 'ana@primer.si', email_verified: true, home: HOME as LatLng | null };
let mockMe: typeof ME & { home_radius_km: number };
jest.mock('@zivali/api/auth', () => ({
	// AuthGate asks for a verified account; the screens only for a signed-in one.
	useRequireAuth: (require?: { verified?: boolean }) => ({
		session: {},
		me: mockMe,
		isAnonymous: false,
		isVerified: mockMe.email_verified,
		loading: false,
		gate: require?.verified && !mockMe.email_verified ? 'verify' : 'ok',
	}),
}));

// A fresh mock API and store per test, over the real client; the subscription lives in `mockSub`.
let store: ApiStore;
let calls: MockRequest[];
let mockSub: AlertSubscription | null;
function serve(routes: MockRoutes = {}) {
	const client = createMockApi({
		'GET /v1/alert-subscription': () => mockSub,
		'PUT /v1/alert-subscription': ({ body }) =>
			(mockSub = { ...alertSubscription, ...(body as AlertSubscriptionInput) }),
		'DELETE /v1/alert-subscription': () => void (mockSub = null),
		'PATCH /v1/me': ({ body }) => ({ ...mockMe, ...(body as object) }),
		...routes,
	});
	calls = client.calls;
	store = createApiStore(client);
}
const sent = (method: string, path: string) =>
	calls.filter((call) => call.method === method && call.path === path).map((call) => call.body);
const lastPut = () => sent('PUT', '/v1/alert-subscription').at(-1) as AlertSubscriptionInput;
const optIns = () => getMockEvents().filter((event) => event.name === 'alert_opt_in');

function Providers({ children }: { children: React.ReactNode }) {
	return (
		<Provider store={store}>
			<I18nProvider>
				{children}
				<PortalHost />
			</I18nProvider>
		</Provider>
	);
}
const open = async (initialUrl = '/settings/alerts') => {
	const result = renderRouter(
		{
			_layout: () => <Stack screenOptions={{ headerShown: false }} />,
			index: () => null,
			profile: () => null,
			'settings/alerts': AlertSettings,
			'settings/home-area': HomeAreaSettings,
		},
		{ initialUrl, wrapper: Providers }
	);
	// The result is a promise with the router getters attached; awaiting it would drop them.
	await result;
	return { getPathname: result.getPathname };
};
const control = (role: 'switch' | 'checkbox' | 'adjustable', name: string) => screen.getByRole(role, { name });
const master = () => screen.findByRole('switch', { name: sl.alerts.master_label });
/** The user pans the picker map and lets go with the pin over `point`. */
const panTo = async (point: LatLng) => {
	const map = screen.getByTestId('map-native', { includeHiddenElements: true });
	const region = { nativeEvent: { center: [point.lng, point.lat], zoom: 13, bounds: [0, 0, 0, 0] } };
	await act(async () => map.props.onRegionWillChange(region));
	await act(async () => map.props.onRegionDidChange(region));
};

beforeEach(() => {
	jest.clearAllMocks();
	mockStorage.set('locale', 'sl');
	resetMockEvents();
	mockMe = { ...ME, home_radius_km: 5 };
	mockSub = null;
	const consent = new Map<string, string>();
	initAnalytics({
		provider: 'mock',
		storage: { get: () => consent.get('c') ?? null, set: (value) => void consent.set('c', value) },
	});
	serve();
});

describe('nearby alert settings (P13)', () => {
	test('off shows only the master switch; on saves the home area with dogs and cats and shows the settings', async () => {
		await open();
		expect(await master()).not.toBeChecked();
		expect((await master()).props.accessibilityHint).toBe(sl.alerts.master_help);
		expect(screen.getByText(sl.alerts.master_help)).toBeOnTheScreen();
		expect(screen.queryByRole('switch', { name: sl.alerts.pause_label })).toBeNull();

		await fireEvent.press(await master());
		await waitFor(() => expect(control('switch', sl.alerts.master_label)).toBeChecked());
		expect(sent('PUT', '/v1/alert-subscription')).toEqual([
			{ center: HOME, radius_km: 5, species: ['dog', 'cat'], paused: false },
		]);
		expect(toast.success).toHaveBeenCalledWith(sl.profile.saved);

		expect(screen.getByText(sl.alerts.area_label)).toBeOnTheScreen();
		expect(screen.getByText('Šiška, Ljubljana, 5 km')).toBeOnTheScreen();
		expect(screen.getByRole('button', { name: sl.alerts.area_change })).toBeOnTheScreen();
		expect(control('adjustable', sl.alerts.radius_label).props.accessibilityValue).toMatchObject({
			min: 0,
			max: 9,
			text: '5 km',
		});
		expect(screen.getByText(sl.alerts.species_label)).toBeOnTheScreen();
		expect(control('checkbox', sl.alerts.species_dogs)).toBeChecked();
		expect(control('checkbox', sl.alerts.species_cats)).toBeChecked();
		expect(control('switch', sl.alerts.pause_label)).not.toBeChecked();
		expect(control('switch', sl.alerts.pause_label).props.accessibilityHint).toBe(sl.alerts.pause_help);
	});

	test('alert_opt_in fires on opt-in only with analytics consent, and never carries the area', async () => {
		await open();
		await fireEvent.press(await master());
		await waitFor(() => expect(control('switch', sl.alerts.master_label)).toBeChecked());
		expect(optIns()).toEqual([]);

		setConsent({ analytics: true });
		await fireEvent.press(await master());
		await waitFor(() => expect(control('switch', sl.alerts.master_label)).not.toBeChecked());
		expect(sent('DELETE', '/v1/alert-subscription')).toHaveLength(1);
		await fireEvent.press(await master());
		await waitFor(() => expect(control('switch', sl.alerts.master_label)).toBeChecked());
		expect(optIns()).toEqual([{ name: 'alert_opt_in', params: {} }]);

		// Pausing or changing them is not an opt-in.
		await fireEvent.press(control('switch', sl.alerts.pause_label));
		await waitFor(() => expect(control('switch', sl.alerts.pause_label)).toBeChecked());
		expect(optIns()).toHaveLength(1);
	});

	test('an unconfirmed email gets the confirm prompt and nothing is saved', async () => {
		mockMe = { ...mockMe, email_verified: false };
		await open();
		const toggle = await master();
		await fireEvent.press(toggle);
		expect(await screen.findByText(sl.auth.gate_unverified_title)).toBeOnTheScreen();
		expect(toggle).not.toBeChecked();
		expect(sent('PUT', '/v1/alert-subscription')).toEqual([]);
		expect(optIns()).toEqual([]);
	});

	test('pause, animals and radius save at once; the only chosen animal stays chosen; off deletes', async () => {
		mockSub = { ...alertSubscription };
		await open();
		expect(await master()).toBeChecked();

		await fireEvent.press(control('switch', sl.alerts.pause_label));
		await waitFor(() => expect(control('switch', sl.alerts.pause_label)).toBeChecked());
		expect(lastPut()).toEqual({ center: HOME, radius_km: 5, species: ['dog', 'cat'], paused: true });

		await fireEvent.press(control('checkbox', sl.alerts.species_cats));
		await waitFor(() => expect(control('checkbox', sl.alerts.species_cats)).not.toBeChecked());
		expect(lastPut()).toMatchObject({ species: ['dog'], paused: true });
		expect(control('checkbox', sl.alerts.species_dogs)).toBeChecked();
		expect(control('checkbox', sl.alerts.species_dogs)).toBeDisabled();

		// One screen-reader step (or letting go after a drag) saves once, to the subscription and the profile.
		await fireEvent(control('adjustable', sl.alerts.radius_label), 'accessibilityAction', {
			nativeEvent: { actionName: 'increment' },
		});
		await waitFor(() => expect(lastPut()).toMatchObject({ radius_km: 7, species: ['dog'] }));
		expect(sent('PATCH', '/v1/me')).toEqual([{ home_radius_km: 7 }]);
		await waitFor(() => expect(screen.getByText('Šiška, Ljubljana, 7 km')).toBeOnTheScreen());
		expect(control('adjustable', sl.alerts.radius_label).props.accessibilityValue).toMatchObject({ text: '7 km' });

		await fireEvent.press(await master());
		await waitFor(() => expect(screen.queryByRole('switch', { name: sl.alerts.pause_label })).toBeNull());
		expect(sent('DELETE', '/v1/alert-subscription')).toHaveLength(1);
		expect(sent('PUT', '/v1/alert-subscription')).toHaveLength(3);
	});

	test('dragging the radius shows each stop and saves once, where the finger lets go', async () => {
		mockSub = { ...alertSubscription };
		await open();
		const slider = () => control('adjustable', sl.alerts.radius_label);
		await screen.findByRole('adjustable', { name: sl.alerts.radius_label });
		// 328 px wide: the 28 px thumb travels 300 px over the 10 stops.
		await fireEvent(slider(), 'layout', { nativeEvent: { layout: { width: 328, height: 44 } } });
		const at = (index: number) => ({ nativeEvent: { locationX: 14 + (300 * index) / 9 } });
		await fireEvent(slider(), 'responderGrant', at(5));
		await fireEvent(slider(), 'responderMove', at(9));
		expect(slider().props.accessibilityValue).toMatchObject({ text: '25 km' });
		expect(sent('PUT', '/v1/alert-subscription')).toEqual([]);

		await fireEvent(slider(), 'responderRelease', at(9));
		await waitFor(() => expect(sent('PUT', '/v1/alert-subscription')).toHaveLength(1));
		expect(lastPut()).toMatchObject({ radius_km: 25 });
		await waitFor(() => expect(sent('PATCH', '/v1/me')).toEqual([{ home_radius_km: 25 }]));
	});

	test('a refused change moves the control back and says why', async () => {
		mockSub = { ...alertSubscription };
		serve({ 'PUT /v1/alert-subscription': () => mockError('INTERNAL') });
		await open();
		await fireEvent.press(await screen.findByRole('switch', { name: sl.alerts.pause_label }));
		await waitFor(() => expect(toast.error).toHaveBeenCalledWith(sl.errors.INTERNAL));
		await waitFor(() => expect(control('switch', sl.alerts.pause_label)).not.toBeChecked());
	});

	test('without a home area, turning on opens the picker and its save turns alerts on at the coarsened point', async () => {
		mockMe = { ...mockMe, home: null };
		setConsent({ analytics: true });
		const result = await open();
		await fireEvent.press(await master());
		await waitFor(() => expect(result.getPathname()).toBe('/settings/home-area'));
		expect(screen.getByRole('heading', { name: sl.location.title_alert })).toBeOnTheScreen();

		const raw = { lat: 46.0702, lng: 14.4875 };
		await panTo(raw);
		await fireEvent.press(screen.getByRole('button', { name: sl.location.save_area }));
		await waitFor(() => expect(result.getPathname()).toBe('/settings/alerts'));

		const put = lastPut();
		const [patch] = sent('PATCH', '/v1/me') as { home: LatLng; home_radius_km: number }[];
		// C6: one coarsened point (20–30 m from the raw one) for both; the raw point is never sent.
		expect(put).toEqual({ center: patch!.home, radius_km: 5, species: ['dog', 'cat'], paused: false });
		expect(patch!.home_radius_km).toBe(5);
		const metres = distanceKm(put.center, raw) * 1000;
		expect(metres).toBeGreaterThanOrEqual(19.9);
		expect(metres).toBeLessThanOrEqual(30.1);
		expect(optIns()).toEqual([{ name: 'alert_opt_in', params: {} }]);
		expect(toast.success).toHaveBeenCalledWith(sl.profile.saved);
		await waitFor(() => expect(control('switch', sl.alerts.master_label)).toBeChecked());
	});

	test('"Spremeni" re-opens the stored area; saving it unmoved sends the stored centre back as is', async () => {
		mockSub = { ...alertSubscription, radius_km: 10 };
		const result = await open();
		await fireEvent.press(await screen.findByRole('button', { name: sl.alerts.area_change }));
		await waitFor(() => expect(result.getPathname()).toBe('/settings/home-area'));
		expect(control('adjustable', sl.location.alert_radius_label).props.accessibilityValue).toMatchObject({
			text: '10 km',
		});

		await fireEvent.press(screen.getByRole('button', { name: sl.location.save_area }));
		await waitFor(() => expect(result.getPathname()).toBe('/settings/alerts'));
		// Not coarsened again: no random walk of the stored point on every save.
		expect(lastPut()).toEqual({ center: HOME, radius_km: 10, species: ['dog', 'cat'], paused: false });
		expect(sent('PATCH', '/v1/me')).toEqual([{ home_radius_km: 10 }]);
		expect(optIns()).toEqual([]);
	});
});
