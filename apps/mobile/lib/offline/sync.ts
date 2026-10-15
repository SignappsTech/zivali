import 'expo-sqlite/localStorage/install';

import * as BackgroundTask from 'expo-background-task';
import { File } from 'expo-file-system';
import { addNetworkStateListener } from 'expo-network';
import type { SQLiteDatabase } from 'expo-sqlite';
import * as TaskManager from 'expo-task-manager';
import { AppState } from 'react-native';

import { type ApiClient, createApiClient } from '@zivali/api/client';
import type { ResponsibleShelterResponse } from '@zivali/api/directory';
import { type CachedReport, syncReports } from '@zivali/api/sync';
import { getDb } from '@/lib/db';
import { thumbsDir } from '@/lib/db/files';
import { env } from '@/lib/env';
import { distanceKm, type Point } from '@/lib/geo';
import { isUnmetered } from '@/lib/net';
import { refreshGeofences } from '@/lib/offline/geofence';

// Offline cache of nearby public reports (C17 §Sync, ADR-019): the home and current areas, their thumbnails and
// responsible shelters, the size and age limits, and the refresh triggers.

export type CacheAreaId = 'home' | 'current';
type Area = Point & {
	id: CacheAreaId;
	radius_km: number;
	since: string | null;
	last_sync_at: number | null;
	shelter: string | null;
};

export const SYNC_TASK = 'zivali-cache-sync';
/** Both areas are cached up to 10 km; the profile's home radius is capped to it. */
export const AREA_MAX_KM = 10;
const STALE_MS = 15 * 60_000;
const PAGE_LIMIT = 500;
const MAX_PAGES = 5; // with has_more; the next trigger continues from the stored cursor
const DAY_MS = 86_400_000;
const ROW_BYTES = 1024; // estimated size of one cached row in the budget, next to its thumbnail
const THUMB_CONCURRENCY = 4;

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Settings → Offline data (TASK-85.3) with the C17 defaults. Non-personal preferences, kept in the SQLite
 * localStorage like `locale`.
 */
export function cacheSettings(): { maxMb: number; maxAgeDays: number; mobilePhotos: boolean } {
	const positive = (key: string, fallback: number) => {
		const value = Number(localStorage.getItem(key));
		return value > 0 ? value : fallback;
	};
	return {
		maxMb: positive('cache.max_mb', 50),
		maxAgeDays: positive('cache.max_age_days', 7),
		mobilePhotos: localStorage.getItem('cache.mobile_photos') === 'true',
	};
}

let client: ApiClient | undefined;
// The feed is public (optionalAuth): no session token, so a sync never ties the areas to the account.
const defaultClient = () => (client ??= createApiClient({ baseUrl: env.EXPO_PUBLIC_API_URL, locale: 'sl' }));

/**
 * `home`: the profile's home point and radius (capped to 10 km); `current`: the last foreground location (10 km).
 * Centres are kept as sent, at 2 decimals (about 1 km). A moved or resized area starts a fresh snapshot; `null`
 * forgets it (no home set).
 */
export async function setCacheArea(id: CacheAreaId, point: Point | null, radiusKm = AREA_MAX_KM): Promise<void> {
	const db = await getDb();
	if (!point) {
		await db.runAsync('delete from cache_areas where id = ?', id);
		return;
	}
	await db.runAsync(
		`insert into cache_areas (id, lat, lng, radius_km) values (?, ?, ?, ?)
		 on conflict (id) do update set lat = excluded.lat, lng = excluded.lng, radius_km = excluded.radius_km,
			since = null, last_sync_at = null, shelter = null
		 where lat != excluded.lat or lng != excluded.lng or radius_km != excluded.radius_km`,
		id,
		round2(point.lat),
		round2(point.lng),
		Math.min(radiusKm, AREA_MAX_KM)
	);
}

