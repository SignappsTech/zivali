import 'expo-sqlite/localStorage/install';
import '@/lib/plural-rules';

import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';
import { createTranslator } from 'use-intl';

import en from '@zivali/i18n/dist/en.json';
import sl from '@zivali/i18n/dist/sl.json';
import { formatRelative, timeZone } from '@zivali/i18n/format';
import { getDb } from '@/lib/db';
import { distanceKm, type Point } from '@/lib/geo';
import { getCurrentLocale } from '@/lib/i18n';
import { listManageTokenIds } from '@/lib/offline/outbox';

// Local proximity alerts (C17 §Geofences, C10, ADR-019): OS geofences around the public, fuzzed areas of cached open
// lost reports. Everything runs on the device: the position is read only to pick the nearest areas and to centre the
// boundary region, and it is never sent anywhere. The handler makes no network call.

export const GEOFENCE_TASK = 'zivali-geofence';
/** Local alerts per day (C10); the server's nearby_lost cap is separate. */
export const DAILY_CAP = 3;
const BOUNDARY = 'boundary';
const BOUNDARY_M = 2000;
const MIN_RADIUS_M = 200;
const FIX_MAX_AGE_MS = 5 * 60_000;
const CHANNEL = 'nearby_local';
// The profile's quiet hours, cached for the offline handler (C17 §Device storage).
const QUIET_KEY = 'geofence.quiet_hours';
// The account's own report ids (`/v1/me/reports`), cached the same way: no reminder is ever about them.
const OWN_KEY = 'geofence.own_reports';
// Set when a revoked Always permission stopped the feature, so the settings screen can say why; cleared by the switch.
const LOST_KEY = 'geofence.permission_lost';
/** One alert per pet per area: a moved or resized area is a new one. */
const AREA_KEY = `area_lat || ',' || area_lng || ',' || area_radius_m`;

type Region = { region_id: string; short_code: string | null; lat: number; lng: number; radius_m: number };
type GeofenceEvent = { eventType: Location.GeofencingEventType; region: Location.LocationRegion };
export type QuietHours = { quiet_from: string | null; quiet_to: string | null };
/** `permission_lost`: Always location was revoked, so the regions were removed (TASK-87.2 explains it). */
export type GeofenceState = 'off' | 'on' | 'permission_lost';

/** iOS allows 20 regions per app (18 plus the boundary leaves headroom); Android 100. */
const maxRegions = () => (Platform.OS === 'ios' ? 18 : 50);
// About 100 m: the boundary centre is the only device position kept, on the device only, until the next selection.
const round3 = (n: number) => Math.round(n * 1000) / 1000;

/** A JSON value kept in device storage; a missing or corrupt one counts as none. */
function stored<T>(key: string): T | null {
	try {
		return JSON.parse(localStorage.getItem(key) ?? 'null') as T | null;
	} catch {
		return null;
	}
}

/** Reports made or managed from this device (manage tokens) and the account's own: never a reminder about them. */
async function ownReportIds(): Promise<Set<string>> {
	return new Set([...(await listManageTokenIds()), ...(stored<string[]>(OWN_KEY) ?? [])]);
}

/**
 * Open lost areas nearest to the device (whole km), then the most recent; the user's own reports and areas that
 * already alerted are left out.
 */
async function selectRegions(device: Point): Promise<Region[]> {
	const own = await ownReportIds();
	const db = await getDb();
	const rows = await db.getAllAsync<{
		id: string;
		short_code: string;
		event_at: string;
		area_lat: number;
		area_lng: number;
		area_radius_m: number;
	}>(
		`select id, short_code, event_at, area_lat, area_lng, area_radius_m from reports_cache
		 where type = 'lost' and status = 'open' and not exists
			(select 1 from geofence_events where report_id = reports_cache.id and area_key = ${AREA_KEY})`
	);
	return rows
		.filter((r) => !own.has(r.id))
		.map((r) => ({ ...r, km: Math.round(distanceKm(device, { lat: r.area_lat, lng: r.area_lng })) }))
		.sort((a, b) => a.km - b.km || b.event_at.localeCompare(a.event_at))
		.slice(0, maxRegions())
		.map((r) => ({
			region_id: r.id,
			short_code: r.short_code,
			lat: r.area_lat,
			lng: r.area_lng,
			radius_m: Math.max(r.area_radius_m, MIN_RADIUS_M),
		}));
}

