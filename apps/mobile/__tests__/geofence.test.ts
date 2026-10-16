import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';

import { getDb } from '@/lib/db';
import {
	cacheOwnReports,
	cacheQuietHours,
	DAILY_CAP,
	enableGeofencing,
	GEOFENCE_TASK,
	geofenceState,
	refreshGeofences,
	stopGeofencing,
} from '@/lib/offline/geofence';
import { listManageTokenIds } from '@/lib/offline/outbox';

jest.mock('expo-sqlite', () =>
	jest.requireActual<typeof import('@/test/offline-mocks')>('@/test/offline-mocks').sqlite()
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
// The OS side of geofencing: the regions registered for the task, or null when it is stopped.
let mockRegions: Location.LocationRegion[] | null = null;
jest.mock('expo-location', () => ({
	Accuracy: { Balanced: 3 },
	GeofencingEventType: { Enter: 1, Exit: 2 },
	getLastKnownPositionAsync: jest.fn(),
	getCurrentPositionAsync: jest.fn(),
	startGeofencingAsync: jest.fn(async (_task: string, regions: Location.LocationRegion[]) => {
		mockRegions = regions;
	}),
	stopGeofencingAsync: jest.fn(async () => {
		mockRegions = null;
	}),
	hasStartedGeofencingAsync: jest.fn(async () => mockRegions !== null),
	getBackgroundPermissionsAsync: jest.fn(),
	requestForegroundPermissionsAsync: jest.fn(),
	requestBackgroundPermissionsAsync: jest.fn(),
}));
jest.mock('expo-notifications', () => ({
	AndroidImportance: { DEFAULT: 3 },
	getPermissionsAsync: jest.fn(),
	setNotificationChannelAsync: jest.fn(async () => null),
	scheduleNotificationAsync: jest.fn(async () => 'id'),
}));
jest.mock('expo-task-manager', () => ({ defineTask: jest.fn() }));
// Reports sent or claimed on this device (their manage tokens, in the keychain).
jest.mock('@/lib/offline/outbox', () => ({ listManageTokenIds: jest.fn() }));

const NOW = Date.parse('2026-10-15T08:00:00Z'); // 10:00 in Ljubljana
const DAY = 86_400_000;
const YESTERDAY = '2026-10-14T15:00:00Z';
const DEVICE = { lat: 46.05123, lng: 14.50567 };
const GRANTED = { granted: true };
const DENIED = { granted: false };

const handler = jest.mocked(TaskManager.defineTask).mock.calls.find(([name]) => name === GEOFENCE_TASK)![1];
const event = (eventType: number, identifier: string) =>
	handler({
		data: { eventType, region: { identifier } },
		error: null,
		executionInfo: { eventId: '1', taskName: '' },
	});
const enter = (id: string) => event(Location.GeofencingEventType.Enter, id);
const exit = (id: string) => event(Location.GeofencingEventType.Exit, id);
const at = (lat: number, lng: number) => ({ coords: { latitude: lat, longitude: lng } }) as Location.LocationObject;

type Cached = { id: string; km?: number; type?: string; status?: string; species?: string; name?: string | null };
type CachedAt = Cached & { event_at?: string; radius_m?: number };
/** Cached reports `km` north of the device, with the fields the engine reads. */
async function cache(...reports: CachedAt[]) {
	const db = await getDb();
	for (const r of reports) {
		await db.runAsync(
			`insert into reports_cache (id, short_code, type, status, species, name, event_at, area_lat, area_lng,
				area_radius_m, updated_at, synced_at) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			r.id,
			`code-${r.id}`,
			r.type ?? 'lost',
			r.status ?? 'open',
			r.species ?? 'dog',
			r.name ?? null,
			r.event_at ?? YESTERDAY,
			DEVICE.lat + (r.km ?? 1) / 111.32,
			DEVICE.lng,
			r.radius_m ?? 500,
			YESTERDAY,
			NOW
		);
	}
}
const many = (n: number) =>
	Array.from({ length: n }, (_, i) => ({ id: `r${String(i + 1).padStart(2, '0')}`, km: i + 1 }));
const registered = () => mockRegions?.map((r) => r.identifier);
const all = async <T>(sql: string) => (await getDb()).getAllAsync<T>(sql);
const notified = () => jest.mocked(Notifications.scheduleNotificationAsync).mock.calls.map(([request]) => request);

beforeAll(() => {
	globalThis.fetch = jest.fn();
});
beforeEach(async () => {
	jest.clearAllMocks();
	jest.spyOn(Date, 'now').mockReturnValue(NOW);
	jest.replaceProperty(Platform, 'OS', 'ios');
	mockRegions = null;
	mockStorage.clear();
	mockStorage.set('locale', 'en');
	jest.mocked(Location.getLastKnownPositionAsync).mockResolvedValue(at(DEVICE.lat, DEVICE.lng));
	jest.mocked(Location.requestForegroundPermissionsAsync).mockResolvedValue(GRANTED as never);
	jest.mocked(Location.requestBackgroundPermissionsAsync).mockResolvedValue(GRANTED as never);
	jest.mocked(Location.getBackgroundPermissionsAsync).mockResolvedValue(GRANTED as never);
	jest.mocked(Notifications.getPermissionsAsync).mockResolvedValue(GRANTED as never);
	jest.mocked(listManageTokenIds).mockResolvedValue([]);
	await (await getDb()).execAsync('delete from reports_cache; delete from geofences; delete from geofence_events;');
});
// C17, FR-043 R-043.5: nothing in this engine talks to the network; the position never leaves the device.
afterEach(() => expect(globalThis.fetch).not.toHaveBeenCalled());

describe('region selection', () => {
	test('open lost areas, nearest (whole km) then most recent, plus the 2 km boundary whose exit re-runs it', async () => {
		await cache(
			{ id: 'far', km: 5, event_at: '2026-10-14T20:00:00Z' },
			{ id: 'old', km: 2.2, event_at: '2026-10-01T08:00:00Z' },
			{ id: 'new', km: 1.8, event_at: '2026-10-14T08:00:00Z' },
			{ id: 'near', km: 0.3, event_at: '2026-10-01T08:00:00Z', radius_m: 150 },
			{ id: 'closed', km: 0.1, status: 'closed' },
			{ id: 'reunited', km: 0.1, status: 'reunited' },
			{ id: 'found', km: 0.1, type: 'found' },
			{ id: 'alerted', km: 0.2 }
		);
		await enter('alerted'); // once per pet per area: an area that alerted takes no slot

		expect(await enableGeofencing()).toBe(true);

		expect(registered()).toEqual(['near', 'new', 'old', 'far', 'boundary']);
		const [near] = mockRegions!;
		// Only the public fuzzed area is monitored, at least 200 m wide.
		expect(near).toEqual({
			identifier: 'near',
			latitude: DEVICE.lat + 0.3 / 111.32,
			longitude: DEVICE.lng,
			radius: 200,
			notifyOnEnter: true,
			notifyOnExit: false,
		});
		expect(mockRegions!.at(-1)).toEqual({
			identifier: 'boundary',
			latitude: 46.051,
			longitude: 14.506,
			radius: 2000,
			notifyOnEnter: false,
			notifyOnExit: true,
		});
		const rows = await all<{ region_id: string; short_code: string | null }>(
			'select region_id, short_code from geofences order by region_id'
		);
		expect(rows).toEqual([
			{ region_id: 'boundary', short_code: null },
			{ region_id: 'far', short_code: 'code-far' },
			{ region_id: 'near', short_code: 'code-near' },
			{ region_id: 'new', short_code: 'code-new' },
			{ region_id: 'old', short_code: 'code-old' },
		]);
		// The only device position on disk is the boundary centre, to about 100 m.
		expect(
			await all("select lat, lng, radius_m, registered_at from geofences where region_id = 'boundary'")
		).toEqual([{ lat: 46.051, lng: 14.506, radius_m: 2000, registered_at: NOW }]);
	});

	test.each([
		['ios', 25, 18],
		['android', 60, 50],
	] as const)('%s: of %i cached areas, the nearest %i plus the boundary', async (os, cached, limit) => {
		jest.replaceProperty(Platform, 'OS', os);
		await cache(...many(cached));

		await enableGeofencing();

		expect(registered()).toEqual([...many(limit).map((r) => r.id), 'boundary']);
	});

	test("the user's own reports take no region: manage tokens on this device and the account's own", async () => {
		await cache({ id: 'sent-here', km: 0.2 }, { id: 'mine', km: 0.3 }, { id: 'other', km: 0.4 });
		jest.mocked(listManageTokenIds).mockResolvedValue(['sent-here']);
		cacheOwnReports(['mine']);

		await enableGeofencing();

		expect(registered()).toEqual(['other', 'boundary']);
	});

	test('declining either location prompt registers nothing', async () => {
		await cache({ id: 'a' });
		jest.mocked(Location.requestBackgroundPermissionsAsync).mockResolvedValueOnce(DENIED as never);
		expect(await enableGeofencing()).toBe(false);

		jest.mocked(Location.requestForegroundPermissionsAsync).mockResolvedValueOnce(DENIED as never);
		expect(await enableGeofencing()).toBe(false);
		expect(Location.requestBackgroundPermissionsAsync).toHaveBeenCalledTimes(1);

		expect(Location.startGeofencingAsync).not.toHaveBeenCalled();
		expect(Location.getLastKnownPositionAsync).not.toHaveBeenCalled();
	});

	test('without a recent fix it takes one balanced fix, never continuous updates', async () => {
		jest.mocked(Location.getLastKnownPositionAsync).mockResolvedValueOnce(null);
		jest.mocked(Location.getCurrentPositionAsync).mockResolvedValueOnce(at(DEVICE.lat, DEVICE.lng));

		await enableGeofencing();

		expect(Location.getCurrentPositionAsync).toHaveBeenCalledWith({ accuracy: Location.Accuracy.Balanced });
		expect(registered()).toEqual(['boundary']);
	});

	test('leaving the boundary re-runs the selection around the new position; refresh does nothing while off', async () => {
		expect(await refreshGeofences()).toBe('off');
		expect(await geofenceState()).toBe('off');
		expect(Location.getLastKnownPositionAsync).not.toHaveBeenCalled();

		await cache({ id: 'home', km: 0.5 }, { id: 'away', km: 4 });
		await enableGeofencing();
		expect(registered()).toEqual(['home', 'away', 'boundary']);

		// 4 km north: 'away' is now the nearest.
		jest.mocked(Location.getLastKnownPositionAsync).mockResolvedValue(at(DEVICE.lat + 4 / 111.32, DEVICE.lng));
		await enter('boundary'); // the boundary only reacts to exits
		await exit('away'); // report regions only to entries
		expect(Location.startGeofencingAsync).toHaveBeenCalledTimes(1);

		await exit('boundary');
		expect(registered()).toEqual(['away', 'home', 'boundary']);
		expect(mockRegions!.at(-1)).toMatchObject({ latitude: 46.087, longitude: 14.506 });
	});
});

describe('handler', () => {
	beforeEach(() => enableGeofencing());

	test('entering an open area shows the local alert with a deep link to the listing, once per pet per area', async () => {
		await cache({ id: 'maks', name: 'Maks' });

		await enter('maks');
		await enter('maks');

		expect(notified()).toEqual([
			{
				content: {
					title: 'Lost dog nearby',
					body: 'You are near where Maks was last seen yesterday, keep an eye out.',
					data: { url: 'zivali://r/code-maks', category: 'nearby_local' },
				},
				trigger: { channelId: 'nearby_local' },
			},
		]);
		expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledWith('nearby_local', {
			name: 'Nearby reminders',
			importance: Notifications.AndroidImportance.DEFAULT,
		});

		// The owner moved the area: a new area alerts again.
		await (await getDb()).runAsync("update reports_cache set area_lat = area_lat + 0.01 where id = 'maks'");
		await enter('maks');
		expect(notified()).toHaveLength(2);
	});

	test('Slovenian copy without a name', async () => {
		mockStorage.set('locale', 'sl');
		await cache({ id: 'muca', species: 'cat' });

		await enter('muca');

		expect(notified()[0]!.content).toMatchObject({
			title: 'Izgubljena mačka v bližini',
			body: 'Ste v bližini mesta, kjer je bila včeraj nazadnje videna mačka. Bodite pozorni.',
		});
	});

	test('skips reports no longer open or gone from the cache', async () => {
		await cache({ id: 'home-again', status: 'reunited' }, { id: 'closed', status: 'closed' });

		await enter('home-again');
		await enter('closed');
		await enter('evicted');

		expect(notified()).toEqual([]);
		expect(await all('select * from geofence_events')).toEqual([]);
	});

	test("never alerts about the user's own reports, also from a region registered before they were known", async () => {
		await cache({ id: 'sent-here' }, { id: 'mine' });
		jest.mocked(listManageTokenIds).mockResolvedValue(['sent-here']);
		cacheOwnReports(['mine']);

		await enter('sent-here');
		await enter('mine');

		expect(notified()).toEqual([]);
		expect(await all('select * from geofence_events')).toEqual([]);
	});

	test('a notification that fails to show frees its claim: the pet can still alert and the cap is not spent', async () => {
		await cache(...many(DAILY_CAP + 1));
		jest.mocked(Notifications.scheduleNotificationAsync).mockRejectedValueOnce(new Error('scheduler down'));

		await expect(enter('r01')).rejects.toThrow('scheduler down');
		expect(await all('select * from geofence_events')).toEqual([]);

		for (const r of many(DAILY_CAP + 1)) await enter(r.id);
		const events = await all<{ report_id: string }>('select report_id from geofence_events order by report_id');
		expect(events.map((e) => e.report_id)).toEqual(['r01', 'r02', 'r03']);
		expect(notified()).toHaveLength(1 + DAILY_CAP); // the failed try, then the full cap
	});

	test(`at most ${DAILY_CAP} alerts a day`, async () => {
		await cache(...many(5));

		for (const r of many(4)) await enter(r.id);
		expect(notified()).toHaveLength(DAILY_CAP);

		jest.mocked(Date.now).mockReturnValue(NOW + DAY);
		await enter('r05');
		expect(notified()).toHaveLength(DAILY_CAP + 1);
	});

	test('cached quiet hours (Europe/Ljubljana, across midnight) hold the alert for a later entry', async () => {
		cacheQuietHours({ quiet_from: '22:00', quiet_to: '07:00' });
		await cache({ id: 'night' });

		jest.mocked(Date.now).mockReturnValue(Date.parse('2026-10-15T21:30:00Z')); // 23:30
		await enter('night');
		jest.mocked(Date.now).mockReturnValue(Date.parse('2026-10-16T04:59:00Z')); // 06:59
		await enter('night');
		expect(notified()).toEqual([]);

		jest.mocked(Date.now).mockReturnValue(Date.parse('2026-10-16T05:00:00Z')); // 07:00
		await enter('night');
		expect(notified()).toHaveLength(1);
	});

	test('quiet hours forgotten (sign-out) no longer apply', async () => {
		cacheQuietHours({ quiet_from: '09:00', quiet_to: '11:00' });
		await cache({ id: 'day' });
		await enter('day');
		expect(notified()).toEqual([]);

		cacheQuietHours(null);
		await enter('day');
		expect(notified()).toHaveLength(1);
	});

	test('with notifications off nothing is shown or counted', async () => {
		jest.mocked(Notifications.getPermissionsAsync).mockResolvedValueOnce(DENIED as never);
		await cache({ id: 'a' });

		await enter('a');
		expect(notified()).toEqual([]);
		await enter('a');
		expect(notified()).toHaveLength(1);
	});
});

describe('cleanup', () => {
	beforeEach(async () => {
		await cache({ id: 'a' });
		await enableGeofencing();
	});
	const regionRows = async () => (await all('select * from geofences')).length;

	test('the off switch (and the wipe on sign-out) stops geofencing and clears the regions', async () => {
		expect(await regionRows()).toBe(2);

		await stopGeofencing();

		expect(Location.stopGeofencingAsync).toHaveBeenCalledWith(GEOFENCE_TASK);
		expect(mockRegions).toBeNull();
		expect(await regionRows()).toBe(0);
		// Stopping again does not call the OS for a task it does not run.
		await stopGeofencing();
		expect(Location.stopGeofencingAsync).toHaveBeenCalledTimes(1);
	});

	test('losing the Always permission stops geofencing on the next refresh', async () => {
		jest.mocked(Location.getBackgroundPermissionsAsync).mockResolvedValue(DENIED as never);

		expect(await refreshGeofences()).toBe('permission_lost');

		expect(mockRegions).toBeNull();
		expect(await regionRows()).toBe(0);
		expect(await refreshGeofences()).toBe('off');
	});

	test('settings state: on, then a revoked Always permission stops it and stays explained until the switch is used', async () => {
		jest.mocked(Location.getLastKnownPositionAsync).mockClear();
		expect(await geofenceState()).toBe('on');

		jest.mocked(Location.getBackgroundPermissionsAsync).mockResolvedValue(DENIED as never);
		expect(await geofenceState()).toBe('permission_lost');
		expect(mockRegions).toBeNull();
		expect(await regionRows()).toBe(0);
		// The next visit (or app start) still explains it; reading the state never asks for a position.
		expect(await geofenceState()).toBe('permission_lost');
		expect(Location.getLastKnownPositionAsync).not.toHaveBeenCalled();

		await stopGeofencing();
		expect(await geofenceState()).toBe('off');
	});

	test('a revocation a refresh noticed first is explained too; turning on again clears it', async () => {
		jest.mocked(Location.getBackgroundPermissionsAsync).mockResolvedValue(DENIED as never);
		await refreshGeofences();
		expect(await geofenceState()).toBe('permission_lost');

		jest.mocked(Location.requestBackgroundPermissionsAsync).mockResolvedValueOnce(DENIED as never);
		expect(await enableGeofencing()).toBe(false);
		expect(await geofenceState()).toBe('off');
	});

	test('a stop during a selection in flight leaves nothing registered', async () => {
		let resolveFix: (fix: Location.LocationObject) => void = () => {};
		jest.mocked(Location.getLastKnownPositionAsync).mockReturnValueOnce(
			new Promise((resolve) => (resolveFix = resolve))
		);
		const refresh = refreshGeofences();
		const stop = stopGeofencing();
		resolveFix(at(DEVICE.lat, DEVICE.lng));
		await Promise.all([refresh, stop]);

		expect(mockRegions).toBeNull();
		expect(await regionRows()).toBe(0);
	});
});
