// C6 geocoder (POST /v1/geo/search, POST /v1/geo/reverse) and fuzzed public areas.
import type { LatLng } from './common.ts';
import type { PlaceKind } from './enums.ts';

export type Place = { label: string; lat: number; lng: number; kind: PlaceKind; municipality_slug: string };
export type GeoSearchInput = { q: string; near?: LatLng };
export type GeoSearchResponse = { items: Place[] };
export type GeoReverseInput = LatLng;
export type GeoReverseResponse = { place: Place | null };
/** Fuzzed public circle of a report (never the exact point). */
export type PublicArea = { lat: number; lng: number; radius_m: number };