const COLUMNS = [
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
	'boosted',
	'updated_at',
	'synced_at',
];
// A changed thumbnail URL drops the local file reference, so the next sync downloads the new one.
const UPSERT = `insert into reports_cache (${COLUMNS.join(', ')}) values (${COLUMNS.map(() => '?').join(', ')})
	on conflict (id) do update set ${COLUMNS.slice(1)
		.map((column) => `${column} = excluded.${column}`)
		.join(', ')},
	thumb_path = case when thumb_url is excluded.thumb_url then thumb_path end,
	thumb_bytes = case when thumb_url is excluded.thumb_url then thumb_bytes else 0 end`;

/** C6 public blur (500 m lost, 150 m found and sighted): anything finer is not a public area and is never cached. */
const isBlurred = (report: CachedReport) => report.area.radius_m >= (report.type === 'lost' ? 500 : 150);

/**
 * Writes reports with the C17 whitelist only: whatever else a response carries (a manager view's exact point, chip
 * or contact) never reaches the disk.
 */
export async function upsertReports(reports: CachedReport[], now = Date.now()): Promise<void> {
	const db = await getDb();
	for (const r of reports.filter(isBlurred)) {
		await db.runAsync(UPSERT, [
			r.id,
			r.short_code,
			r.type,
			r.status,
			r.species,
			r.name ?? null,
			JSON.stringify(r.breed_codes),
			JSON.stringify(r.colours),
			r.pattern ?? null,
			r.size ?? null,
			r.sex ?? null,
			r.has_chip ? 1 : 0,
			r.event_at,
			r.area.lat,
			r.area.lng,
			r.area.radius_m,
			r.municipality_slug ?? null,
			r.region_slug ?? null,
			r.thumb_url ?? null,
			r.boosted ? 1 : 0,
			r.updated_at,
			now,
		]);
	}
}

const deleteIds = (db: SQLiteDatabase, ids: string[]) =>
	db.runAsync('delete from reports_cache where id in (select value from json_each(?))', JSON.stringify(ids));
// A response is applied only while its area is still the one requested: a wipe (sign-out) or setCacheArea may
// have removed or moved it meanwhile.
const SAME_AREA = 'id = ? and lat = ? and lng = ? and radius_km = ?';
const sameArea = (area: Area) => [area.id, area.lat, area.lng, area.radius_km];

/** Resolves true when the area's sync completed (no more pages), false when MAX_PAGES or a wipe cut it short. */
async function syncArea(api: ApiClient, db: SQLiteDatabase, area: Area, now: number): Promise<boolean> {
	let since = area.since;
	for (let page = 0; page < MAX_PAGES; page++) {
		const feed = await syncReports(api, { areas: [area], since: since ?? undefined, limit: PAGE_LIMIT });
		const done = !feed.has_more;
		// server_time is an opaque cursor (C4): every page continues from it, so rows sharing an updated_at at a
		// page boundary are not skipped.
		since = feed.server_time;
		let current = true;
		await db.withTransactionAsync(async () => {
			current = !!(await db.getFirstAsync(`select 1 from cache_areas where ${SAME_AREA}`, ...sameArea(area)));
			if (!current) return;
			await upsertReports(feed.upserts, now);
			await deleteIds(db, feed.removed_ids);
			if (done) await confirmArea(db, area, now);
			await db.runAsync(
				'update cache_areas set since = ?, last_sync_at = coalesce(?, last_sync_at) where id = ?',
				since,
				done ? now : null,
				area.id
			);
		});
		if (!current) return false;
		if (done) return true;
	}
	return false;
}

/**
 * The feed lists only changes, so after a complete sync every row inside the area is current: it counts as seen
 * for `cache.max_age_days`.
 */
async function confirmArea(db: SQLiteDatabase, area: Area, now: number): Promise<void> {
	const rows = await db.getAllAsync<{ id: string; area_lat: number; area_lng: number; area_radius_m: number }>(
		'select id, area_lat, area_lng, area_radius_m from reports_cache'
	);
	const inside = rows.filter(
		(r) => distanceKm(area, { lat: r.area_lat, lng: r.area_lng }) <= area.radius_km + r.area_radius_m / 1000
	);
	await db.runAsync(
		'update reports_cache set synced_at = ? where id in (select value from json_each(?))',
		now,
		JSON.stringify(inside.map((r) => r.id))
	);
}

