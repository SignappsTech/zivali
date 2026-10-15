// /v1/abuse-reports (C11): wiring only. Target checks, weighting and the auto-hide live in domains/abuse; the staff
// lists are in admin.routes.ts.
import { Router } from 'express';

import { AbuseReportInput, AbuseReportResponse } from '@zivali/validation';

import AbuseReportsController from '../controllers/abuse-reports.controller.ts';
import { apiRoutes } from '../lib/openapi.ts';
import { authMiddleware } from '../middleware/auth.middleware.ts';
import { rateLimit } from '../middleware/rateLimit.middleware.ts';

const router = Router();
const route = apiRoutes(router, '/v1/abuse-reports');
const HOUR_S = 3600;

route(
	{
		method: 'post',
		path: '/',
		operationId: 'reportAbuse',
		summary: 'Report a listing, a message or a profile',
		description:
			'Signed-in and anonymous users (anonymous visitors sign in anonymously with captcha first). Messages only ' +
			'by a participant of the conversation. A repeat by the same reporter returns the first report (200, ' +
			'duplicate: true). Reports from accounts younger than 24 h weigh 0.5; enough open weight hides a listing.',
		request: { body: AbuseReportInput },
		responses: {
			201: { description: 'Reported', schema: AbuseReportResponse },
			200: { description: 'Already reported by the caller', schema: AbuseReportResponse },
		},
		errors: ['UNAUTHENTICATED', 'FORBIDDEN'],
	},
	authMiddleware,
	rateLimit('abuse.report', { limit: 10, window: HOUR_S, key: 'user' }),
	rateLimit('abuse.report_ip', { limit: 10, window: HOUR_S, key: 'ip' }),
	AbuseReportsController.create
);

export default router;
