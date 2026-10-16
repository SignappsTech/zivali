import { File } from 'expo-file-system';
import { useEffect, useMemo, useState } from 'react';

import {
	useGetMapReportsQuery,
	useGetReportQuery,
	useListMyReportsInfiniteQuery,
	useSearchReportsInfiniteQuery,
} from '@zivali/api/reports';
import type { QueryError } from '@zivali/api/rtk';
import type { CachedReport } from '@zivali/api/sync';
import type { MapReportList, MapReportQuery, PublicReport, ReportOwnerView, ReportSearch } from '@zivali/types';
import { getDb } from '@/lib/db';
import { distanceKm } from '@/lib/geo';
import { isOnline, useNetworkState } from '@/lib/net';
import { type Cacheable, lastSyncAt, upsertReports } from '@/lib/offline/sync';

// The only path for report maps, lists and details on mobile (C17 §Data seam): online from the API, upserting the
// offline cache; offline, or when a request fails for lack of network, from reports_cache.

export type ReportSource = 'network' | 'cache';
export type ReportsResult<T> = {
	data: T | undefined;
	source: ReportSource;
	/** Last cache sync, for "Offline, last updated …"; null before the first. */
	lastSyncAt: number | null;
	isLoading: boolean;
	/** A request error other than no network (NOT_FOUND, GONE, …). */
	error?: QueryError;
};
type Filters = Omit<ReportSearch, 'cursor' | 'limit'>;
type Row = {
	id: string;
	short_code: string;
	type: CachedReport['type'];
	status: CachedReport['status'];
	species: CachedReport['species'];
	name: string | null;
	breed_codes: string;
	colours: string;
	pattern: CachedReport['pattern'];
	size: CachedReport['size'];
	sex: CachedReport['sex'];
	has_chip: number;
	event_at: string;
	area_lat: number;
	area_lng: number;
	area_radius_m: number;
	municipality_slug: string | null;
	region_slug: string | null;
	thumb_url: string | null;
	thumb_path: string | null;
	boosted: number;
	updated_at: string;
};

/**
 * The public subset the cache keeps (C17); a manager view's private fields stop here, and its moderation state only
 * keeps a held or hidden report out of the cache.
 */
export function toCached(r: PublicReport | ReportOwnerView): Cacheable {
	return {
		id: r.id,
		short_code: r.short_code,
		type: r.type,
		status: r.status,
		species: r.species,
		name: r.name,
		breed_codes: r.breed_codes,
		colours: r.colours,
		pattern: r.pattern,
		size: r.size,
		sex: r.sex,
		has_chip: r.has_chip,
		event_at: r.event_at,
		area: { lat: r.area.lat, lng: r.area.lng, radius_m: r.area.radius_m },
		municipality_slug: r.municipality_slug,
		region_slug: r.region_slug,
		boosted: r.boosted,
		updated_at: r.updated_at,
		thumb_url: r.photos[0]?.thumb_url ?? null,
		moderation_state: 'moderation_state' in r ? r.moderation_state : undefined,
	};
}

/** A cached row; `thumb_url` is the downloaded file while the OS has not purged it (ADR-019). */
const fromRow = (r: Row): CachedReport => ({
	id: r.id,
	short_code: r.short_code,
	type: r.type,
	status: r.status,
	species: r.species,
	name: r.name ?? undefined,
	breed_codes: JSON.parse(r.breed_codes ?? '[]'),
	colours: JSON.parse(r.colours ?? '[]'),
	pattern: r.pattern,
	size: r.size,
	sex: r.sex,
	has_chip: r.has_chip === 1,
	event_at: r.event_at,
	area: { lat: r.area_lat, lng: r.area_lng, radius_m: r.area_radius_m },
	municipality_slug: r.municipality_slug ?? undefined,
	region_slug: r.region_slug ?? undefined,
	boosted: r.boosted === 1,
	updated_at: r.updated_at,
	thumb_url: r.thumb_path && new File(r.thumb_path).exists ? r.thumb_path : r.thumb_url,
});

// The C4 filters, applied to the cache in memory (a few thousand rows at most).
const matches = (r: CachedReport, f: Filters): boolean => {
	const { lat, lng } = r.area;
	const [w, s, e, n] = f.bbox ?? [-180, -90, 180, 90];
	return (
		lng >= w &&
		lng <= e &&
		lat >= s &&
		lat <= n &&
		(!f.near || distanceKm(f.near, r.area) <= f.near.km) &&
		(!f.types?.length || f.types.includes(r.type)) &&
		(!f.species?.length || f.species.includes(r.species)) &&
		(!f.sizes?.length || (r.size !== null && f.sizes.includes(r.size))) &&
		(!f.colours?.length || r.colours.some((colour) => f.colours!.includes(colour))) &&
		(!f.from || r.event_at >= f.from) &&
		(!f.to || r.event_at <= f.to) &&
		(f.include_closed || r.status === 'open')
	);
};

async function readList(key: string): Promise<CachedReport[]> {
	const filters: Filters = JSON.parse(key);
	const rows = await (await getDb()).getAllAsync<Row>('select * from reports_cache');
	const list = rows.map(fromRow).filter((r) => matches(r, filters));
	const near = filters.sort === 'distance' ? filters.near : undefined;
	return near
		? list.sort((a, b) => distanceKm(near, a.area) - distanceKm(near, b.area))
		: list.sort((a, b) => b.event_at.localeCompare(a.event_at));
}