/** C18 responsible shelter of the area, so the call button works offline; refreshed after every completed area sync; a failed fetch keeps the old value. */
async function cacheShelter(api: ApiClient, db: SQLiteDatabase, area: Area): Promise<void> {
	try {
		const shelter = await api.request<ResponsibleShelterResponse>('GET', '/v1/shelters/responsible', {
			query: { lat: area.lat, lng: area.lng },
		});
		await db.runAsync(
			`update cache_areas set shelter = ? where ${SAME_AREA}`,
			JSON.stringify(shelter),
			...sameArea(area)
		);
	} catch {
		// The reports are cached already.
	}
}

/** 480 px thumbnails into the purgeable cache folder, one file per report id; a failed one is retried next sync. */
async function downloadThumbs(db: SQLiteDatabase): Promise<void> {
	const missing = await db.getAllAsync<{ id: string; thumb_url: string }>(
		'select id, thumb_url from reports_cache where thumb_url is not null and thumb_path is null'
	);
	if (missing.length === 0) return;
	thumbsDir.create({ intermediates: true, idempotent: true });
	for (let i = 0; i < missing.length; i += THUMB_CONCURRENCY) {
		await Promise.all(
			missing.slice(i, i + THUMB_CONCURRENCY).map(async ({ id, thumb_url }) => {
				try {
					const file = await File.downloadFileAsync(thumb_url, new File(thumbsDir, id), { idempotent: true });
					await db.runAsync(
						'update reports_cache set thumb_path = ?, thumb_bytes = ? where id = ? and thumb_url = ?',
						file.uri,
						file.size ?? 0,
						id,
						thumb_url
					);
				} catch {
					// Offline again or a missing photo.
				}
			})
		);
	}
}

/**
 * C17 limits: rows not confirmed by a sync for `max_age_days` go first; then, while over `max_mb` (thumbnails
 * count), the farthest from both areas (whole km) and, among those, the oldest `event_at`. Files of rows that are
 * gone are deleted.
 */
export async function enforceLimits(settings = cacheSettings(), now = Date.now()): Promise<void> {
	const db = await getDb();
	await db.runAsync('delete from reports_cache where synced_at < ?', now - settings.maxAgeDays * DAY_MS);
	const areas = await db.getAllAsync<Point>('select lat, lng from cache_areas');
	const rows = (
		await db.getAllAsync<{ id: string; area_lat: number; area_lng: number; event_at: string; thumb_bytes: number }>(
			'select id, area_lat, area_lng, event_at, thumb_bytes from reports_cache'
		)
	).map((r) => ({
		...r,
		bytes: ROW_BYTES + (r.thumb_bytes ?? 0),
		km: Math.round(Math.min(...areas.map((area) => distanceKm(area, { lat: r.area_lat, lng: r.area_lng })))),
	}));
	let used = rows.reduce((sum, r) => sum + r.bytes, 0);
	// Without areas every distance is Infinity (NaN difference), so age alone decides.
	rows.sort((a, b) => b.km - a.km || a.event_at.localeCompare(b.event_at));
	const evicted: string[] = [];
	for (const r of rows) {
		if (used <= settings.maxMb * 1024 * 1024) break;
		evicted.push(r.id);
		used -= r.bytes;
	}
	await deleteIds(db, evicted);

	if (!thumbsDir.exists) return;
	const kept = new Set(
		(await db.getAllAsync<{ id: string }>('select id from reports_cache where thumb_path is not null')).map(
			(r) => r.id
		)
	);
	for (const entry of thumbsDir.list()) if (!kept.has(entry.name)) entry.delete();
}

