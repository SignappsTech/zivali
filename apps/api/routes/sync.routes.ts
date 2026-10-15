// /v1/sync: the mobile offline cache feed (C4, C17). Wiring only.
import { Router } from 'express';

import { SyncReportsQuery, SyncReportsResponse } from '@zivali/validation';

import SyncController from '../controllers/sync.controller.ts';
import { apiRoutes } from '../lib/openapi.ts';
import { optionalAuth } from '../middleware/auth.middleware.ts';
import { rateLimit } from '../middleware/rateLimit.middleware.ts';

const router = Router();
const route = apiRoutes(router, '/v1/sync');

route(
	{
		method: 'get',
		path: '/reports',
		operationId: 'syncReports',
		summary: 'Offline cache feed of the reports in up to 3 areas',
		description:
			'`areas` = JSON `[{lat,lng,radius_km}]` (1–3 circles of ≤ 25 km, centres rounded to 2 decimals). ' +
			'`upserts`: open (or matched) visible reports whose public circle meets an area, as CachedReport (the ' +
			'public whitelist; never the stored point, chip number or contact data). `removed_ids`: reports there that ' +
			'were closed, reunited, expired, hidden or removed since `since`. `server_time` is an opaque cursor: send ' +
			'it back unchanged as `since` (first sync without it) and keep paging while `has_more`. Works without a ' +
			'session; 60 calls per hour per `x-device-id` (else per IP).',
		request: { query: SyncReportsQuery },
		responses: { 200: { description: 'One page of the feed', schema: SyncReportsResponse } },
	},
	optionalAuth,
	rateLimit('sync.reports', { limit: 60, window: 3600, key: 'device' }),
	SyncController.syncReports
);

export default router;