const readMap = async (key: string): Promise<MapReportList> => ({
	items: (await readList(key)).map(({ id, short_code, type, species, area, boosted, thumb_url }) => ({
		id,
		short_code,
		type,
		species,
		area,
		boosted,
		thumb_url,
	})),
});

async function readOne(code: string): Promise<CachedReport | null> {
	const row = await (await getDb()).getFirstAsync<Row>('select * from reports_cache where short_code = ?', code);
	return row ? fromRow(row) : null;
}

const cacheQuietly = (reports: CachedReport[]) => void upsertReports(reports).catch(() => {});

function useCacheFallback<T>(
	network: { data?: T; error?: unknown; isLoading: boolean; isUninitialized: boolean },
	key: string,
	read: (key: string) => Promise<T>
): ReportsResult<T> {
	// Skipped while offline (uninitialized), or failed without a response (status 0).
	const fromCache = network.isUninitialized || (network.error as QueryError | undefined)?.status === 0;
	const id = `${fromCache}:${key}`;
	const [cache, setCache] = useState<{ id: string; data?: T; lastSyncAt: number | null }>();
	useEffect(() => {
		let live = true;
		Promise.all([fromCache ? read(key) : undefined, lastSyncAt()])
			.then(([data, at]) => live && setCache({ id, data, lastSyncAt: at }))
			.catch(() => live && setCache({ id, lastSyncAt: null }));
		return () => {
			live = false;
		};
	}, [fromCache, id, key, read]);
	const loaded = cache?.id === id ? cache : undefined;
	return fromCache
		? { data: loaded?.data, source: 'cache', lastSyncAt: loaded?.lastSyncAt ?? null, isLoading: !loaded }
		: {
				data: network.data,
				source: 'network',
				lastSyncAt: cache?.lastSyncAt ?? null,
				isLoading: network.isLoading,
				error: network.error as QueryError | undefined,
			};
}

const useOffline = () => !isOnline(useNetworkState());
/** `skip`: not ready to ask yet (the map's centre is still unknown); loading, from neither the network nor the cache. */
type Options = { skip?: boolean };
const held = <N extends { isUninitialized: boolean; isLoading: boolean }>(network: N, skip?: boolean): N =>
	skip ? { ...network, isUninitialized: false, isLoading: true } : network;

/** Map pins in a bbox. Network pins carry too few fields to cache; the area sync fills the cache for the map. */
export function useMapReports(
	query: MapReportQuery,
	{ skip }: Options = {}
): ReportsResult<MapReportList> & { refetch: () => unknown } {
	const network = useGetMapReportsQuery(query, { skip: useOffline() || skip });
	return { ...useCacheFallback(held(network, skip), JSON.stringify(query), readMap), refetch: network.refetch };
}

/**
 * The report list as cache-shaped items (network pages flattened); `fetchNextPage` pages the network only, `refetch`
 * retries it after an `error`.
 */
export function useReportSearch(
	filters: Omit<ReportSearch, 'cursor'>,
	{ skip }: Options = {}
): ReportsResult<CachedReport[]> & { hasNextPage: boolean; fetchNextPage: () => unknown; refetch: () => unknown } {
	const network = useSearchReportsInfiniteQuery(filters, { skip: useOffline() || skip });
	const items = useMemo(() => network.data?.pages.flatMap((page) => page.items.map(toCached)), [network.data]);
	useEffect(() => {
		if (items) cacheQuietly(items);
	}, [items]);
	const result = useCacheFallback(held({ ...network, data: items }, skip), JSON.stringify(filters), readList);
	return {
		...result,
		hasNextPage: result.source === 'network' && network.hasNextPage,
		fetchNextPage: network.fetchNextPage,
		refetch: network.refetch,
	};
}

/**
 * A report by short code: the full public (or manager) view online, the cached subset offline (null if absent).
 * `refetch` retries the network request after an error.
 */
export function useReport(
	code: string
): ReportsResult<PublicReport | CachedReport | null> & { refetch: () => unknown } {
	const network = useGetReportQuery({ code }, { skip: useOffline() });
	useEffect(() => {
		if (network.data) cacheQuietly([toCached(network.data)]);
	}, [network.data]);
	return {
		...useCacheFallback<PublicReport | CachedReport | null>(network, code, readOne),
		refetch: network.refetch,
	};
}

/**
 * Short codes of the caller's lost reports still searching (open or matched), by pet id, from the first page of
 * GET /v1/me/reports, for "Izgubljena · Odpri iskanje" on My pets (P8). Network only: own reports are never cached.
 */
export function useOpenLostReportsByPet(): Map<string, string> {
	const { data } = useListMyReportsInfiniteQuery(undefined, { skip: useOffline() });
	return useMemo(
		() =>
			new Map(
				(data?.pages[0]?.items ?? []).flatMap((report) =>
					report.type === 'lost' && report.pet_id && (report.status === 'open' || report.status === 'matched')
						? [[report.pet_id, report.short_code] as const]
						: []
				)
			),
		[data]
	);
}

/**
 * The caller's own reports (GET /v1/me/reports, newest first), for My reports. Network only: the manager view carries
 * private fields, so it never goes to the device cache (C17); offline the query stays uninitialised.
 */
export function useMyReports() {
	return useListMyReportsInfiniteQuery(undefined, { skip: useOffline() });
}
