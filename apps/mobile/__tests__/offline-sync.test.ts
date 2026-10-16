/// <reference types="node" />
import fs from 'node:fs';
import path from 'node:path';

import * as BackgroundTask from 'expo-background-task';
import { File } from 'expo-file-system';
import { getNetworkStateAsync, type NetworkState, NetworkStateType } from 'expo-network';
import * as TaskManager from 'expo-task-manager';
import { AppState, type AppStateStatus } from 'react-native';

import { responsibleConfirmed } from '@zivali/api/__fixtures__/directory';
import * as fx from '@zivali/api/__fixtures__/reports';
import { createMockApi, mockError } from '@zivali/api/mock';
import type { CachedReport, SyncReportsResponse } from '@zivali/api/sync';
import { getDb } from '@/lib/db';
import { refreshGeofences } from '@/lib/offline/geofence';
import { wipeLocalData } from '@/lib/offline/wipe';
import { thumbsDir } from '@/lib/db/files';
import {
	cacheSettings,
	enforceLimits,
	getCachedShelter,
	lastSyncAt,
	setCacheArea,
	startCacheSync,
	SYNC_TASK,
	syncIdle,
	syncNow,
	upsertReports,
} from '@/lib/offline/sync';

jest.mock('expo-sqlite', () =>
	jest.requireActual<typeof import('@/test/offline-mocks')>('@/test/offline-mocks').sqlite()
);
jest.mock('expo-file-system', () =>
	jest.requireActual<typeof import('@/test/offline-mocks')>('@/test/offline-mocks').fileSystem()
);
const mockStorage = new Map<string, string>();
jest.mock('expo-sqlite/localStorage/install', () => {
	globalThis.localStorage = {
		getItem: (name: string) => mockStorage.get(name) ?? null,
		setItem: (name: string, value: string) => void mockStorage.set(name, value),
		removeItem: (name: string) => void mockStorage.delete(name),
	} as Storage;
	return {};
});
let mockNetwork: (state: NetworkState) => void = () => {};
jest.mock('expo-network', () => ({
	NetworkStateType: { NONE: 'NONE', CELLULAR: 'CELLULAR', WIFI: 'WIFI', ETHERNET: 'ETHERNET' },
	addNetworkStateListener: jest.fn((listener) => ((mockNetwork = listener), { remove: jest.fn() })),
	getNetworkStateAsync: jest.fn(),
	useNetworkState: jest.fn(),
}));
jest.mock('expo-task-manager', () => ({ defineTask: jest.fn() }));
jest.mock('expo-background-task', () => ({
	BackgroundTaskResult: { Success: 1, Failed: 2 },
	registerTaskAsync: jest.fn(async () => {}),
}));
jest.mock('expo-secure-store', () => ({ deleteItemAsync: jest.fn(async () => {}) }));
jest.mock('@/lib/supabase', () => ({ clearSessionStorage: jest.fn(async () => {}), supabase: { auth: {} } }));
jest.mock('@/lib/offline/geofence', () => ({
	cacheOwnReports: jest.fn(),
	cacheQuietHours: jest.fn(),
	refreshGeofences: jest.fn(async () => 'off'),
	stopGeofencing: jest.fn(async () => {}),
}));
jest.mock('@/lib/env', () => ({ env: { EXPO_PUBLIC_API_URL: 'http://api.default' } }));

const WIFI = { isConnected: true, isInternetReachable: true, type: NetworkStateType.WIFI };
const CELLULAR = { isConnected: true, isInternetReachable: true, type: NetworkStateType.CELLULAR };
const NOW = Date.parse('2026-10-15T08:00:00Z');
const MINUTE = 60_000;
const DAY = 86_400_000;
const LJUBLJANA = { lat: 46.05612, lng: 14.50587 };
// Private values a server bug or a manager view could carry; none may reach the disk.
const PRIVATE = { location: { lat: 46.050412, lng: 14.505873 }, chip_number: '705123456789012' };
const CONTACT = { email: 'owner@zivali.test', phone: '+38641123456', messages: [{ body: 'Pokličite me' }] };

