// /v1/geo: wiring only. Our own geocoder on GURS data (C6 §Geocoder): queries and points only in POST bodies.
import { Router } from 'express';

import { GeoReverseInput, GeoReverseResponse, GeoSearchInput, GeoSearchResponse } from '@zivali/validation';

import GeoController from '../controllers/geo.controller.ts';
import { apiRoutes } from '../lib/openapi.ts';
import { optionalAuth } from '../middleware/auth.middleware.ts';
import { rateLimit } from '../middleware/rateLimit.middleware.ts';

const router = Router();
const route = apiRoutes(router, '/v1/geo');

// 60 per minute per IP and per device. Separate names: without x-device-id the device limit counts the IP, which
// under one name would count every request twice.
const guards = [
	optionalAuth,
	rateLimit('geo', { limit: 60, window: 60, key: 'ip' }),
	rateLimit('geo.device', { limit: 60, window: 60, key: 'device' }),
];

route(
	{
		method: 'post',
		path: '/search',
		operationId: 'searchPlaces',
		summary: 'Search places',
		description:
			'Settlements, city districts, streets and house numbers (GURS) for q, best first, at most 5. ' +
			'"Street 5, Settlement" puts the house number first. `Cache-Control: no-store`.',
		request: { body: GeoSearchInput },
		responses: { 200: { description: 'Matching places', schema: GeoSearchResponse } },
	},
	...guards,
	GeoController.search
);

route(
	{
		method: 'post',
		path: '/reverse',
		operationId: 'reversePlace',
		summary: 'Area label for a point',
		description:
			'The city district or settlement covering the point with its municipality, else the municipality; ' +
			'null outside Slovenia. Never a street or house number. `Cache-Control: no-store`.',
		request: { body: GeoReverseInput },
		responses: { 200: { description: 'The place, or null outside Slovenia', schema: GeoReverseResponse } },
	},
	...guards,
	GeoController.reverse
);

export default router;