async function run(api: ApiClient): Promise<void> {
	const db = await getDb();
	const now = Date.now();
	for (const area of await db.getAllAsync<Area>('select * from cache_areas')) {
		if (await syncArea(api, db, area, now)) await cacheShelter(api, db, area);
	}
	const settings = cacheSettings();
	if (settings.mobilePhotos || (await isUnmetered())) await downloadThumbs(db);
	await enforceLimits(settings, now);
	// The cache changed: re-pick the geofenced areas (C17). No fix or no permission keeps the cache result.
	await refreshGeofences().catch(() => {});
}

let running: Promise<void> | undefined;

/**
 * Syncs every cache area (upserts, removed ids, the `server_time` cursor), then thumbnails and limits. Single-flight;
 * rejects (ApiError) when offline or on a server error, keeping what is cached.
 */
export function syncNow(api: ApiClient = defaultClient()): Promise<void> {
	running ??= run(api).finally(() => {
		running = undefined;
	});
	return running;
}

/** Resolves when no sync is running (success or not); a wipe waits for it so their transactions do not overlap. */
export const syncIdle = (): Promise<void> | undefined => running?.catch(() => {});

/** Last refresh of any area ("last updated"); null before the first sync. */
export async function lastSyncAt(): Promise<number | null> {
	const db = await getDb();
	return (
		(await db.getFirstAsync<{ at: number | null }>('select max(last_sync_at) as at from cache_areas'))?.at ?? null
	);
}

/** An area was never synced or not in the last 15 minutes. */
async function isStale(): Promise<boolean> {
	const db = await getDb();
	const row = await db.getFirstAsync<{ n: number }>(
		'select count(*) as n from cache_areas where coalesce(last_sync_at, 0) < ?',
		Date.now() - STALE_MS
	);
	return (row?.n ?? 0) > 0;
}

/** The cached C18 response for an area, for the shelter call button offline. */
export async function getCachedShelter(id: CacheAreaId): Promise<ResponsibleShelterResponse | null> {
	const db = await getDb();
	const row = await db.getFirstAsync<{ shelter: string | null }>('select shelter from cache_areas where id = ?', id);
	return row?.shelter ? (JSON.parse(row.shelter) as ResponsibleShelterResponse) : null;
}

// Module scope, so a headless background launch that loads this module finds the task (expo-task-manager).
TaskManager.defineTask(SYNC_TASK, async () => {
	// Metered, offline or fresh: leave the battery and the data plan alone until the next window.
	if (!(await isUnmetered()) || !(await isStale())) return BackgroundTask.BackgroundTaskResult.Success;
	try {
		await syncNow();
		return BackgroundTask.BackgroundTaskResult.Success;
	} catch {
		return BackgroundTask.BackgroundTaskResult.Failed;
	}
});

/**
 * C17 triggers; call once at start-up (it counts as a resume). Foreground resume syncs when an area is older than
 * 15 minutes (else only re-picks the geofences, which also notices a revoked Always permission), regaining Wi-Fi or
 * Ethernet syncs (and fetches the thumbnails skipped on mobile data), and the OS background task runs about hourly on
 * unmetered networks only. Returns the unsubscribe.
 */
export function startCacheSync(api: ApiClient = defaultClient()): () => void {
	// Offline or a server error: keep the cache, the next trigger tries again.
	const kick = (task: () => Promise<unknown>) => void task().catch(() => {});
	const resume = () => kick(async () => ((await isStale()) ? syncNow(api) : refreshGeofences()));
	let wasUnmetered = false;
	const app = AppState.addEventListener('change', (state) => state === 'active' && resume());
	const network = addNetworkStateListener((state) =>
		kick(async () => {
			const unmetered = await isUnmetered(state);
			const regained = unmetered && !wasUnmetered;
			wasUnmetered = unmetered;
			if (regained) await syncNow(api);
		})
	);
	resume();
	kick(() => BackgroundTask.registerTaskAsync(SYNC_TASK, { minimumInterval: 60 }));
	return () => {
		app.remove();
		network.remove();
	};
}
