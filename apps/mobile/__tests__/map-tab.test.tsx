/// <reference types="node" />
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as Location from 'expo-location';
import * as React from 'react';
import { AccessibilityInfo, Text } from 'react-native';
import { Provider } from 'react-redux';
import { IntlProvider } from 'use-intl';

import { ad } from '@zivali/api/__fixtures__/ads';
import * as fx from '@zivali/api/__fixtures__/reports';
import { createMockApi, type MockRequest, type MockRoutes } from '@zivali/api/mock';
import { reportsApi } from '@zivali/api/reports';
import { api, createApiStore } from '@zivali/api/rtk';
import sl from '@zivali/i18n/dist/sl.json';
import type { MapReport, PublicReport } from '@zivali/types';
import MapTab from '@/app/(tabs)/index';
import { ListSheet, type ListSheetProps } from '@/components/browse/list-sheet';
import { toCached } from '@/lib/data/reports';
import { getDb } from '@/lib/db';
import { upsertReports } from '@/lib/offline/sync';

jest.mock('expo-sqlite', () =>
	jest.requireActual<typeof import('@/test/offline-mocks')>('@/test/offline-mocks').sqlite()
);
jest.mock('expo-file-system', () =>
	jest.requireActual<typeof import('@/test/offline-mocks')>('@/test/offline-mocks').fileSystem()
);
jest.mock('expo-sqlite/localStorage/install', () => ({}));
const ONLINE = { isConnected: true, isInternetReachable: true };
let mockNetwork: { isConnected: boolean; isInternetReachable: boolean } = ONLINE;
jest.mock('expo-network', () => ({
	NetworkStateType: { WIFI: 'WIFI', ETHERNET: 'ETHERNET' },
	addNetworkStateListener: jest.fn(() => ({ remove: () => {} })),
	getNetworkStateAsync: jest.fn(async () => ({ isConnected: true, isInternetReachable: true })),
	useNetworkState: () => mockNetwork,
}));
jest.mock('expo-task-manager', () => ({ defineTask: jest.fn() }));
jest.mock('expo-background-task', () => ({ BackgroundTaskResult: { Success: 1, Failed: 2 } }));
jest.mock('@/lib/offline/geofence', () => ({ refreshGeofences: jest.fn(async () => 'off') }));
jest.mock('@/lib/env', () => ({ env: { EXPO_PUBLIC_API_URL: 'http://api.default' } }));
// The outbox group has its own tests (outbox-ui); here it is the sheet's header slot.
jest.mock('@/components/outbox/queue', () => ({ OutboxList: () => null }));
const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('expo-location', () => ({
	Accuracy: { Balanced: 3 },
	getForegroundPermissionsAsync: jest.fn(),
	requestForegroundPermissionsAsync: jest.fn(),
	getLastKnownPositionAsync: jest.fn(),
	getCurrentPositionAsync: jest.fn(),
}));

const t = sl.browse;
/** The device, in Ljubljana (never shown, sent only at 2 decimals). */
const HERE = { latitude: 46.05687, longitude: 14.50581 };
const AREA = { lat: 46.0569, lng: 14.5058 };

const maks: PublicReport = {
	...fx.publicReport,
	id: 'r-maks',
	short_code: 'MaksCode',
	type: 'lost',
	name: 'Maks',
	event_at: new Date(Date.now() - 2 * 3_600_000).toISOString(),
	area: { ...AREA, radius_m: 500 },
	boosted: false,
};
const found: PublicReport = {
	...fx.publicReport,
	id: 'r-found',
	short_code: 'FoundCod',
	area: { lat: 46.075, lng: 14.5058, radius_m: 150 },
	boosted: true,
};
const pin = (r: PublicReport): MapReport => ({
	id: r.id,
	short_code: r.short_code,
	type: r.type,
	species: r.species,
	area: r.area,
	boosted: r.boosted,
	thumb_url: null,
});
// 40 km away: outside the default 10 km, so neither drawn nor counted.
const far: MapReport = {
	...pin(found),
	id: 'r-far',
	short_code: 'FarCode1',
	area: { lat: 46.42, lng: 14.5, radius_m: 150 },
};

const bySpecies = (request: MockRequest, r: { species: string }) =>
	!request.query.species || request.query.species.split(',').includes(r.species);

