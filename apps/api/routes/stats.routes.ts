// /v1/stats (C4 §REST): public homepage numbers. Wiring only. No input; like /v1/config/public it is cached (in memory
// and Cache-Control) and covered by the global per-IP limit, so a per-route Postgres counter would cost more than the read.
import { Router } from 'express';

import { PublicStats } from '@zivali/validation';

import StatsController from '../controllers/stats.controller.ts';
import { apiRoutes } from '../lib/openapi.ts';

const router = Router();
const route = apiRoutes(router, '/v1/stats');

route(
	{
		method: 'get',
		path: '/public',
		operationId: 'getPublicStats',
		summary: 'Public homepage numbers',
		description:
			'Visible reunited reports, visible open or matched reports and active nearby-alert subscriptions. No personal ' +
			'data: each count is rounded down to a multiple of 10 and is null while under 50 (clients hide the numbers ' +
			'block unless all three are set). Cached 5 minutes: `Cache-Control: public, max-age=300`.',
		responses: { 200: { description: 'The published counts', schema: PublicStats } },
	},
	StatsController.getPublic
);

export default router;