const REPORTS_CACHE_COLUMNS = [
	'id',
	'short_code',
	'type',
	'status',
	'species',
	'name',
	'breed_codes',
	'colours',
	'pattern',
	'size',
	'sex',
	'has_chip',
	'event_at',
	'area_lat',
	'area_lng',
	'area_radius_m',
	'municipality_slug',
	'region_slug',
	'thumb_url',
	'thumb_path',
	'thumb_bytes',
	'boosted',
	'updated_at',
	'synced_at',
];

const lost = fx.syncSnapshot.upserts[0]!;
const report = (id: string, patch: Partial<CachedReport> = {}): CachedReport => ({
	...lost,
	id,
	short_code: id,
	thumb_url: null,
	...patch,
});
const api = (feed: SyncReportsResponse | ((query: Record<string, string>) => SyncReportsResponse)) =>
	createMockApi({
		'GET /v1/sync/reports': ({ query }) => (typeof feed === 'function' ? feed(query) : feed),
		'GET /v1/shelters/responsible': responsibleConfirmed,
	});
const all = async <T>(sql: string) => (await getDb()).getAllAsync<T>(sql);
const ids = async () => (await all<{ id: string }>('select id from reports_cache order by id')).map((r) => r.id);
const flush = () => new Promise((resolve) => setTimeout(resolve, 50));

const backgroundTask = jest.mocked(TaskManager.defineTask).mock.calls[0]![1] as () => Promise<number>;

beforeEach(async () => {
	jest.spyOn(Date, 'now').mockReturnValue(NOW);
	jest.mocked(getNetworkStateAsync).mockResolvedValue(WIFI);
	mockStorage.clear();
	await (await getDb()).execAsync('delete from reports_cache; delete from cache_areas;');
	if (thumbsDir.exists) thumbsDir.delete();
});
afterAll(() => fs.rmSync(path.resolve(thumbsDir.uri, '../..'), { recursive: true }));

