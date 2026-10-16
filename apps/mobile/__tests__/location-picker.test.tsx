import { act, fireEvent, render, screen } from '@testing-library/react-native';
import * as Location from 'expo-location';
import { Linking } from 'react-native';
import { IntlProvider } from 'use-intl';

import sl from '@zivali/i18n/dist/sl.json';
import DevPickerScreen from '@/app/dev/picker';
import { LocationPicker, type LocationPickerProps } from '@/components/location/location-picker';
import { distanceKm } from '@/lib/geo';

jest.mock('@/lib/env', () => ({ env: { EXPO_PUBLIC_APP_URL: 'https://najdimo.test' } }));
jest.mock('expo-crypto', () => ({
	getRandomValues: (array: Uint32Array) => jest.requireActual('node:crypto').getRandomValues(array),
}));
jest.mock('expo-location', () => ({
	Accuracy: { High: 4 },
	getForegroundPermissionsAsync: jest.fn(),
	requestForegroundPermissionsAsync: jest.fn(),
	getCurrentPositionAsync: jest.fn(),
}));
let mockNetwork: { isConnected?: boolean; isInternetReachable?: boolean } = {};
jest.mock('expo-network', () => ({
	useNetworkState: () => mockNetwork,
	getNetworkStateAsync: async () => mockNetwork,
	addNetworkStateListener: () => ({ remove: () => undefined }),
	NetworkStateType: { WIFI: 'WIFI', ETHERNET: 'ETHERNET' },
}));

type Place = { label: string; lat: number; lng: number; kind: string; municipality_slug: string };
const SISKA: Place = {
	label: 'Šiška, Ljubljana',
	lat: 46.0739,
	lng: 14.4851,
	kind: 'district',
	municipality_slug: 'x',
};
const TRUBARJEVA: Place = {
	label: 'Trubarjeva cesta 5, Ljubljana',
	lat: 46.05169,
	lng: 14.50701,
	kind: 'address',
	municipality_slug: 'ljubljana',
};
let mockSearch = { places: [] as Place[], isFetching: false, searched: false, error: undefined as unknown };
const mockReverse = jest.fn((_arg: unknown): { currentData?: Place | null; isError?: boolean } => ({
	currentData: SISKA,
}));
jest.mock('@zivali/api/geocode', () => ({
	PLACE_SEARCH_MIN_CHARS: 3,
	usePlaceSearch: (q: string) => (q.trim().length >= 3 ? mockSearch : { places: [], isFetching: false }),
	useReversePlaceQuery: (arg: unknown) => mockReverse(arg),
}));

const { __refs: refs } = jest.requireMock<{ __refs: { camera: { easeTo: jest.Mock } } }>(
	'@maplibre/maplibre-react-native'
);

const RAW = { lat: 46.0702, lng: 14.4875 };
const ui = (props: Partial<LocationPickerProps> = {}) => (
	<IntlProvider locale="sl" messages={sl}>
		<LocationPicker mode="lost" onChange={jest.fn()} {...props} />
	</IntlProvider>
);
const hidden = (testID: string) => screen.getByTestId(testID, { includeHiddenElements: true });
const native = () => hidden('map-native');
const region = (point: { lat: number; lng: number }, zoom = 14) => ({
	nativeEvent: { center: [point.lng, point.lat], zoom, bounds: [0, 0, 0, 0] },
});
/** The user pans the map and lets go with the pin over `point`. */
const panTo = async (point: { lat: number; lng: number }, zoom?: number) => {
	await act(async () => native().props.onRegionWillChange(region(point, zoom)));
	await act(async () => native().props.onRegionDidChange(region(point, zoom)));
};
const press = (name: string) => fireEvent.press(screen.getByRole('button', { name }));
const confirmed = (onChange: jest.Mock) =>
	onChange.mock.calls.at(-1)![0] as Parameters<LocationPickerProps['onChange']>[0];
const metres = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => distanceKm(a, b) * 1000;

beforeEach(() => {
	jest.clearAllMocks();
	mockNetwork = {};
	mockSearch = { places: [], isFetching: false, searched: false, error: undefined };
	mockReverse.mockImplementation(() => ({ currentData: SISKA }));
	jest.mocked(Location.getForegroundPermissionsAsync).mockResolvedValue({
		granted: true,
		canAskAgain: true,
	} as never);
	jest.mocked(Location.getCurrentPositionAsync).mockResolvedValue({
		coords: { latitude: 46.0551, longitude: 14.5122 },
	} as never);
});

