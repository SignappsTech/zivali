// C6 geocoder: POST /v1/geo/search and /v1/geo/reverse (points only in POST bodies); fuzzed public areas.
import { Lat, LatLng, Lng } from './common.schema.ts';
import { PlaceKind } from './enums.ts';
import { z } from './zod.ts';

export const Place = z
	.object({ label: z.string(), lat: z.number(), lng: z.number(), kind: PlaceKind, municipality_slug: z.string() })
	.openapi('Place', {
		example: {
			label: 'Trubarjeva cesta 5, Ljubljana',
			lat: 46.05169,
			lng: 14.50701,
			kind: 'address',
			municipality_slug: 'ljubljana',
		},
	});
export const GeoSearchInput = z
	.object({ q: z.string().trim().min(2, 'Too short').max(100), near: LatLng.optional() })
	.openapi('GeoSearchInput', { example: { q: 'trubarjeva 5, ljubljana', near: { lat: 46.05, lng: 14.51 } } });
export const GeoSearchResponse = z.object({ items: z.array(Place).max(5) }).openapi('GeoSearchResponse');
export const GeoReverseInput = z.object({ lat: Lat, lng: Lng }).openapi('GeoReverseInput');
export const GeoReverseResponse = z.object({ place: z.union([Place, z.null()]) }).openapi('GeoReverseResponse');
/** Fuzzed public circle of a report. */
export const PublicArea = z
	.object({ lat: z.number(), lng: z.number(), radius_m: z.number().int().positive() })
	.openapi('PublicArea');
