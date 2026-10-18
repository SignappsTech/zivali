import type { DistanceBand } from '@zivali/i18n/format';
import {
	type BBox,
	type Colour,
	COLOURS,
	type MapReport,
	type MapReportQuery,
	REPORT_TYPES,
	type ReportSearch,
	type ReportType,
	type Size,
	SPECIES as ALL_SPECIES,
	type Species,
} from '@zivali/types';
import { SLOVENIA } from '@/components/map/map-data';

// P4 browse filters on the web: the mobile Map tab's logic (apps/mobile/components/browse/filters.ts), plus the URL
// codec, since the web keeps the applied filters in the address (shareable, and the header's ?type=lost links).

export type When = '24h' | '7d' | '30d';
export type SizeGroup = 'small' | 'medium' | 'large';
export type Sort = 'distance' | 'recent';
export type Point = { lat: number; lng: number };
/** A place picked in the filter drawer (geocoder result), used instead of the browser location. */
export type ChosenPlace = Point & { label: string };
export type Filters = {
	types: ReportType[];
	species: Species[];
	when: When;
	km: number;
	colours: Colour[];
	sizes: SizeGroup[];
	place: ChosenPlace | null;
	sort: Sort;
	includeClosed: boolean;
};

export const TYPES: readonly ReportType[] = REPORT_TYPES;
export const SPECIES: readonly Species[] = ALL_SPECIES;
export const WHEN: readonly When[] = ['24h', '7d', '30d'];
export { COLOURS };
export const SIZE_LIST: readonly SizeGroup[] = ['small', 'medium', 'large'];
export const KM_MIN = 1;
export const KM_MAX = 50;
/** Content slice §4: Majhna = xs and s, Srednja = m, Velika = l and xl. */
export const SIZE_GROUPS: Record<SizeGroup, Size[]> = { small: ['xs', 's'], medium: ['m'], large: ['l', 'xl'] };
/** P4 "Many results": the list pages 20 at a time. */
export const PAGE_SIZE = 20;
/** P21 feed slot: an ad row after every 8 report rows, never first, never next to another ad. */
export const AD_EVERY = 8;

export const DEFAULT_FILTERS: Filters = {
	types: [...TYPES],
	species: [...SPECIES],
	when: '7d',
	km: 10,
	colours: [],
	sizes: [],
	place: null,
	sort: 'distance',
	includeClosed: false,
};

/** Only what the filter drawer changes counts; sort, place and "show closed" are not filters (P4 empty states). */
export const isDefault = (f: Filters): boolean =>
	(f.types.length === 0 || f.types.length === TYPES.length) &&
	(f.species.length === 0 || f.species.length === SPECIES.length) &&
	f.when === DEFAULT_FILTERS.when &&
	f.km === DEFAULT_FILTERS.km &&
	f.colours.length === 0 &&
	f.sizes.length === 0;

/** The drawer's Reset: defaults again, keeping the place, sort and closed choices. */
export const resetFilters = (f: Filters): Filters => ({
	...DEFAULT_FILTERS,
	place: f.place,
	sort: f.sort,
	includeClosed: f.includeClosed,
});

/** Adds or removes `value`; a group with `min` keeps at least that many (none by default; an empty type or species list means all). */
export function toggle<T>(list: T[], value: T, min = 0): T[] {
	if (!list.includes(value)) return [...list, value];
	return list.length > min ? list.filter((v) => v !== value) : list;
}

// The URL: `?type=lost,found&species=dog&when=24h&km=5&colour=black&size=small&sort=recent&closed=1`; defaults stay
// out. The place and the browser location never go in it (C6: the viewer's position stays in the browser).
const pick = <T extends string>(value: string | null, allowed: readonly T[]): T[] =>
	[...new Set(value?.split(',') ?? [])].filter((v): v is T => (allowed as readonly string[]).includes(v));

/** The applied filters from the page's search params; unknown values are ignored. */
export function parseFilters(params: URLSearchParams): Omit<Filters, 'place'> {
	const types = pick(params.get('type'), TYPES);
	const species = pick(params.get('species'), SPECIES);
	const [when] = pick(params.get('when'), WHEN);
	const km = Number.parseInt(params.get('km') ?? '', 10);
	return {
		types: types.length ? types : DEFAULT_FILTERS.types,
		species: species.length ? species : DEFAULT_FILTERS.species,
		when: when ?? DEFAULT_FILTERS.when,
		km: Number.isNaN(km) ? DEFAULT_FILTERS.km : Math.min(KM_MAX, Math.max(KM_MIN, km)),
		colours: pick(params.get('colour'), COLOURS),
		sizes: pick(params.get('size'), SIZE_LIST),
		sort: params.get('sort') === 'recent' ? 'recent' : 'distance',
		includeClosed: params.get('closed') === '1',
	};
}

/** The search string for `f` (no `?`), in a fixed order; values come from closed lists, so they need no escaping. */
export function filtersSearch(f: Filters): string {
	const partial = (values: readonly string[], all: number) => values.length > 0 && values.length < all;
	return [
		partial(f.types, TYPES.length) && `type=${f.types.join(',')}`,
		partial(f.species, SPECIES.length) && `species=${f.species.join(',')}`,
		f.when !== DEFAULT_FILTERS.when && `when=${f.when}`,
		f.km !== DEFAULT_FILTERS.km && `km=${f.km}`,
		f.colours.length > 0 && `colour=${f.colours.join(',')}`,
		f.sizes.length > 0 && `size=${f.sizes.join(',')}`,
		f.sort !== DEFAULT_FILTERS.sort && `sort=${f.sort}`,
		f.includeClosed && 'closed=1',
	]
		.filter(Boolean)
		.join('&');
}