describe('area sync', () => {
	test('the database after a first sync holds only C17 public columns and the server fuzzed areas', async () => {
		await setCacheArea('home', LJUBLJANA, 25);
		await setCacheArea('current', { lat: 46.0441, lng: 14.4893 });
		const snapshot = {
			...fx.syncSnapshot,
			upserts: [
				...fx.syncSnapshot.upserts.map((upsert) => ({ ...upsert, ...PRIVATE, ...CONTACT })),
				// An area finer than the C6 public blur is not public: dropped.
				report('unblurred', { area: { ...PRIVATE.location, radius_m: 20 } }),
			],
		};
		const client = api(snapshot);

		await syncNow(client);

		// Per area: the feed (first sync, no since; home capped to 10 km), then its responsible shelter.
		expect(client.calls.map((call) => call.query)).toEqual([
			{ areas: '[{"lat":46.06,"lng":14.51,"radius_km":10}]', limit: '500' },
			{ lat: '46.06', lng: '14.51' },
			{ areas: '[{"lat":46.04,"lng":14.49,"radius_km":10}]', limit: '500' },
			{ lat: '46.04', lng: '14.49' },
		]);

		const db = await getDb();
		const columns = await db.getAllAsync<{ name: string }>("select name from pragma_table_info('reports_cache')");
		expect(columns.map((column) => column.name)).toEqual(REPORTS_CACHE_COLUMNS);
		const rows = await all<{ area_lat: number; area_lng: number; area_radius_m: number }>(
			'select * from reports_cache'
		);
		const fuzzed = fx.syncSnapshot.upserts.map(({ area }) => area);
		expect(rows).toHaveLength(fuzzed.length);
		for (const row of rows) {
			expect(fuzzed).toContainEqual({ lat: row.area_lat, lng: row.area_lng, radius_m: row.area_radius_m });
		}
		const areas = await all<{ id: string; lat: number; lng: number; radius_km: number; since: string }>(
			'select * from cache_areas order by id'
		);
		expect(areas.map(({ id, lat, lng, radius_km, since }) => ({ id, lat, lng, radius_km, since }))).toEqual([
			{ id: 'current', lat: 46.04, lng: 14.49, radius_km: 10, since: fx.syncSnapshot.server_time },
			{ id: 'home', lat: 46.06, lng: 14.51, radius_km: 10, since: fx.syncSnapshot.server_time },
		]);

		const tables = await all<{ name: string }>(
			"select name from sqlite_master where type = 'table' and name not like 'sqlite_%'"
		);
		const dump = JSON.stringify(await Promise.all(tables.map(({ name }) => all(`select * from ${name}`))));
		for (const value of [
			PRIVATE.chip_number,
			CONTACT.email,
			CONTACT.phone,
			CONTACT.messages[0]!.body,
			String(PRIVATE.location.lat),
			String(PRIVATE.location.lng),
			String(LJUBLJANA.lat),
		]) {
			expect(dump).not.toContain(value);
		}
		expect(await lastSyncAt()).toBe(NOW);
	});

	test('the next sync sends the cursor, applies removed ids and keeps unchanged rows seen', async () => {
		await setCacheArea('home', LJUBLJANA);
		await syncNow(api(fx.syncSnapshot));
		jest.mocked(Date.now).mockReturnValue(NOW + 6 * DAY);
		const client = api({
			upserts: [report('new')],
			removed_ids: [lost.id],
			server_time: '2026-10-21T08:00:00Z',
			has_more: false,
		});

		await syncNow(client);

		expect(client.calls[0]!.query.since).toBe(fx.syncSnapshot.server_time);
		expect(await ids()).toEqual([fx.createdReport.id, 'new'].sort());
		// Still open and inside the area, so not stale after 7 days from the first sync.
		const [{ synced_at }] = await all<{ synced_at: number }>(
			`select synced_at from reports_cache where id = '${fx.createdReport.id}'`
		);
		expect(synced_at).toBe(NOW + 6 * DAY);
	});

	test('has_more pages continue from server_time, stored at the end', async () => {
		await setCacheArea('home', LJUBLJANA);
		const client = api((query) =>
			query.since
				? { upserts: [report('b')], removed_ids: [], server_time: 'T2', has_more: false }
				: { upserts: [report('a')], removed_ids: [], server_time: 'T1', has_more: true }
		);

		await syncNow(client);

		expect(client.calls.filter((call) => call.path === '/v1/sync/reports').map((call) => call.query.since)).toEqual(
			[undefined, 'T1']
		);
		expect(await ids()).toEqual(['a', 'b']);
		expect((await all<{ since: string }>('select since from cache_areas'))[0]!.since).toBe('T2');
	});

	test('rows sharing one updated_at across a page boundary all land; a has_more page of removals continues', async () => {
		await setCacheArea('home', LJUBLJANA);
		const same = '2026-10-15T07:59:00Z';
		const pages: Record<string, SyncReportsResponse> = {
			start: {
				upserts: [report('a', { updated_at: same }), report('b', { updated_at: same })],
				removed_ids: [],
				server_time: 'T1',
				has_more: true,
			},
			T1: { upserts: [], removed_ids: ['a'], server_time: 'T2', has_more: true },
			T2: { upserts: [report('c', { updated_at: same })], removed_ids: [], server_time: 'T3', has_more: false },
		};
		const client = api((query) => pages[query.since ?? 'start']!);

		await syncNow(client);

		expect(await ids()).toEqual(['b', 'c']);
		expect((await all<{ since: string }>('select since from cache_areas'))[0]!.since).toBe('T3');
	});

	test('a moved area starts a fresh snapshot; a small move inside the rounding does not', async () => {
		await setCacheArea('current', LJUBLJANA);
		await syncNow(api(fx.syncSnapshot));

		await setCacheArea('current', { lat: LJUBLJANA.lat + 0.001, lng: LJUBLJANA.lng });
		expect((await all<{ since: string }>('select since from cache_areas'))[0]!.since).toBe(
			fx.syncSnapshot.server_time
		);

		await setCacheArea('current', { lat: 46.55, lng: 15.65 });
		expect((await all<{ since: string | null }>('select since from cache_areas'))[0]!.since).toBeNull();

		await setCacheArea('current', null);
		expect(await all('select * from cache_areas')).toEqual([]);
	});

	test('a response for an area wiped meanwhile (sign-out) is not written', async () => {
		await setCacheArea('home', LJUBLJANA);
		const client = createMockApi({
			'GET /v1/sync/reports': async () => {
				await (await getDb()).execAsync('delete from cache_areas');
				return fx.syncSnapshot;
			},
		});

		await syncNow(client);

		expect(await ids()).toEqual([]);
	});

	test('a wipe waits for a running sync, and the page it was fetching is not written', async () => {
		await setCacheArea('home', LJUBLJANA);
		let release = () => {};
		const client = createMockApi({
			'GET /v1/sync/reports': async () => {
				await new Promise<void>((resolve) => (release = resolve));
				return fx.syncSnapshot;
			},
			'GET /v1/shelters/responsible': responsibleConfirmed,
		});
		const sync = syncNow(client);
		await flush();

		let wiped = false;
		const wipe = wipeLocalData({ reason: 'sign_out' }).then(() => (wiped = true));
		await flush();
		expect(wiped).toBe(false);
		release();
		await wipe;
		await syncIdle();

		expect(await sync.then(() => 'ok')).toBe('ok');
		expect(await ids()).toEqual([]);
		expect(await all('select * from cache_areas')).toEqual([]);
	});

	test('a failed sync keeps the cache and rejects; concurrent calls share one run', async () => {
		await setCacheArea('home', LJUBLJANA);
		await syncNow(api(fx.syncSnapshot));
		const failing = createMockApi({ 'GET /v1/sync/reports': () => mockError('SERVICE_UNAVAILABLE') });

		await expect(Promise.all([syncNow(failing), syncNow(failing)])).rejects.toMatchObject({
			code: 'SERVICE_UNAVAILABLE',
		});

		expect(failing.calls).toHaveLength(1);
		expect(await ids()).toHaveLength(2);
	});
});