let stores: ReturnType<typeof createApiStore>[] = [];
async function renderTab(reports: PublicReport[] = [maks, found], routes: MockRoutes = {}) {
	const client = createMockApi({
		'GET /v1/reports': (request) => ({
			// The API orders boosted first (C4); the screen no longer re-sorts network pages.
			items: reports.filter((r) => bySpecies(request, r)).sort((a, b) => Number(b.boosted) - Number(a.boosted)),
			next_cursor: null,
			total_estimate: reports.length,
		}),
		'GET /v1/reports/map': (request) => ({
			items: [...reports.map(pin), far].filter((r) => bySpecies(request, r)),
		}),
		'POST /v1/reports': () => ({ id: 'r-luna', short_code: 'LunaCode', moderation_state: 'visible', warnings: [] }),
		'POST /v1/geo/reverse': {
			place: {
				label: 'Šiška, Ljubljana',
				lat: 46.07,
				lng: 14.48,
				kind: 'district',
				municipality_slug: 'ljubljana',
			},
		},
		'GET /v1/ads/slot/:slot': ad,
		'POST /v1/ads/:id/impressions': () => undefined,
		...routes,
	});
	const store = createApiStore(client);
	stores.push(store);
	await render(
		<Provider store={store}>
			<IntlProvider locale="sl" messages={sl} timeZone="Europe/Ljubljana">
				<MapTab />
			</IntlProvider>
		</Provider>
	);
	return client;
}

const listCalls = (client: { calls: MockRequest[] }) => client.calls.filter((c) => c.path === '/v1/reports');
const pill = () => screen.getByRole('button', { name: /^Območje: / });

function permission(granted: boolean, canAskAgain = true) {
	jest.mocked(Location.getForegroundPermissionsAsync).mockResolvedValue({ granted, canAskAgain } as never);
}

beforeEach(async () => {
	jest.clearAllMocks();
	mockNetwork = ONLINE;
	permission(true);
	jest.mocked(Location.getLastKnownPositionAsync).mockResolvedValue({ coords: HERE } as never);
	await (await getDb()).execAsync('delete from reports_cache; delete from cache_areas;');
});
afterEach(async () => {
	await cleanup();
	await new Promise((resolve) => setTimeout(resolve, 600));
	for (const store of stores) store.dispatch(api.util.resetApiState());
	stores = [];
});

test('map and list show the reports around the device: boosted first, counted, clustered public areas only', async () => {
	const client = await renderTab();

	expect(await screen.findByRole('link', { name: /^Najden pes, Najdena, .+, 1–3 km$/ })).toBeOnTheScreen();
	// Report rows (the map's attribution is a link too, without a report name).
	const rows = screen
		.getAllByRole('link')
		.map((row) => row.props.accessibilityLabel as string | undefined)
		.filter(Boolean);
	expect(rows).toEqual([
		expect.stringMatching(/^Najden pes, /),
		expect.stringMatching(/^Maks, Izgubljena, .+, manj kot 1 km$/),
	]);
	expect(screen.getByText('Povečan doseg')).toBeOnTheScreen();
	await waitFor(() => expect(screen.getByText('2 prijavi')).toBeOnTheScreen());
	expect(await screen.findByText('Šiška, Ljubljana, 10 km')).toBeOnTheScreen();

	// The list asks around the device at 2 decimals, open reports only, 20 at a time.
	const query = listCalls(client)[0]!.query;
	expect(query).toMatchObject({ near: '46.06,14.51,10', sort: 'distance', limit: '20' });
	expect(query).not.toHaveProperty('include_closed');
	expect(client.calls.find((c) => c.path === '/v1/geo/reverse')!.body).toEqual({ lat: 46.06, lng: 14.51 });

	// Markers are the fuzzed public areas inside the radius, clustered; no "me" dot.
	const source = screen.getByTestId('GeoJSONSource:reports', { includeHiddenElements: true });
	expect(source.props.cluster).toBe(false); // clustering starts at 25 markers
	expect(
		source.props.data.features.map((f: { geometry: { coordinates: number[] } }) => f.geometry.coordinates)
	).toEqual([
		[AREA.lng, AREA.lat],
		[found.area.lng, found.area.lat],
	]);
	expect(screen.getByTestId('GeoJSONSource:me', { includeHiddenElements: true }).props.data.features).toEqual([]);

	await fireEvent.press(screen.getByRole('link', { name: /^Maks, / }));
	expect(mockPush).toHaveBeenCalledWith('/r/MaksCode');
});

