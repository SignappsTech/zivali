import { renderHook } from '@testing-library/react-native';

import { anonymousMe, me } from '@zivali/api/__fixtures__/me';
import { useSession } from '@zivali/api/auth';
import { cacheQuietHours } from '@/lib/offline/geofence';
import { setCacheArea, startCacheSync } from '@/lib/offline/sync';
import { useOfflineCache } from '@/lib/offline/use-offline-cache';

jest.mock('@zivali/api/auth', () => ({ useSession: jest.fn() }));
jest.mock('@/lib/offline/geofence', () => ({ cacheQuietHours: jest.fn() }));
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

test('unsubscribes on unmount', async () => {
	session(me);
	const stop = jest.fn();
	jest.mocked(startCacheSync).mockReturnValueOnce(stop);
	const { unmount } = await renderHook(() => useOfflineCache());
	await unmount();

	expect(stop).toHaveBeenCalled();
});