describe('responsible shelter', () => {
	test('is cached per area for the offline call button and refreshed on every completed sync', async () => {
		await setCacheArea('home', LJUBLJANA);
		const client = api(fx.syncSnapshot);

		await syncNow(client);
		expect(await getCachedShelter('home')).toEqual(responsibleConfirmed);
		expect(await getCachedShelter('current')).toBeNull();
		await syncNow(client);

		expect(client.calls.filter((call) => call.path === '/v1/shelters/responsible')).toHaveLength(2);
	});

	test('a failed refresh keeps the old value', async () => {
		await setCacheArea('home', LJUBLJANA);
		await syncNow(api(fx.syncSnapshot));
		const failing = createMockApi({
			'GET /v1/sync/reports': fx.syncSnapshot,
			'GET /v1/shelters/responsible': () => mockError('SERVICE_UNAVAILABLE'),
		});

		await syncNow(failing);

		expect(await getCachedShelter('home')).toEqual(responsibleConfirmed);
	});
});

describe('thumbnails', () => {
	test('download on Wi-Fi into the cache folder and count in the budget', async () => {
		await setCacheArea('home', LJUBLJANA);

		await syncNow(api(fx.syncSnapshot));

		const [row] = await all<{ thumb_path: string; thumb_bytes: number }>(
			`select thumb_path, thumb_bytes from reports_cache where id = '${lost.id}'`
		);
		expect(row).toEqual({ thumb_path: path.join(thumbsDir.uri, lost.id), thumb_bytes: 1000 });
		expect(File.downloadFileAsync).toHaveBeenCalledWith(lost.thumb_url, expect.anything(), { idempotent: true });
	});

	test('skip mobile data unless the user allowed it; a changed URL is downloaded again', async () => {
		jest.mocked(getNetworkStateAsync).mockResolvedValue(CELLULAR);
		jest.mocked(File.downloadFileAsync).mockClear();
		await setCacheArea('home', LJUBLJANA);

		await syncNow(api(fx.syncSnapshot));
		expect(File.downloadFileAsync).not.toHaveBeenCalled();

		localStorage.setItem('cache.mobile_photos', 'true');
		await syncNow(api({ ...fx.syncSnapshot, upserts: [] }));
		expect(File.downloadFileAsync).toHaveBeenCalledTimes(1);

		await syncNow(
			api({ ...fx.syncSnapshot, upserts: [{ ...lost, thumb_url: 'https://media.zivali.test/v2.webp' }] })
		);
		expect(File.downloadFileAsync).toHaveBeenLastCalledWith(
			'https://media.zivali.test/v2.webp',
			expect.anything(),
			{ idempotent: true }
		);
	});
});