test('the list carries one labelled feed ad (P21) after the 8th report row, never first', async () => {
	const many = Array.from({ length: 9 }, (_, i) => ({ ...maks, id: `r-${i}`, name: `Pes ${i + 1}` }));
	// The unit is in view (any box), so the impression counts after its 1 s dwell.
	const native = jest.requireActual<{ default: { measureInWindow: jest.Mock } }>(
		'@react-native/jest-preset/jest/MockNativeMethods'
	).default;
	native.measureInWindow.mockImplementation((cb: (x: number, y: number, w: number, h: number) => void) =>
		cb(0, 100, 390, 136)
	);
	const client = await renderTab(many);

	await screen.findByRole('link', { name: `Oglas: ${ad.title}. ${ad.body}` });
	const links = screen
		.getAllByRole('link')
		.map((link) => link.props.accessibilityLabel as string | undefined)
		.filter((label): label is string => Boolean(label));
	expect(links).toHaveLength(10);
	expect(links.map((label) => label.startsWith('Oglas: '))).toEqual([...Array(8).fill(false), true, false]);
	await waitFor(
		() =>
			expect(client.calls.filter((c) => c.path.startsWith('/v1/ads/')).map((c) => [c.method, c.path])).toEqual([
				['GET', '/v1/ads/slot/feed'],
				['POST', `/v1/ads/${ad.id}/impressions`],
			]),
		{ timeout: 3000 }
	);
	// C14: the feed asks for the first row's region (osrednjeslovenska = 8).
	expect(client.calls.find((c) => c.path === '/v1/ads/slot/feed')?.query).toMatchObject({ region_id: '8' });
});

test('a report created while the tab is open (the lost flow over it) shows on the map without a reload (TASK-29.6)', async () => {
	const reports = [maks];
	const client = await renderTab(reports);
	await screen.findByRole('link', { name: /^Maks, / });
	const mapCalls = () => client.calls.filter((c) => c.path === '/v1/reports/map').length;
	const before = mapCalls();

	const luna: PublicReport = {
		...maks,
		id: 'r-luna',
		short_code: 'LunaCode',
		name: 'Luna',
		area: { ...AREA, radius_m: 750 },
	};
	reports.push(luna);
	// The same mutation the lost flow sends (C4); its invalidation refetches the open map and list queries.
	await stores[0]!.dispatch(
		reportsApi.endpoints.createReport.initiate({ body: { type: 'lost' } as never, idempotencyKey: 'k-1' })
	);

	expect(await screen.findByRole('link', { name: /^Luna, Izgubljena, / })).toBeOnTheScreen();
	expect(mapCalls()).toBeGreaterThan(before);
	const source = screen.getByTestId('GeoJSONSource:reports', { includeHiddenElements: true });
	expect(source.props.data.features).toHaveLength(2);
});

test('a GPS that never answers does not hold the list back: Slovenia-wide after 5 s (FR-007)', async () => {
	jest.mocked(Location.getLastKnownPositionAsync).mockResolvedValue(null as never);
	jest.mocked(Location.getCurrentPositionAsync).mockReturnValue(new Promise(() => {}) as never);
	jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] });
	try {
		const client = await renderTab();
		expect(listCalls(client)).toHaveLength(0);
		await jest.advanceTimersByTimeAsync(5000);
		await waitFor(() => expect(listCalls(client).length).toBeGreaterThan(0));
		expect(listCalls(client)[0]!.query).not.toHaveProperty('near');
	} finally {
		jest.useRealTimers();
	}
});

test('the last foreground location becomes the offline cache area "current" (TASK-85.2)', async () => {
	await renderTab();

	await waitFor(async () =>
		expect(
			await (await getDb()).getFirstAsync('select lat, lng, radius_km from cache_areas where id = ?', 'current')
		).toEqual({ lat: 46.06, lng: 14.51, radius_km: 10 })
	);
});

