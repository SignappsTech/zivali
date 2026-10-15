// Geo reference (C6): the municipality, region and in_slovenia flag that reports, ads and stats store with a point;
// the geocoder (C6 §Geocoder): place search and reverse lookups on GURS data. Nothing from a lookup is stored or logged.
import type { GeoReverseInput as ReverseInput, GeoSearchInput as SearchInput, PlaceKind } from '@zivali/types';
import { GeoReverseInput, GeoSearchInput, LatLng, normalisePlace } from '@zivali/validation';

import type { Ctx } from '../../lib/ctx.ts';
import {
	geoLookup,
	geoReverse,
	geoSearch,
	type GeoLookup,
	type GeoPlaceRow,
	type GeoSearchTerms,
} from '../../lib/geo.ts';
import type { Prisma } from '../../prisma/prisma.ts';

export async function lookup(
	point: { lat: number; lng: number },
	_ctx: Ctx,
	tx?: Prisma.TransactionClient
): Promise<GeoLookup> {
	// PostGIS wraps an out-of-range lng (374.5 becomes 14.5), so reject it first.
	const { lat, lng } = LatLng.parse(point);
	return geoLookup(lat, lng, tx);
}

/** A geocoder result before its label: name "Trubarjeva cesta 5", qualifier "Ljubljana" (null: name alone). */
export type GeoHit = {
	kind: PlaceKind;
	name: string;
	qualifier: string | null;
	lat: number;
	lng: number;
	municipality_slug: string;
};

const KINDS: Record<number, PlaceKind> = { 0: 'municipality', 1: 'settlement', 2: 'district', 3: 'street' };
// A trailing house number with an optional letter: "Trubarjeva 5", "Vrhpolje 12a", "Cesta 4 B".
const HOUSE_NUMBER = /(\d{1,4})\s?([a-z])?$/i;

/** C6 step 1: head (before the first comma) with an optional trailing house number, and the qualifier tail. */
export function parseQuery(q: string): Omit<GeoSearchTerms, 'near'> {
	const comma = q.indexOf(',');
	const head = (comma < 0 ? q : q.slice(0, comma)).trim();
	const tail = comma < 0 ? '' : normalisePlace(q.slice(comma + 1));
	const match = HOUSE_NUMBER.exec(head);
	const text = match ? normalisePlace(head.slice(0, match.index)) : '';
	if (!match || !text) return { text: normalisePlace(head), tail: tail || null, number: null, suffix: '' };
	return { text, tail: tail || null, number: Number(match[1]), suffix: match[2]?.toLowerCase() ?? '' };
}

// Streets are qualified by their settlement, everything else by its municipality.
const toHit = (row: GeoPlaceRow): GeoHit => ({
	kind: KINDS[row.kind]!,
	name: row.name,
	qualifier: row.kind === 3 ? row.settlement : row.municipality,
	lat: row.lat,
	lng: row.lng,
	municipality_slug: row.municipality_slug,
});

/** Ranked places for q, the best house-number hit first (C6 steps 2-4); the mapper labels, dedupes and keeps 5. */
export async function search(input: SearchInput, _ctx: Ctx): Promise<GeoHit[]> {
	const { q, near } = GeoSearchInput.parse(input);
	const terms = parseQuery(q);
	if (!terms.text) return [];
	const rows = await geoSearch({ ...terms, near });
	const hits = rows.map(toHit);
	const address = rows.findIndex((row) => row.address_lat !== null && row.address_lng !== null);
	if (address < 0) return hits;
	const row = rows[address]!;
	return [
		{
			...hits[address]!,
			kind: 'address',
			name: `${row.name} ${terms.number}${terms.suffix}`,
			lat: row.address_lat!,
			lng: row.address_lng!,
		},
		...hits,
	];
}

/** The district or settlement at the point with its municipality, else the municipality; null outside Slovenia. */
export async function reverse(input: ReverseInput, _ctx: Ctx): Promise<GeoHit | null> {
	const { lat, lng } = GeoReverseInput.parse(input);
	const row = await geoReverse(lat, lng);
	return row && toHit(row);
}

export default { lookup, search, reverse };
