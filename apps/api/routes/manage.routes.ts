// /v1/manage (C7): claiming the manage link of an anonymous report on another device. Wiring only.
import { Router } from 'express';

import { ManageClaimInput, ManageClaimResponse } from '@zivali/validation';

import ReportsController from '../controllers/reports.controller.ts';
import { apiRoutes } from '../lib/openapi.ts';
import { authMiddleware } from '../middleware/auth.middleware.ts';
import { rateLimit } from '../middleware/rateLimit.middleware.ts';

const router = Router();
const route = apiRoutes(router, '/v1/manage');

route(
	{
		method: 'post',
		path: '/claim',
		operationId: 'claimManageLink',
		summary: 'Claim the manage link of a report',
		description:
			'`token` is the fragment of the manage link (`/m#<token>`). The caller (anonymous or signed in) becomes a ' +
			'manager of the report; claiming again changes nothing. Removed reports and reports closed more than 7 days ' +
			'ago answer GONE. 10 per hour per IP.',
		request: { body: ManageClaimInput },
		responses: { 200: { description: 'The claimed report', schema: ManageClaimResponse } },
		errors: ['UNAUTHENTICATED', 'NOT_FOUND', 'GONE'],
	},
	authMiddleware,
	rateLimit('manage.claim', { limit: 10, window: 3600, key: 'ip' }),
	ReportsController.claimManage
);

export default router;
