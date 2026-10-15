// Geocoder DTOs (C6 Place): "<name>, <qualifier>", just the name when both are equal ("Kranj"); search keeps the
// first 5 distinct labels.
import type { GeoReverseResponse, GeoSearchResponse, Place } from '@zivali/types';
import { GeoReverseResponse as ReverseSchema, GeoSearchResponse as SearchSchema } from '@zivali/validation';

import type { GeoHit } from './geo.domain.ts';

const SEARCH_LIMIT = 5;

function toPlace({ name, qualifier, kind, lat, lng, municipality_slug }: GeoHit): Place {
	const label = qualifier && qualifier !== name ? `${name}, ${qualifier}` : name;
	return { label, lat, lng, kind, municipality_slug };
}

export function toSearchDto(hits: GeoHit[]): GeoSearchResponse {
	const labels = new Set<string>();
	const items = hits.map(toPlace).filter(({ label }) => !labels.has(label) && labels.add(label));
	return SearchSchema.parse({ items: items.slice(0, SEARCH_LIMIT) });
}

export function toReverseDto(hit: GeoHit | null): GeoReverseResponse {
	return ReverseSchema.parse({ place: hit && toPlace(hit) });
}

export default { toSearchDto, toReverseDto };