describe('limits', () => {
	test('settings come from Settings → Offline data with the C17 defaults', () => {
		expect(cacheSettings()).toEqual({ maxMb: 50, maxAgeDays: 7, mobilePhotos: false });
		localStorage.setItem('cache.max_mb', '100');
		localStorage.setItem('cache.max_age_days', '3');
		expect(cacheSettings()).toEqual({ maxMb: 100, maxAgeDays: 3, mobilePhotos: false });
	});

	test('rows not seen for max_age_days go first', async () => {
		await upsertReports([report('fresh')], NOW - 6 * DAY);
		await upsertReports([report('stale')], NOW - 8 * DAY);

		await enforceLimits();

		expect(await ids()).toEqual(['fresh']);
	});

	test('over the size budget the farthest go first, then the oldest, thumbnails included', async () => {
		await setCacheArea('home', LJUBLJANA);
		const at = (km: number) => ({ lat: 46.06 + km / 111.32, lng: 14.51, radius_m: 500 });
		await upsertReports([
			report('near', { area: at(0), thumb_url: 'https://media.zivali.test/near.webp' }),
			report('mid', { area: at(20), thumb_url: 'https://media.zivali.test/mid.webp' }),
			report('far-old', { area: at(50), event_at: '2026-09-01T00:00:00Z' }),
			report('far-new', { area: at(50), event_at: '2026-10-01T00:00:00Z' }),
		]);
		await syncNow(api({ ...fx.syncSnapshot, upserts: [] })); // downloads the two thumbnails (1000 B each)

		// Four rows of 1 KiB plus 2000 B of thumbnails; 3100 B keeps near (2024 B) only once mid's photo counts.
		await enforceLimits({ maxMb: 3100 / 1024 / 1024, maxAgeDays: 7, mobilePhotos: false });

		expect(await ids()).toEqual(['near']);
		expect(thumbsDir.list().map((entry) => entry.name)).toEqual(['near']);
	});

	test('far-from-both-areas and old: with room for two, the far old one goes before the far new one', async () => {
		await setCacheArea('home', LJUBLJANA);
		const at = (km: number) => ({ lat: 46.06 + km / 111.32, lng: 14.51, radius_m: 500 });
		await upsertReports([
			report('near', { area: at(1) }),
			report('far-old', { area: at(50), event_at: '2026-09-01T00:00:00Z' }),
			report('far-new', { area: at(50), event_at: '2026-10-01T00:00:00Z' }),
		]);

		await enforceLimits({ maxMb: 2100 / 1024 / 1024, maxAgeDays: 7, mobilePhotos: false });

		expect(await ids()).toEqual(['far-new', 'near']);
	});
});