test('"show closed" at the end of the list asks for closed reports too', async () => {
	const client = await renderTab();

	await fireEvent.press(await screen.findByRole('button', { name: t.show_closed }));

	await waitFor(() => expect(listCalls(client).at(-1)!.query).toMatchObject({ include_closed: 'true' }));
	expect(await screen.findByRole('button', { name: t.hide_closed })).toBeOnTheScreen();
});

test('filters: nothing applies until "Prikaži"; the live count uses Slovenian plurals', async () => {
	const client = await renderTab();
	await screen.findByText('2 prijavi');

	await fireEvent.press(pill());
	expect(screen.getByRole('button', { name: 'Prikaži 2 prijavi' })).toBeOnTheScreen();
	await fireEvent.press(screen.getByRole('checkbox', { name: t.filter_dogs }));

	// Cats only: the found dog and Maks drop out of the draft count, the list is unchanged until applied.
	expect(await screen.findByRole('button', { name: 'Prikaži 0 prijav' })).toBeOnTheScreen();
	expect(listCalls(client).every((c) => c.query.species === undefined)).toBe(true);
	await fireEvent.press(screen.getByRole('checkbox', { name: t.filter_dogs }));
	await fireEvent.press(screen.getByRole('checkbox', { name: t.filter_cats }));
	await fireEvent.press(await screen.findByRole('button', { name: 'Prikaži 2 prijavi' }));

	await waitFor(() => expect(listCalls(client).at(-1)!.query).toMatchObject({ species: 'dog' }));
});

test('600 matches: the list shows total_estimate, the map stops at 500, the sheet reads 500+ (TASK-31.7)', async () => {
	const pins = Array.from({ length: 500 }, (_, i) => ({ ...pin(maks), id: `p-${i}`, short_code: `Pin${i}` }));
	const client = await renderTab([maks], {
		'GET /v1/reports': { items: [maks], next_cursor: null, total_estimate: 600 },
		'GET /v1/reports/map': { items: pins },
	});
	expect(await screen.findByText('600 prijav')).toBeOnTheScreen();
	const listRequests = listCalls(client).length;

	await fireEvent.press(pill());
	expect(await screen.findByRole('button', { name: 'Prikaži 500+ prijav' })).toBeOnTheScreen();
	await fireEvent.press(screen.getByRole('checkbox', { name: t.filter_cats }));
	expect(await screen.findByRole('button', { name: 'Prikaži 500+ prijav' })).toBeOnTheScreen();
	// The live count is the map's own query: no extra list request.
	expect(listCalls(client)).toHaveLength(listRequests);
});

test('distance slider:adjustable by assistive tech, 1 to 50 km, applied to the area', async () => {
	const client = await renderTab();
	await screen.findByText('2 prijavi');
	await fireEvent.press(pill());

	const slider = screen.getByRole('slider', { name: t.filter_distance });
	expect(slider.props['aria-valuetext']).toBe('10 km');
	await fireEvent(slider, 'accessibilityAction', { nativeEvent: { actionName: 'increment' } });
	expect(screen.getByRole('slider', { name: t.filter_distance }).props['aria-valuetext']).toBe('11 km');
	await fireEvent.press(await screen.findByRole('button', { name: /^Prikaži / }));

	await waitFor(() => expect(listCalls(client).at(-1)!.query).toMatchObject({ near: '46.06,14.51,11' }));
	expect(screen.getByText('Šiška, Ljubljana, 11 km')).toBeOnTheScreen();
});

test('empty region: the good news, "Prijavi" and "Vklopi opozorila"', async () => {
	await renderTab([]);

	expect(await screen.findByText(t.empty_title)).toBeOnTheScreen();
	expect(screen.getByText('0 prijav')).toBeOnTheScreen();
	await fireEvent.press(screen.getByRole('button', { name: t.empty_primary }));
	await fireEvent.press(screen.getByRole('button', { name: t.empty_secondary }));
	expect(mockPush.mock.calls).toEqual([['/report'], ['/settings/alerts']]);
});

test('no match for the filters: a sentence and "Ponastavi filtre"', async () => {
	await renderTab([maks]);
	await screen.findByText('1 prijava');
	await fireEvent.press(pill());
	await fireEvent.press(screen.getByRole('checkbox', { name: t.filter_dogs }));
	await fireEvent.press(await screen.findByRole('button', { name: 'Prikaži 0 prijav' }));

	expect(await screen.findByText(t.no_match)).toBeOnTheScreen();
	await fireEvent.press(screen.getByRole('button', { name: t.no_match_action }));
	expect(await screen.findByRole('link', { name: /^Maks, / })).toBeOnTheScreen();
});