describe('LocationPicker', () => {
	it('shows the lost question, search, the centre pin over the map, the radius and the privacy line', async () => {
		await render(ui());
		expect(screen.getByRole('heading', { name: sl.location.title_lost })).toBeOnTheScreen();
		expect(screen.getByLabelText(sl.location.search_label)).toHaveProp(
			'placeholder',
			sl.location.search_placeholder
		);
		const map = screen.getByRole('button', { name: sl.location.pin_a11y });
		expect(map.props.accessibilityHint).toBe(sl.location.nudge_show);
		expect(hidden('picker-pin')).toBeTruthy();
		expect(hidden('picker-disc')).toBeTruthy();
		expect(screen.getByRole('adjustable', { name: sl.location.radius_label })).toHaveProp('accessibilityValue', {
			min: 0,
			max: 13,
			now: 3,
			text: 'Polmer 500 m',
		});
		expect(screen.getByText(sl.location.radius_help)).toBeOnTheScreen();
		expect(screen.getByText(sl.location.privacy_lost)).toBeOnTheScreen();
		expect(screen.getByText('Šiška, Ljubljana')).toBeOnTheScreen();
		expect(screen.getByRole('button', { name: sl.location.confirm })).toBeEnabled();
	});

	it('confirms the point coarsened 20–30 m once, never the raw one, for pin, GPS, search and EXIF alike', async () => {
		const onChange = jest.fn();
		mockSearch = { places: [TRUBARJEVA], isFetching: false, searched: true, error: undefined };
		const EXIF = { lat: 46.0612, lng: 14.5021 };
		await render(ui({ onChange, suggested: { ...EXIF, source: 'exif' } }));

		const check = (raw: { lat: number; lng: number }, source: string) => {
			const value = confirmed(onChange);
			expect(value.source).toBe(source);
			expect(value.radiusM).toBe(500);
			expect(value.point).not.toEqual(raw);
			expect(metres(value.point, raw)).toBeGreaterThanOrEqual(19.9);
			expect(metres(value.point, raw)).toBeLessThanOrEqual(30.1);
			expect(Object.keys(value.point).sort()).toEqual(['lat', 'lng']);
		};

		await panTo(RAW);
		await press(sl.location.confirm);
		check(RAW, 'pin');

		await press(sl.location.use_my_location);
		const fix = { lat: 46.0551, lng: 14.5122 };
		expect(refs.camera.easeTo).toHaveBeenLastCalledWith(expect.objectContaining({ center: [fix.lng, fix.lat] }));
		await act(async () => native().props.onRegionDidChange(region(fix)));
		await press(sl.location.confirm);
		check(fix, 'gps');

		await fireEvent.changeText(screen.getByLabelText(sl.location.search_label), 'trubarjeva 5');
		await press(TRUBARJEVA.label);
		await press(sl.location.confirm);
		check(TRUBARJEVA, 'search');

		await press(sl.location.use_photo_location);
		await press(sl.location.confirm);
		check(EXIF, 'exif');

		// The raw point never reaches onChange: every call carried a coarsened one.
		expect(onChange).toHaveBeenCalledTimes(4);
		for (const raw of [RAW, fix, TRUBARJEVA, EXIF])
			for (const [value] of onChange.mock.calls) expect(value.point).not.toEqual({ lat: raw.lat, lng: raw.lng });
	});

	it('lifts the pin and says it is looking up the place while the map moves, then names it', async () => {
		await render(ui({ mode: 'found' }));
		await act(async () => native().props.onRegionWillChange(region(RAW)));
		expect(screen.getByText(sl.location.address_loading)).toBeOnTheScreen();
		await act(async () => native().props.onRegionDidChange(region(RAW)));
		expect(mockReverse).toHaveBeenLastCalledWith({ lat: RAW.lat, lng: RAW.lng });
		expect(screen.getByText('Šiška, Ljubljana')).toBeOnTheScreen();
		expect(screen.queryByTestId('picker-disc', { includeHiddenElements: true })).toBeNull();
		expect(screen.getByText(sl.location.privacy_found)).toBeOnTheScreen();
	});

	it('shows the non-blocking outside-Slovenia note when the reverse lookup finds no municipality', async () => {
		mockReverse.mockImplementation(() => ({ currentData: null }));
		await render(ui({ mode: 'sighted' }));
		await panTo({ lat: 45.9405, lng: 13.618 });
		expect(screen.getByText(sl.location.outside_si)).toBeOnTheScreen();
		expect(screen.getByText(sl.location.address_unknown)).toBeOnTheScreen();
		expect(screen.getByRole('button', { name: sl.location.confirm })).toBeEnabled();
	});

	it('asks through the P2 primer before the OS prompt, then flies to the fix', async () => {
		jest.mocked(Location.getForegroundPermissionsAsync).mockResolvedValue({
			granted: false,
			canAskAgain: true,
		} as never);
		jest.mocked(Location.requestForegroundPermissionsAsync).mockResolvedValue({ granted: true } as never);
		await render(ui());
		await press(sl.location.use_my_location);
		expect(Location.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
		expect(Location.getCurrentPositionAsync).not.toHaveBeenCalled();

		await press(sl.permissions.location_allow);
		expect(Location.requestForegroundPermissionsAsync).toHaveBeenCalledTimes(1);
		expect(Location.getCurrentPositionAsync).toHaveBeenCalledWith({ accuracy: Location.Accuracy.High });
		expect(refs.camera.easeTo).toHaveBeenLastCalledWith(expect.objectContaining({ center: [14.5122, 46.0551] }));
	});

	it('with the permission denied, explains it, links to the settings, and search and the pin still work', async () => {
		const openSettings = jest.spyOn(Linking, 'openSettings').mockResolvedValue();
		const onChange = jest.fn();
		mockSearch = { places: [TRUBARJEVA], isFetching: false, searched: true, error: undefined };
		await render(ui({ mode: 'found', permissionDenied: true, onChange }));

		expect(screen.getByText(sl.location.gps_denied)).toBeOnTheScreen();
		expect(screen.queryByRole('button', { name: sl.location.use_my_location })).toBeNull();
		await press(sl.permissions.open_settings);
		expect(openSettings).toHaveBeenCalled();

		await fireEvent.changeText(screen.getByLabelText(sl.location.search_label), 'trubarjeva');
		await press(TRUBARJEVA.label);
		expect(refs.camera.easeTo).toHaveBeenLastCalledWith(
			expect.objectContaining({ center: [TRUBARJEVA.lng, TRUBARJEVA.lat] })
		);
		await panTo(RAW);
		await press(sl.location.confirm);
		expect(confirmed(onChange).source).toBe('pin');
	});

	it('falls back to the same note when the OS refuses for good', async () => {
		jest.mocked(Location.getForegroundPermissionsAsync).mockResolvedValue({
			granted: false,
			canAskAgain: false,
		} as never);
		await render(ui());
		await press(sl.location.use_my_location);
		expect(screen.getByText(sl.location.gps_denied)).toBeOnTheScreen();
		expect(screen.getByRole('button', { name: sl.permissions.open_settings })).toBeOnTheScreen();
		expect(Location.getCurrentPositionAsync).not.toHaveBeenCalled();
	});

	it('says so when no fix comes, and keeps "Uporabi mojo lokacijo" to try again', async () => {
		jest.mocked(Location.getCurrentPositionAsync).mockRejectedValueOnce(new Error('unavailable'));
		await render(ui({ mode: 'sighted' }));
		await press(sl.location.use_my_location);
		expect(screen.getByText(sl.location.gps_denied)).toBeOnTheScreen();
		expect(screen.queryByRole('button', { name: sl.permissions.open_settings })).toBeNull();
		await press(sl.location.use_my_location);
		expect(screen.queryByText(sl.location.gps_denied)).toBeNull();
		expect(refs.camera.easeTo).toHaveBeenCalledTimes(1);
	});

	it('lists results while searching (map hidden), and says so when nothing matches', async () => {
		mockSearch = { places: [], isFetching: true, searched: false, error: undefined };
		const { rerender } = await render(ui());
		const field = screen.getByLabelText(sl.location.search_label);
		await fireEvent.changeText(field, 'Rožna d');
		expect(screen.getByText(sl.location.searching)).toBeOnTheScreen();
		expect(screen.queryByRole('button', { name: sl.location.pin_a11y })).toBeNull();

		mockSearch = { places: [TRUBARJEVA], isFetching: false, searched: true, error: undefined };
		await rerender(ui());
		expect(screen.getByRole('button', { name: TRUBARJEVA.label })).toBeOnTheScreen();
		expect(screen.getByText(/Geodetska uprava Republike Slovenije/)).toBeOnTheScreen();
		expect(screen.getByText(/15\. 10\. 2026/)).toBeOnTheScreen();

		mockSearch = { places: [], isFetching: false, searched: true, error: undefined };
		await rerender(ui());
		expect(screen.getByText(sl.location.no_results)).toBeOnTheScreen();
		expect(screen.getByRole('button', { name: sl.location.pin_a11y })).toBeOnTheScreen();

		await press(sl.location.search_clear);
		expect(field).toHaveProp('value', '');
	});

	it('steps the radius, warns from 3 km and zooms out to keep the disc in view', async () => {
		const onChange = jest.fn();
		await render(ui({ onChange }));
		const slider = screen.getByRole('adjustable', { name: sl.location.radius_label });
		await fireEvent(slider, 'accessibilityAction', { nativeEvent: { actionName: 'increment' } });
		expect(slider.props.accessibilityValue.text).toBe('Polmer 750 m');
		for (let i = 0; i < 5; i++)
			await fireEvent(slider, 'accessibilityAction', { nativeEvent: { actionName: 'increment' } });
		expect(slider.props.accessibilityValue.text).toBe('Polmer 3 km');
		expect(screen.getByText(sl.location.radius_large_warning)).toBeOnTheScreen();
		expect(screen.queryByText(sl.location.radius_help)).toBeNull();
		expect(refs.camera.easeTo).toHaveBeenCalled();

		await fireEvent(slider, 'accessibilityAction', { nativeEvent: { actionName: 'increment' } });
		expect(slider.props.accessibilityValue.text).toBe('Polmer 3,5 km');
		await press(sl.location.confirm);
		expect(confirmed(onChange).radiusM).toBe(3500);
	});

	it('alert area: 1 to 25 km from 5 km, own primary disc, house pin, lock privacy line and "Shrani območje"', async () => {
		const onChange = jest.fn();
		await render(ui({ mode: 'alert', onChange, value: { point: RAW, radiusM: 10_000 } }));
		expect(screen.getByRole('heading', { name: sl.location.title_alert })).toBeOnTheScreen();
		const slider = screen.getByRole('adjustable', { name: sl.location.alert_radius_label });
		expect(slider.props.accessibilityValue).toMatchObject({ max: 9, now: 6, text: '10 km' });
		expect(screen.getByText(sl.location.alert_radius_help)).toBeOnTheScreen();
		expect(screen.getByText(sl.location.privacy_alert)).toBeOnTheScreen();
		await press(sl.location.save_area);
		expect(confirmed(onChange)).toMatchObject({ radiusM: 10_000 });
	});

	it("labels the owner's stored pin as approximate until the map moves away from it", async () => {
		await render(ui({ mode: 'found', value: { point: RAW } }));
		expect(screen.getByText(sl.location.exact_own, { includeHiddenElements: true })).toBeTruthy();
		expect(
			screen.getByRole('button', { name: `${sl.location.pin_a11y} ${sl.location.exact_own}` })
		).toBeOnTheScreen();
		await panTo({ lat: 46.08, lng: 14.5 });
		expect(screen.queryByText(sl.location.exact_own, { includeHiddenElements: true })).toBeNull();
	});

	it('hands the stored point back unchanged when confirmed unmoved, so re-saving never coarsens it again', async () => {
		const onChange = jest.fn();
		await render(ui({ mode: 'alert', onChange, value: { point: RAW, radiusM: 5000 } }));
		// The map settles on the stored point (within 1 m) and only the radius changes.
		await panTo({ lat: RAW.lat + 0.000001, lng: RAW.lng });
		await fireEvent(screen.getByRole('adjustable'), 'accessibilityAction', {
			nativeEvent: { actionName: 'increment' },
		});
		await press(sl.location.save_area);
		expect(confirmed(onChange)).toEqual({ point: RAW, radiusM: 7000, source: 'pin' });
		expect(confirmed(onChange).point).toBe(RAW);
	});

	it('screen readers move the pin 100 m with the nudge buttons in place of the map', async () => {
		await render(ui({ mode: 'found', value: { point: RAW } }));
		const map = screen.getByRole('button', { name: `${sl.location.pin_a11y} ${sl.location.exact_own}` });
		await fireEvent(map, 'accessibilityAction', { nativeEvent: { actionName: 'activate' } });
		await press(sl.location.nudge_north);
		const [{ center }] = refs.camera.easeTo.mock.calls.at(-1) as [{ center: [number, number] }];
		expect(metres({ lng: center[0], lat: center[1] }, RAW)).toBeCloseTo(100, 0);
		expect(center[1]).toBeGreaterThan(RAW.lat);
	});

	it('names every control for screen readers and gives each a 44 px target', async () => {
		mockSearch = { places: [TRUBARJEVA], isFetching: false, searched: true, error: undefined };
		await render(ui({ suggested: { lat: 46.06, lng: 14.5, source: 'exif' } }));
		const target = /(^|\s)(min-h-11|min-h-12|min-h-14|min-h-\[52px\]|size-11|h-11)(\s|$)/;
		const map = screen.getByRole('button', { name: sl.location.pin_a11y });
		const controls = [...screen.getAllByRole('button').filter((b) => b !== map), screen.getByRole('adjustable')];
		expect(controls.length).toBeGreaterThan(5);
		for (const control of controls) {
			expect(control).toHaveAccessibleName();
			expect(String(control.props.className)).toMatch(target);
		}
		expect(screen.getByRole('button', { name: sl.location.use_photo_location })).toBeOnTheScreen();

		await fireEvent.changeText(screen.getByLabelText(sl.location.search_label), 'trubarjeva');
		const row = screen.getByRole('button', { name: TRUBARJEVA.label });
		expect(String(row.props.className)).toMatch(target);
		expect(String(screen.getByRole('button', { name: sl.location.search_clear }).props.className)).toMatch(target);
	});

	it('on a short screen folds the privacy line into a "Kdo vidi ta kraj?" button, and back when there is room', async () => {
		await render(ui({ mode: 'found' }));
		const layout = (height: number) =>
			act(async () =>
				fireEvent(hidden('picker-map'), 'layout', { nativeEvent: { layout: { width: 375, height } } })
			);
		await act(async () =>
			fireEvent(screen.getByTestId('picker-privacy'), 'layout', { nativeEvent: { layout: { height: 40 } } })
		);
		await layout(400);
		expect(screen.queryByRole('button', { name: sl.location.privacy_info_button })).toBeNull();

		await layout(190);
		expect(screen.getByRole('button', { name: sl.location.privacy_info_button })).toBeOnTheScreen();
		// The sheet carries the same sentence as real text.
		expect(screen.getByText(sl.location.privacy_found)).toBeOnTheScreen();
		// The map grew by the line it gave up: still too small to take it back.
		await layout(242);
		expect(screen.getByRole('button', { name: sl.location.privacy_info_button })).toBeOnTheScreen();
		await layout(300);
		expect(screen.queryByRole('button', { name: sl.location.privacy_info_button })).toBeNull();
	});

	it('offline, lost waits for the map: one note with "Poskusi znova", confirm disabled', async () => {
		mockNetwork = { isConnected: false };
		await render(ui());
		expect(screen.getByText(sl.location.offline)).toBeOnTheScreen();
		expect(screen.queryByTestId('map-native', { includeHiddenElements: true })).toBeNull();
		expect(screen.getByRole('button', { name: sl.location.confirm })).toBeDisabled();
		expect(screen.getByLabelText(sl.location.search_label)).toHaveProp('editable', false);

		mockNetwork = { isConnected: true };
		await press(sl.location.offline_retry);
		expect(screen.getByRole('button', { name: sl.location.pin_a11y })).toBeOnTheScreen();
		expect(screen.getByRole('button', { name: sl.location.confirm })).toBeEnabled();
	});

	it('offline, found can still confirm a GPS point (FR-042), and search says it needs a connection', async () => {
		mockNetwork = { isConnected: false };
		const onChange = jest.fn();
		await render(ui({ mode: 'found', onChange }));
		expect(screen.getByText(sl.location.search_offline)).toBeOnTheScreen();
		expect(screen.getByRole('button', { name: sl.location.confirm })).toBeDisabled();

		await press(sl.location.use_my_location);
		expect(screen.getByText(sl.location.offline_gps_set)).toBeOnTheScreen();
		// No reverse lookup goes out offline.
		expect(mockReverse.mock.calls.every(([arg]) => typeof arg === 'symbol')).toBe(true);
		await press(sl.location.confirm);
		expect(confirmed(onChange).source).toBe('gps');
		expect(metres(confirmed(onChange).point, { lat: 46.0551, lng: 14.5122 })).toBeGreaterThanOrEqual(19.9);
	});
});

test('the dev picker (/dev/picker) switches modes and shows what Confirm handed over', async () => {
	await render(
		<IntlProvider locale="sl" messages={sl}>
			<DevPickerScreen />
		</IntlProvider>
	);
	await press('alert');
	expect(screen.getByRole('heading', { name: sl.location.title_alert })).toBeOnTheScreen();
	await press(sl.location.save_area);
	expect(screen.getByText(/"radiusM":5000,"source":"pin"/)).toBeOnTheScreen();
});