/** A recent OS fix if there is one (no GPS wake-up), else one balanced (Wi-Fi and cell) fix. Never continuous. */
async function devicePoint(): Promise<Point> {
	const fix =
		(await Location.getLastKnownPositionAsync({ maxAge: FIX_MAX_AGE_MS })) ??
		(await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
	return { lat: fix.coords.latitude, lng: fix.coords.longitude };
}

/** Replaces the registered regions with a fresh selection plus the 2 km boundary, whose exit re-runs it. */
async function register(): Promise<void> {
	const device = await devicePoint();
	const regions: Region[] = [
		...(await selectRegions(device)),
		{
			region_id: BOUNDARY,
			short_code: null,
			lat: round3(device.lat),
			lng: round3(device.lng),
			radius_m: BOUNDARY_M,
		},
	];
	await Location.startGeofencingAsync(
		GEOFENCE_TASK,
		regions.map((r) => ({
			identifier: r.region_id,
			latitude: r.lat,
			longitude: r.lng,
			radius: r.radius_m,
			notifyOnEnter: r.region_id !== BOUNDARY,
			notifyOnExit: r.region_id === BOUNDARY,
		}))
	);
	// No transaction of its own: a boundary exit may arrive while a cache sync holds one on the same connection.
	const db = await getDb();
	await db.runAsync('delete from geofences');
	await db.runAsync(
		`insert into geofences (region_id, short_code, lat, lng, radius_m, registered_at)
		 select json_extract(value, '$.region_id'), json_extract(value, '$.short_code'), json_extract(value, '$.lat'),
			json_extract(value, '$.lng'), json_extract(value, '$.radius_m'), ? from json_each(?)`,
		Date.now(),
		JSON.stringify(regions)
	);
}

async function clear(): Promise<void> {
	if (await Location.hasStartedGeofencingAsync(GEOFENCE_TASK)) await Location.stopGeofencingAsync(GEOFENCE_TASK);
	await (await getDb()).runAsync('delete from geofences');
}

/** Always location was revoked: nothing stays registered, and the settings screen explains why it is off. */
async function revoked(): Promise<'permission_lost'> {
	await clear();
	localStorage.setItem(LOST_KEY, '1');
	return 'permission_lost';
}

// Selections, the opt-in and the stop run one at a time, so a stop is never undone by a selection in flight and the
// geofences table always matches the OS.
let queue: Promise<unknown> = Promise.resolve();
function serial<T>(task: () => Promise<T>): Promise<T> {
	const run = queue.then(task);
	queue = run.catch(() => {});
	return run;
}

let refreshing: Promise<GeofenceState> | undefined;

/**
 * Re-picks the regions while the feature is on (after each cache sync, on resume, on leaving the boundary).
 * Single-flight; a revoked Always permission stops geofencing instead. Rejects when no position is available,
 * keeping the regions as they are.
 */
export function refreshGeofences(): Promise<GeofenceState> {
	refreshing ??= serial(async (): Promise<GeofenceState> => {
		if (!(await Location.hasStartedGeofencingAsync(GEOFENCE_TASK))) return 'off';
		if (!(await Location.getBackgroundPermissionsAsync()).granted) return revoked();
		await register();
		return 'on';
	}).finally(() => {
		refreshing = undefined;
	});
	return refreshing;
}

/**
 * The settings switch: 'on' while the regions are registered and Always location is still granted. A revoked
 * permission stops them here too; 'permission_lost' then stays (also when a refresh noticed it first) until the user
 * turns the switch on or off. Reads no position.
 */
export function geofenceState(): Promise<GeofenceState> {
	return serial(async (): Promise<GeofenceState> => {
		if (await Location.hasStartedGeofencingAsync(GEOFENCE_TASK)) {
			if ((await Location.getBackgroundPermissionsAsync()).granted) return 'on';
			return revoked();
		}
		return localStorage.getItem(LOST_KEY) ? 'permission_lost' : 'off';
	});
}

/**
 * The opt-in, after the TASK-87.2 primer: asks for location while in use, then Always, and registers the regions.
 * Resolves false when either is declined (nothing is registered); rejects when no position is available.
 */
export async function enableGeofencing(): Promise<boolean> {
	localStorage.removeItem(LOST_KEY);
	if (!(await Location.requestForegroundPermissionsAsync()).granted) return false;
	if (!(await Location.requestBackgroundPermissionsAsync()).granted) return false;
	await serial(register);
	return true;
}

/** The off switch, sign-out and account deletion (wipe): no regions stay registered with the OS or on disk. */
export function stopGeofencing(): Promise<void> {
	return serial(async () => {
		await clear();
		localStorage.removeItem(LOST_KEY);
	});
}

/** Keeps the profile's quiet hours on the device for the offline handler; null forgets them (sign-out). */
export function cacheQuietHours(quiet: QuietHours | null): void {
	if (quiet)
		localStorage.setItem(QUIET_KEY, JSON.stringify({ quiet_from: quiet.quiet_from, quiet_to: quiet.quiet_to }));
	else localStorage.removeItem(QUIET_KEY);
}

/** Keeps the account's own report ids on the device for the offline handler; null forgets them (sign-out). */
export function cacheOwnReports(ids: string[] | null): void {
	if (ids) localStorage.setItem(OWN_KEY, JSON.stringify(ids));
	else localStorage.removeItem(OWN_KEY);
}

const ljubljanaClock = new Intl.DateTimeFormat('en-GB', {
	timeZone,
	hour: '2-digit',
	minute: '2-digit',
	hourCycle: 'h23',
});
const minutes = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));