const HOUR_MS = 3_600_000;
const WINDOW_H: Record<When, number> = { '24h': 24, '7d': 7 * 24, '30d': 30 * 24 };

/** Start of the time window, on the hour, so the query key stays the same between renders. */
export const since = (when: When, now = Date.now()): string =>
	new Date((Math.floor(now / HOUR_MS) - WINDOW_H[when]) * HOUR_MS).toISOString();

// An empty or full list filters nothing, so it stays out of the query.
const some = <T>(values: T[], all: number): T[] | undefined =>
	values.length && values.length < all ? values : undefined;

/** The filters both endpoints share; closed reports stay out unless the list asks (C4 `include_closed`). */
function shared(f: Filters, now: number) {
	return {
		types: some(f.types, TYPES.length),
		species: some(f.species, SPECIES.length),
		colours: f.colours.length ? f.colours : undefined,
		sizes: f.sizes.length ? f.sizes.flatMap((group) => SIZE_GROUPS[group]) : undefined,
		from: since(f.when, now),
	};
}

/**
 * GET /v1/reports: around the centre within the radius; without a centre all of Slovenia, newest first. The API
 * orders boosted reports first, so pages are shown as they come. `near` is rounded to 2 decimals in the URL (C4).
 */
export function toSearch(f: Filters, center: Point | null, now = Date.now()): Omit<ReportSearch, 'cursor'> {
	return {
		...shared(f, now),
		...(center && { near: { lat: center.lat, lng: center.lng, km: f.km } }),
		sort: center ? f.sort : 'recent',
		...(f.includeClosed && { include_closed: true }),
		limit: PAGE_SIZE,
	};
}

/** Slovenia's bounding box: the map without a centre. */
export { SLOVENIA };
const KM_PER_DEGREE = 111.32;

/** The square around the area circle (the map's initial view and its query). */
export function areaBBox(center: Point, km: number): BBox {
	const dLat = km / KM_PER_DEGREE;
	const dLng = km / (KM_PER_DEGREE * Math.cos((center.lat * Math.PI) / 180));
	return [center.lng - dLng, center.lat - dLat, center.lng + dLng, center.lat + dLat];
}

/** GET /v1/reports/map: open reports only (a pin carries no status), in the area's square (rounded outwards, C4). */
export const toMapQuery = (f: Filters, center: Point | null, now = Date.now()): MapReportQuery => ({
	...shared(f, now),
	bbox: center ? areaBBox(center, f.km) : SLOVENIA,
});

/** Equirectangular distance in km: accurate to metres at the 10 km scale. */
export const distanceKm = (a: Point, b: Point): number =>
	Math.hypot((b.lng - a.lng) * Math.cos(((a.lat + b.lat) * Math.PI) / 360), b.lat - a.lat) * KM_PER_DEGREE;

/** Pins inside the radius, so the map and its count match the list around the centre. */
export const inArea = (items: MapReport[], center: Point | null, km: number): MapReport[] =>
	center ? items.filter((item) => distanceKm(center, item.area) <= km) : items;

/** C6 distance bands for the row: never a precise distance. */
export function distanceBand(km: number): DistanceBand {
	if (km < 1) return 'lt1';
	if (km < 3) return '1to3';
	if (km < 10) return '3to10';
	return 'gt10';
}

/** An ad row (P21) between report rows; TASK-36.5 renders it through the list's `renderAd`. */
export type AdSlot = { kind: 'ad'; key: string; /** 0 for the first ad of the list, 1 for the next … */ index: number };
export type ListItem<R> = { kind: 'report'; key: string; report: R } | AdSlot;

/** Report rows with an ad slot after every `every` rows (never first, never two in a row). */
export function withAdSlots<R extends { id: string }>(reports: R[], every: number | null = AD_EVERY): ListItem<R>[] {
	return reports.flatMap((report, i): ListItem<R>[] => {
		const row: ListItem<R> = { kind: 'report', key: report.id, report };
		const n = i + 1;
		return every && n % every === 0
			? [row, { kind: 'ad', key: `ad-${n / every - 1}`, index: n / every - 1 }]
			: [row];
	});
}

/** The API's cap on GET /v1/reports/map pins (MAP_LIMIT): a map answer this long may have more behind it. */
export const MAP_CAP = 500;

/**
 * The result count: the list's `total_estimate` when known (the real number); else the map's pins, which show as
 * "500+" when the map came back full. `mapItems` is the raw map answer, before the circle filter.
 */
export function resultCount(
	total: number | undefined,
	mapItems: number | undefined,
	pins: number,
	listed: number
): { count: number; capped: boolean } {
	if (total !== undefined) return { count: total, capped: false };
	if (mapItems === undefined) return { count: listed, capped: false };
	return mapItems >= MAP_CAP ? { count: MAP_CAP, capped: true } : { count: pins, capped: false };
}

/** "500 prijav" as "500+ prijav": the P4 slice has no wording for a capped count. */
export const plus = (text: string, count: number, capped: boolean) =>
	capped ? text.replace(String(count), `${count}+`) : text;