describe('triggers', () => {
	let onAppState: (state: AppStateStatus) => void;
	let stop: () => void;
	const syncCalls = (client: ReturnType<typeof api>) =>
		client.calls.filter((call) => call.path === '/v1/sync/reports').length;

	beforeEach(async () => {
		jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, listener) => {
			onAppState = listener as typeof onAppState;
			return { remove: jest.fn() };
		});
		await setCacheArea('home', LJUBLJANA);
	});
	afterEach(() => stop());

	test('launch syncs a stale cache and registers the background task', async () => {
		const client = api(fx.syncSnapshot);

		stop = startCacheSync(client);
		await flush();

		expect(syncCalls(client)).toBe(1);
		expect(BackgroundTask.registerTaskAsync).toHaveBeenCalledWith(SYNC_TASK, { minimumInterval: 60 });
	});

	test('foreground resume syncs only when the last sync is older than 15 minutes', async () => {
		const client = api(fx.syncSnapshot);
		jest.mocked(refreshGeofences).mockClear();
		stop = startCacheSync(client);
		await flush();
		// Every sync re-picks the geofences (C17).
		expect(refreshGeofences).toHaveBeenCalledTimes(1);

		jest.mocked(Date.now).mockReturnValue(NOW + 10 * MINUTE);
		onAppState('active');
		await flush();
		expect(syncCalls(client)).toBe(1);
		// A fresh cache still re-picks them, which notices a revoked Always permission.
		expect(refreshGeofences).toHaveBeenCalledTimes(2);

		jest.mocked(Date.now).mockReturnValue(NOW + 16 * MINUTE);
		onAppState('active');
		await flush();
		expect(syncCalls(client)).toBe(2);
		expect(refreshGeofences).toHaveBeenCalledTimes(3);
	});

	test('regaining an unmetered connection syncs; mobile data does not', async () => {
		const client = api(fx.syncSnapshot);
		stop = startCacheSync(client);
		await flush();

		mockNetwork(CELLULAR);
		await flush();
		expect(syncCalls(client)).toBe(1);

		mockNetwork(WIFI);
		await flush();
		expect(syncCalls(client)).toBe(2);

		mockNetwork(WIFI);
		await flush();
		expect(syncCalls(client)).toBe(2);
	});
});

describe('background task', () => {
	const fetchMock = jest.fn(
		async () => new Response(JSON.stringify(fx.syncSnapshot), { headers: { 'Content-Type': 'application/json' } })
	);
	beforeAll(() => {
		globalThis.fetch = fetchMock as unknown as typeof fetch;
	});
	beforeEach(async () => {
		fetchMock.mockClear();
		await setCacheArea('home', LJUBLJANA);
	});

	test('is defined at module scope', () => {
		expect(TaskManager.defineTask).toHaveBeenCalledWith(SYNC_TASK, expect.any(Function));
	});

	test('on mobile data it does nothing', async () => {
		jest.mocked(getNetworkStateAsync).mockResolvedValue(CELLULAR);

		expect(await backgroundTask()).toBe(BackgroundTask.BackgroundTaskResult.Success);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	test('on Wi-Fi it syncs the public feed without a session token', async () => {
		expect(await backgroundTask()).toBe(BackgroundTask.BackgroundTaskResult.Success);

		const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
		expect(url).toMatch(/^http:\/\/api\.default\/v1\/sync\/reports\?/);
		expect(init.headers).not.toHaveProperty('Authorization');
		expect(await ids()).toHaveLength(2);
	});

	test('a fresh cache is left alone', async () => {
		await backgroundTask();
		fetchMock.mockClear();
		jest.mocked(Date.now).mockReturnValue(NOW + 5 * MINUTE);

		expect(await backgroundTask()).toBe(BackgroundTask.BackgroundTaskResult.Success);
		expect(fetchMock).not.toHaveBeenCalled();
	});
});