/** As on the server (C10): [from, to) on the Europe/Ljubljana wall clock, possibly across midnight. */
function isQuiet(now: number): boolean {
	const quiet = stored<QuietHours>(QUIET_KEY);
	const from = quiet?.quiet_from;
	const to = quiet?.quiet_to;
	if (!from || !to || from === to) return false;
	const current = minutes(ljubljanaClock.format(now));
	const [start, end] = [minutes(from), minutes(to)];
	return start < end ? current >= start && current < end : current >= start || current < end;
}

const catalogues = { sl, en };

/**
 * Entering a report region (C17 handler, offline): the report must still be open in the cache, not the user's own,
 * outside quiet hours, under the daily cap and not yet alerted for this area; then a local notification opens its
 * listing.
 */
async function alertNear(reportId: string): Promise<void> {
	const now = Date.now();
	const db = await getDb();
	const report = await db.getFirstAsync<{
		short_code: string;
		species: string;
		name: string | null;
		event_at: string;
		area_key: string;
	}>(
		`select short_code, species, name, event_at, ${AREA_KEY} as area_key from reports_cache
		 where id = ? and type = 'lost' and status = 'open'`,
		reportId
	);
	if (!report || (await ownReportIds()).has(reportId) || isQuiet(now)) return;
	if (!(await Notifications.getPermissionsAsync()).granted) return;
	// Claimed before showing, so two quick entries never alert twice. The daily cap (from local midnight: it follows the
	// user's day) is checked by the same statement, so areas entered at once (handlers run concurrently) never pass it
	// together.
	const claim = await db.runAsync(
		`insert or ignore into geofence_events (report_id, area_key, fired_at)
		 select ?, ?, ? where (select count(*) from geofence_events where fired_at >= ?) < ?`,
		reportId,
		report.area_key,
		now,
		new Date(now).setHours(0, 0, 0, 0),
		DAILY_CAP
	);
	if (claim.changes === 0) return;

	try {
		const locale = getCurrentLocale();
		const t = createTranslator({ locale, messages: catalogues[locale], namespace: 'notifications.nearby_local' });
		const values = {
			species: report.species,
			has_name: report.name ? 'yes' : 'no',
			pet_name: report.name?.slice(0, 18) ?? '',
			when: formatRelative(report.event_at, locale, now),
		};
		// Android channel (iOS ignores it), so these reminders can be muted on their own.
		await Notifications.setNotificationChannelAsync(CHANNEL, {
			name: t('channel'),
			importance: Notifications.AndroidImportance.DEFAULT,
		});
		await Notifications.scheduleNotificationAsync({
			content: {
				title: t('title', values),
				body: t('body', values),
				data: { url: `zivali://r/${report.short_code}`, category: CHANNEL },
			},
			trigger: { channelId: CHANNEL },
		});
	} catch (error) {
		// Nothing was shown: free the claim, so this pet and area can still alert and the daily cap is not spent.
		await db.runAsync(
			'delete from geofence_events where report_id = ? and area_key = ?',
			reportId,
			report.area_key
		);
		throw error;
	}
}

// Module scope, so a headless background launch finds the task (index.ts imports this module before the router).
TaskManager.defineTask<GeofenceEvent>(GEOFENCE_TASK, async ({ data, error }) => {
	const id = data?.region.identifier;
	if (error || !id) return;
	if (id === BOUNDARY) {
		if (data.eventType === Location.GeofencingEventType.Exit) await refreshGeofences().catch(() => {});
	} else if (data.eventType === Location.GeofencingEventType.Enter) {
		await alertNear(id);
	}
});