test('location denied: Slovenia, newest first, no cache area, and the note with the place search', async () => {
	permission(false, false);
	const client = await renderTab();

	expect(await screen.findByText('Slovenija, 10 km')).toBeOnTheScreen();
	await waitFor(() => expect(listCalls(client).length).toBeGreaterThan(0));
	const query = listCalls(client)[0]!.query;
	expect(query).toMatchObject({ sort: 'recent' });
	expect(query).not.toHaveProperty('near');
	expect(screen.queryByRole('button', { name: /^Razvrsti/ })).toBeNull();
	expect(screen.getByText(sl.browse.location_denied_note.replace('{place}', 'Slovenija'))).toBeOnTheScreen();
	expect(screen.getByText(t.filter_place)).toBeOnTheScreen();
	expect(await (await getDb()).getFirstAsync('select * from cache_areas where id = ?', 'current')).toBeNull();
	expect(Location.getLastKnownPositionAsync).not.toHaveBeenCalled();
});

test('"Uporabi mojo lokacijo" asks through the primer, never straight away', async () => {
	permission(false);
	await renderTab();
	await screen.findByText('Slovenija, 10 km');
	expect(Location.requestForegroundPermissionsAsync).not.toHaveBeenCalled();

	jest.mocked(Location.requestForegroundPermissionsAsync).mockImplementation(async () => {
		permission(true);
		return { granted: true } as never;
	});
	await fireEvent.press(screen.getByRole('button', { name: t.filter_use_location }));
	await fireEvent.press(await screen.findByRole('button', { name: sl.permissions.location_allow }));

	expect(await screen.findByText('Šiška, Ljubljana, 10 km')).toBeOnTheScreen();
});

