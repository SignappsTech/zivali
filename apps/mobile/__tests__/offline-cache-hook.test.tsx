import { skipToken } from '@reduxjs/toolkit/query';
import { renderHook } from '@testing-library/react-native';

import { anonymousMe, me } from '@zivali/api/__fixtures__/me';
import { useSession } from '@zivali/api/auth';
import { useListMyReportsInfiniteQuery } from '@zivali/api/reports';
import { cacheOwnReports, cacheQuietHours } from '@/lib/offline/geofence';
import { setCacheArea, startCacheSync } from '@/lib/offline/sync';
import { useOfflineCache } from '@/lib/offline/use-offline-cache';

jest.mock('@zivali/api/auth', () => ({ useSession: jest.fn() }));
jest.mock('@zivali/api/reports', () => ({ useListMyReportsInfiniteQuery: jest.fn(() => ({ data: undefined })) }));
jest.mock('@/lib/offline/geofence', () => ({ cacheOwnReports: jest.fn(), cacheQuietHours: jest.fn() }));
jest.mock('@/lib/offline/sync', () => ({
	AREA_MAX_KM: 10,
	setCacheArea: jest.fn(async () => {}),
	startCacheSync: jest.fn(() => jest.fn()),
}));

const session = (value: typeof me | null) => jest.mocked(useSession).mockReturnValue({ me: value } as never);

beforeEach(() => jest.clearAllMocks());

test('starts the sync once and caches the profile home area', async () => {
	session(me);
	const { rerender } = await renderHook(() => useOfflineCache());
	await rerender({});

	expect(startCacheSync).toHaveBeenCalledTimes(1);
	expect(setCacheArea).toHaveBeenCalledTimes(1);
	expect(setCacheArea).toHaveBeenCalledWith('home', me.home, me.home_radius_km);
});

test.each([
	['signed out', null],
	['anonymous', anonymousMe],
])('no home area when %s', async (_name, value) => {
	session(value);
	await renderHook(() => useOfflineCache());

	expect(setCacheArea).toHaveBeenCalledWith('home', null, expect.any(Number));
});

test('caches the profile quiet hours for the geofence handler; no profile keeps the cached ones', async () => {
	session({ ...me, quiet_from: '22:00', quiet_to: '07:00' });
	await renderHook(() => useOfflineCache());
	expect(cacheQuietHours).toHaveBeenCalledWith({ quiet_from: '22:00', quiet_to: '07:00' });

	jest.mocked(cacheQuietHours).mockClear();
	session(null); // offline start or signed out (the wipe forgets them on sign-out)
	await renderHook(() => useOfflineCache());
	expect(cacheQuietHours).not.toHaveBeenCalled();
});

test('caches the account own report ids for the geofence handler; anonymous and signed out fetch none', async () => {
	const page = (...ids: string[]) => ({ items: ids.map((id) => ({ id })), next_cursor: null });
	const mine = jest.mocked(useListMyReportsInfiniteQuery);
	mine.mockReturnValue({ data: { pages: [page('rep-1', 'rep-2')], pageParams: [null] } } as never);
	session(me);
	const { rerender } = await renderHook(() => useOfflineCache());
	expect(mine).toHaveBeenLastCalledWith(undefined);
	expect(cacheOwnReports).toHaveBeenCalledWith(['rep-1', 'rep-2']);

	// A refetch with the same reports writes nothing; none left is an empty list.
	await rerender({});
	expect(cacheOwnReports).toHaveBeenCalledTimes(1);
	mine.mockReturnValue({ data: { pages: [page()], pageParams: [null] } } as never);
	await rerender({});
	expect(cacheOwnReports).toHaveBeenLastCalledWith([]);

	mine.mockReturnValue({ data: undefined } as never);
	jest.mocked(cacheOwnReports).mockClear();
	for (const value of [anonymousMe, null]) {
		session(value);
		await renderHook(() => useOfflineCache());
		expect(mine).toHaveBeenLastCalledWith(skipToken);
	}
	expect(cacheOwnReports).not.toHaveBeenCalled();
});

test('unsubscribes on unmount', async () => {
	session(me);
	const stop = jest.fn();
	jest.mocked(startCacheSync).mockReturnValueOnce(stop);
	const { unmount } = await renderHook(() => useOfflineCache());
	await unmount();

	expect(stop).toHaveBeenCalled();
});
