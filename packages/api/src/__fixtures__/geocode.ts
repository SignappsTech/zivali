// C6 examples (POST /v1/geo/search, /v1/geo/reverse, VALIDATION for a too short query).
import type { GeoReverseResponse, GeoSearchResponse } from '@zivali/types';

import type { ApiErrorBody } from '../client.ts';

export const placeSearch: GeoSearchResponse = {
	items: [
		{
			label: 'Trubarjeva cesta 5, Ljubljana',
			lat: 46.05169,
			lng: 14.50701,
			kind: 'address',
			municipality_slug: 'ljubljana',
		},
		{
			label: 'Trubarjeva cesta, Ljubljana',
			lat: 46.05231,
			lng: 14.50952,
			kind: 'street',
			municipality_slug: 'ljubljana',
		},
	],
};

export const placeReverse: GeoReverseResponse = {
	place: { label: 'Šiška, Ljubljana', lat: 46.0739, lng: 14.4851, kind: 'district', municipality_slug: 'ljubljana' },
};

export const queryTooShort: ApiErrorBody = {
	error: { code: 'VALIDATION', message: 'Invalid request', issues: [{ path: 'q', message: 'Too short' }] },
};
