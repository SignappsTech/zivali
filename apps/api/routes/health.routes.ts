// /v1/health: wiring only. Each route declares its request and response schemas (validation + OpenAPI).
import { Router } from 'express';

import HealthController from '../controllers/health.controller.ts';
import { HealthReadySchema } from '../domains/health/index.ts';
import { apiRoutes } from '../lib/openapi.ts';

const router = Router();
const route = apiRoutes(router, '/v1/health');

route(
	{
		method: 'get',
		path: '/ready',
		operationId: 'getHealthReady',
		summary: 'Readiness check',
		description:
			'Touches the database. 200 when ready, 503 when the database is down; `queue_lag_s` is null until the job queue exists. Liveness without the database: `GET /ping`.',
		responses: {
			200: { description: 'Ready', schema: HealthReadySchema },
			503: { description: 'Not ready (database down)', schema: HealthReadySchema },
		},
	},
	HealthController.ready
);

export default router;
