import { useEffect, useMemo, useState } from 'react';

import { useGetMapReportsQuery, useGetReportQuery, useSearchReportsInfiniteQuery } from '@zivali/api/reports';
import type { QueryError } from '@zivali/api/rtk';
import type { CachedReport } from '@zivali/api/sync';
import type { MapReportList, MapReportQuery, PublicReport, ReportSearch } from '@zivali/types';
import { getDb } from '@/lib/db';
import { distanceKm } from '@/lib/geo';
import { isOnline, useNetworkState } from '@/lib/net';
import { lastSyncAt, upsertReports } from '@/lib/offline/sync';

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

/** The public subset the cache keeps (C17); a manager view's private fields stop here. */
export function toCached(r: PublicReport): CachedReport {
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
	};
}

/** A cached row; `thumb_url` is the downloaded file when there is one. */
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
	thumb_url: r.thumb_path ?? r.thumb_url,
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

/** Map pins in a bbox. Network pins carry too few fields to cache; the area sync fills the cache for the map. */
export function useMapReports(query: MapReportQuery): ReportsResult<MapReportList> {
	const network = useGetMapReportsQuery(query, { skip: useOffline() });
	return useCacheFallback(network, JSON.stringify(query), readMap);
}

/** The report list as cache-shaped items (network pages flattened); `fetchNextPage` pages the network only. */
export function useReportSearch(
	filters: Omit<ReportSearch, 'cursor'>
): ReportsResult<CachedReport[]> & { hasNextPage: boolean; fetchNextPage: () => unknown } {
	const network = useSearchReportsInfiniteQuery(filters, { skip: useOffline() });
	const items = useMemo(() => network.data?.pages.flatMap((page) => page.items.map(toCached)), [network.data]);
	useEffect(() => {
		if (items) cacheQuietly(items);
	}, [items]);
	const result = useCacheFallback({ ...network, data: items }, JSON.stringify(filters), readList);
	return {
		...result,
		hasNextPage: result.source === 'network' && network.hasNextPage,
		fetchNextPage: network.fetchNextPage,
	};
}

/** A report by short code: the full public (or manager) view online, the cached subset offline (null if absent). */
export function useReport(code: string): ReportsResult<PublicReport | CachedReport | null> {
	const network = useGetReportQuery({ code }, { skip: useOffline() });
	useEffect(() => {
		if (network.data) cacheQuietly([toCached(network.data)]);
	}, [network.data]);
	return useCacheFallback<PublicReport | CachedReport | null>(network, code, readOne);
}