describe('offline (FR-041, TASK-85.3)', () => {
	const OFFLINE = { isConnected: false, isInternetReachable: false };
	const time = (at: number) =>
		new Intl.DateTimeFormat('sl', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Ljubljana' }).format(at);

	test('map and list show the cached reports under "Brez povezave, zadnja posodobitev …", a polite status', async () => {
		const syncedAt = Date.now() - 60_000;
		await upsertReports([toCached(maks), toCached(found)]);
		await (
			await getDb()
		).runAsync(
			"insert into cache_areas (id, lat, lng, radius_km, last_sync_at) values ('home', 46.06, 14.51, 10, ?)",
			syncedAt
		);
		mockNetwork = OFFLINE;
		const client = await renderTab();

		const note = await screen.findByRole('status');
		expect(note).toHaveTextContent(`Brez povezave, zadnja posodobitev ${time(syncedAt)}.`);
		expect(note.props['aria-live']).toBe('polite');
		// iOS has no live region: the state is announced (the jest-expo preset runs as iOS).
		expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(
			`Brez povezave, zadnja posodobitev ${time(syncedAt)}.`
		);
		// The cached rows, boosted first, and their pins; nothing asked from the network.
		const rows = await screen.findAllByRole('link', { name: /^(Najden pes|Maks), / });
		expect(rows.map((row) => row.props.accessibilityLabel)).toEqual([
			expect.stringMatching(/^Najden pes, /),
			expect.stringMatching(/^Maks, /),
		]);
		await waitFor(() =>
			expect(
				screen.getByTestId('GeoJSONSource:reports', { includeHiddenElements: true }).props.data.features
			).toHaveLength(2)
		);
		expect(screen.getByText('2 prijavi')).toBeOnTheScreen();
		expect(client.calls.filter((c) => c.path.startsWith('/v1/reports'))).toEqual([]);
		// Reading a cached report still works (the detail reads the cache, TASK-18.3).
		await fireEvent.press(rows[1]!);
		expect(mockPush).toHaveBeenCalledWith('/r/MaksCode');
	});

	test('filters work on the cached reports', async () => {
		await upsertReports([toCached(maks), toCached(found)]);
		mockNetwork = OFFLINE;
		await renderTab();
		await screen.findByText('2 prijavi');

		await fireEvent.press(pill());
		await fireEvent.press(screen.getByRole('checkbox', { name: t.filter_type_found }));
		await fireEvent.press(await screen.findByRole('button', { name: 'Prikaži 1 prijavo' }));
		await waitFor(() => expect(screen.queryByRole('link', { name: /^Najden pes, / })).toBeNull());
		expect(screen.getByRole('link', { name: /^Maks, / })).toBeOnTheScreen();
	});

	test('first launch offline: an explanatory empty state instead of the empty region, no network actions', async () => {
		mockNetwork = OFFLINE;
		await renderTab();

		expect(await screen.findByRole('heading', { name: sl.errors.offline_title })).toBeOnTheScreen();
		expect(screen.getByText(t.offline_empty_body)).toBeOnTheScreen();
		expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(
			`${sl.errors.offline_title}. ${t.offline_empty_body}`
		);
		// One message: the time note is left out.
		expect(screen.queryByRole('status')).toBeNull();
		expect(screen.queryByText(t.empty_title)).toBeNull();
		expect(screen.queryByRole('button', { name: t.empty_secondary })).toBeNull();
		expect(screen.queryByRole('button', { name: t.show_closed })).toBeNull();
	});

	test('online, no offline note', async () => {
		await renderTab();
		await screen.findByText('2 prijavi');

		expect(screen.queryByRole('status')).toBeNull();
	});
});

describe('ListSheet', () => {
	const props = (over: Partial<ListSheetProps>): ListSheetProps => ({
		reports: [],
		count: 0,
		center: AREA,
		isLoading: false,
		isError: false,
		onRetry: jest.fn(),
		filtered: false,
		onResetFilters: jest.fn(),
		sort: 'distance',
		includeClosed: false,
		onIncludeClosedChange: jest.fn(),
		hasNextPage: false,
		onEndReached: jest.fn(),
		onOpenReport: jest.fn(),
		onReport: jest.fn(),
		onSetAlert: jest.fn(),
		topInset: 100,
		...over,
	});
	const sheet = (over: Partial<ListSheetProps>) =>
		render(
			<IntlProvider locale="sl" messages={sl} timeZone="Europe/Ljubljana">
				<ListSheet {...props(over)} />
			</IntlProvider>
		);

	test('the ad insertion point renders a slot after the 8th row and nowhere else', async () => {
		const reports = Array.from({ length: 9 }, (_, i) => toCached({ ...maks, id: `r${i}`, name: `Pes ${i + 1}` }));
		const renderAd = jest.fn(() => <Text>Oglas</Text>);
		await sheet({ reports, count: 9, renderAd });

		expect(await screen.findAllByText('Oglas')).toHaveLength(1);
		expect(renderAd).toHaveBeenCalledWith({ kind: 'ad', key: 'ad-0', index: 0 });
	});

	test('loading shows skeleton rows and one polite line; an error keeps the rows and offers a retry', async () => {
		const onRetry = jest.fn();
		const { rerender } = await sheet({ reports: undefined, isLoading: true });
		expect(screen.getByText(t.loading)).toBeOnTheScreen();

		await rerender(
			<IntlProvider locale="sl" messages={sl} timeZone="Europe/Ljubljana">
				<ListSheet {...props({ reports: [toCached(maks)], count: 1, isError: true, onRetry })} />
			</IntlProvider>
		);
		expect(screen.getByText(t.error)).toBeOnTheScreen();
		expect(screen.getByRole('link', { name: /^Maks, / })).toBeOnTheScreen();
		await fireEvent.press(screen.getByRole('button', { name: t.error_action }));
		expect(onRetry).toHaveBeenCalled();
	});

	test('offline without a completed sync, rows saved while browsing still show, with a note without a time', async () => {
		await sheet({ reports: [toCached(maks)], count: 1, cachedAt: null });

		expect(screen.getByRole('status')).toHaveTextContent(t.offline_note_saved);
		expect(screen.getByRole('link', { name: /^Maks, / })).toBeOnTheScreen();
	});

	test('offline on another day, the note names the day and the time', async () => {
		const at = Date.parse('2026-10-12T12:20:00Z');
		await sheet({ reports: [toCached(maks)], count: 1, cachedAt: at });

		expect(screen.getByRole('status')).toHaveTextContent('Brez povezave, zadnja posodobitev 12. 10., 14:20.');
	});
});
