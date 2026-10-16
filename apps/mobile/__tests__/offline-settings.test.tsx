import { PortalHost } from '@rn-primitives/portal';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as React from 'react';
import { IntlProvider } from 'use-intl';

import * as fx from '@zivali/api/__fixtures__/reports';
import sl from '@zivali/i18n/dist/sl.json';
import OfflineDataSettings from '@/app/settings/offline';
import { toast } from '@/components/ui/sonner';
import { toCached } from '@/lib/data/reports';
import { getDb } from '@/lib/db';
import { cacheSettings, upsertReports } from '@/lib/offline/sync';
import { wipeLocalData } from '@/lib/offline/wipe';

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
jest.mock('expo-network', () => ({ addNetworkStateListener: jest.fn(), getNetworkStateAsync: jest.fn() }));
jest.mock('expo-task-manager', () => ({ defineTask: jest.fn() }));
jest.mock('expo-background-task', () => ({ BackgroundTaskResult: { Success: 1, Failed: 2 } }));
jest.mock('@/lib/offline/geofence', () => ({ refreshGeofences: jest.fn() }));
jest.mock('@/lib/env', () => ({ env: { EXPO_PUBLIC_API_URL: 'http://api.default' } }));
jest.mock('expo-router', () => ({ Stack: { Screen: () => null } }));
jest.mock('@/components/ui/sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
// The wipe itself has its tests (offline-store); here it empties the cache as the user_request wipe does.
jest.mock('@/lib/offline/wipe', () => ({
	wipeLocalData: jest.fn(async () => {
		const { getDb } = jest.requireActual<typeof import('@/lib/db')>('@/lib/db');
		await (await getDb()).execAsync('delete from reports_cache; delete from cache_areas;');
	}),
}));

const t = sl.profile;
const time = (at: number) =>
	new Intl.DateTimeFormat('sl', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Ljubljana' }).format(at);

const renderScreen = () =>
	render(
		<IntlProvider locale="sl" messages={sl} timeZone="Europe/Ljubljana">
			<OfflineDataSettings />
			<PortalHost />
		</IntlProvider>
	);

beforeEach(async () => {
	jest.clearAllMocks();
	mockStorage.clear();
	await (await getDb()).execAsync('delete from reports_cache; delete from cache_areas;');
});

test('shows the space used and the last update; nothing cached yet says so', async () => {
	await renderScreen();
	expect(await screen.findByText('0 MB')).toBeOnTheScreen();
	expect(screen.getByText(t.offline_updated_never)).toBeOnTheScreen();
	await screen.unmount();

	const syncedAt = Date.now() - 60_000;
	// 1,5 MB of thumbnails plus 1 kB per row.
	await upsertReports([toCached(fx.publicReport)]);
	const db = await getDb();
	await db.runAsync('update reports_cache set thumb_bytes = ?', 1.5 * 1024 * 1024 - 1024);
	await db.runAsync(
		"insert into cache_areas (id, lat, lng, radius_km, last_sync_at) values ('home', 46.06, 14.51, 10, ?)",
		syncedAt
	);
	await renderScreen();

	expect(await screen.findByText('1,5 MB')).toBeOnTheScreen();
	expect(screen.getByText(time(syncedAt))).toBeOnTheScreen();
});

test('"Use mobile data for offline photos" is off by default and is kept for the sync', async () => {
	await renderScreen();
	const toggle = screen.getByRole('switch', { name: t.offline_mobile_photos });
	expect(toggle).not.toBeChecked();
	expect(cacheSettings().mobilePhotos).toBe(false);

	await fireEvent.press(toggle);
	expect(screen.getByRole('switch', { name: t.offline_mobile_photos })).toBeChecked();
	expect(cacheSettings().mobilePhotos).toBe(true);
	await fireEvent.press(screen.getByRole('switch', { name: t.offline_mobile_photos }));
	expect(cacheSettings().mobilePhotos).toBe(false);
});

test('"Clear offline data" asks first, then wipes the cache (user_request) and shows the emptied state', async () => {
	await upsertReports([toCached(fx.publicReport)]);
	await (
		await getDb()
	).runAsync(
		"insert into cache_areas (id, lat, lng, radius_km, last_sync_at) values ('home', 46.06, 14.51, 10, ?)",
		Date.now()
	);
	await renderScreen();
	expect(await screen.findByText('0 MB')).toBeOnTheScreen();

	await fireEvent.press(screen.getByRole('button', { name: t.offline_clear }));
	expect(await screen.findByText(t.offline_clear_body)).toBeOnTheScreen();
	await fireEvent.press(screen.getByRole('button', { name: sl.common.cancel }));
	expect(wipeLocalData).not.toHaveBeenCalled();

	await fireEvent.press(screen.getByRole('button', { name: t.offline_clear }));
	await fireEvent.press(await screen.findByRole('button', { name: t.offline_clear_confirm }));

	expect(wipeLocalData).toHaveBeenCalledWith({ reason: 'user_request' });
	await waitFor(() => expect(toast.success).toHaveBeenCalledWith(t.offline_cleared));
	expect(await screen.findByText(t.offline_updated_never)).toBeOnTheScreen();
});

test('a failed wipe says so', async () => {
	jest.mocked(wipeLocalData).mockRejectedValueOnce(new Error('disk'));
	await renderScreen();

	await fireEvent.press(await screen.findByRole('button', { name: t.offline_clear }));
	await fireEvent.press(await screen.findByRole('button', { name: t.offline_clear_confirm }));

	await waitFor(() => expect(toast.error).toHaveBeenCalledWith(sl.errors.INTERNAL));
});
