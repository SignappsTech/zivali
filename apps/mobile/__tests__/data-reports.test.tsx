/// <reference types="node" />
import { renderHook, waitFor } from '@testing-library/react-native';
import { useNetworkState } from 'expo-network';
import type { ReactNode } from 'react';
import { Provider } from 'react-redux';

import * as fx from '@zivali/api/__fixtures__/reports';
import { createMockApi, type MockRoutes } from '@zivali/api/mock';
import { api, createApiStore } from '@zivali/api/rtk';
import { useMapReports, useReport, useReportSearch } from '@/lib/data/reports';
import { getDb } from '@/lib/db';
import { setCacheArea, upsertReports } from '@/lib/offline/sync';

jest.mock('expo-sqlite', () =>
	jest.requireActual<typeof import('@/test/offline-mocks')>('@/test/offline-mocks').sqlite()
);
jest.mock('expo-file-system', () =>
	jest.requireActual<typeof import('@/test/offline-mocks')>('@/test/offline-mocks').fileSystem()
);
jest.mock('expo-sqlite/localStorage/install', () => ({}));
jest.mock('expo-network', () => ({
	NetworkStateType: { WIFI: 'WIFI', ETHERNET: 'ETHERNET' },
	addNetworkStateListener: jest.fn(),
	getNetworkStateAsync: jest.fn(),
	useNetworkState: jest.fn(),
}));
jest.mock('expo-task-manager', () => ({ defineTask: jest.fn() }));
jest.mock('expo-background-task', () => ({ BackgroundTaskResult: { Success: 1, Failed: 2 } }));
jest.mock('@/lib/env', () => ({ env: { EXPO_PUBLIC_API_URL: 'http://api.default' } }));

const ONLINE = { isConnected: true, isInternetReachable: true };
const OFFLINE = { isConnected: false, isInternetReachable: false };
const SYNCED_AT = Date.parse('2026-10-15T08:00:00Z');
const BBOX: [number, number, number, number] = [14.4, 46.0, 14.6, 46.1];
const [lost, found] = fx.syncSnapshot.upserts as [
	(typeof fx.syncSnapshot.upserts)[0],
	(typeof fx.syncSnapshot.upserts)[0],
];

const stores: ReturnType<typeof createApiStore>[] = [];
function setup(routes: MockRoutes = {}) {
	const client = createMockApi(routes);
	const store = createApiStore(client);
	stores.push(store);
	const wrapper = ({ children }: { children: ReactNode }) => <Provider store={store}>{children}</Provider>;
	return { client, wrapper };
}

beforeEach(async () => {
	jest.mocked(useNetworkState).mockReturnValue(ONLINE);
	await (await getDb()).execAsync('delete from reports_cache; delete from cache_areas;');
	await upsertReports(fx.syncSnapshot.upserts);
	await setCacheArea('home', lost.area);
	await (await getDb()).runAsync('update cache_areas set last_sync_at = ?', SYNCED_AT);
});
afterEach(() => {
	for (const store of stores) store.dispatch(api.util.resetApiState());
	stores.length = 0;
});

describe('offline', () => {
	beforeEach(() => jest.mocked(useNetworkState).mockReturnValue(OFFLINE));

	test('the map reads the cache inside the bbox, with source and last sync, and makes no request', async () => {
		const { client, wrapper } = setup();

		const { result } = await renderHook(() => useMapReports({ bbox: BBOX, types: ['lost'] }), { wrapper });

		await waitFor(() => expect(result.current.isLoading).toBe(false));
		expect(result.current).toMatchObject({ source: 'cache', lastSyncAt: SYNCED_AT });
		expect(result.current.data?.items).toEqual([
			{
				id: lost.id,
				short_code: lost.short_code,
				type: 'lost',
				species: 'dog',
				area: lost.area,
				boosted: true,
				thumb_url: lost.thumb_url,
			},
		]);
		expect(client.calls).toEqual([]);
	});

	test('the list filters and sorts the cache by distance', async () => {
		const { wrapper } = setup();
		const near = { lat: found.area.lat, lng: found.area.lng, km: 5 };

		const { result } = await renderHook(() => useReportSearch({ near, sort: 'distance' }), { wrapper });

		await waitFor(() => expect(result.current.isLoading).toBe(false));
		expect(result.current.data?.map((r) => r.short_code)).toEqual([found.short_code, lost.short_code]);
		expect(result.current.data?.[1]).toEqual(lost);
		expect(result.current.hasNextPage).toBe(false);
	});

	test('a detail comes from the cache by short code', async () => {
		const { wrapper } = setup();

		const { result } = await renderHook(() => useReport(found.short_code), { wrapper });

		await waitFor(() => expect(result.current.isLoading).toBe(false));
		expect(result.current).toMatchObject({ source: 'cache', data: found });
	});
});

describe('online', () => {
	test('the list comes from the network and upserts only the public fields into the cache', async () => {
		const { wrapper } = setup({
			'GET /v1/reports': {
				items: [{ ...fx.ownerReport, short_code: 'Own1Abcd', id: 'own-1' }],
				next_cursor: null,
			},
		});

		const { result } = await renderHook(() => useReportSearch({ bbox: BBOX }), { wrapper });

		await waitFor(() => expect(result.current.data).toHaveLength(1));
		expect(result.current).toMatchObject({ source: 'network', lastSyncAt: SYNCED_AT });
		expect(result.current.data![0]).toMatchObject({
			short_code: 'Own1Abcd',
			thumb_url: fx.publicReport.photos[0]!.thumb_url,
		});
		await waitFor(async () =>
			expect(await (await getDb()).getAllAsync(`select * from reports_cache where id = 'own-1'`)).toHaveLength(1)
		);
		const dump = JSON.stringify(await (await getDb()).getAllAsync('select * from reports_cache'));
		expect(dump).not.toContain(String(fx.ownerReport.location.lat));
		expect(dump).not.toContain(fx.ownerReport.collar!);
	});

	test('a detail comes from the network', async () => {
		const { wrapper } = setup({ 'GET /v1/reports/:code': fx.publicReport });

		const { result } = await renderHook(() => useReport(fx.publicReport.short_code), { wrapper });

		await waitFor(() => expect(result.current.data).toEqual(fx.publicReport));
		expect(result.current.source).toBe('network');
	});

	test('a request that fails for lack of network falls back to the cache', async () => {
		const { wrapper } = setup({
			'GET /v1/reports/map': () => {
				throw new TypeError('Network request failed');
			},
		});

		const { result } = await renderHook(() => useMapReports({ bbox: BBOX }), { wrapper });

		await waitFor(() => expect(result.current.source).toBe('cache'), { timeout: 8000 });
		await waitFor(() => expect(result.current.data?.items).toHaveLength(2));
	}, 15000);

	test('other errors stay network errors', async () => {
		const { wrapper } = setup();

		const { result } = await renderHook(() => useReport('Gone1234'), { wrapper });

		await waitFor(() => expect(result.current.error?.data.code).toBe('NOT_FOUND'));
		expect(result.current.source).toBe('network');
	});
});
