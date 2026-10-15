// /v1/reports: wiring only. Create, update, search and transitions arrive with TASK-29.2, TASK-31.3 and TASK-26.3.
import { Router } from 'express';
import { z } from 'zod';

import { CodeParams, PublicReport, ReportOwnerView } from '@zivali/validation';

import ReportsController from '../controllers/reports.controller.ts';
import { apiRoutes } from '../lib/openapi.ts';
import { optionalAuth } from '../middleware/auth.middleware.ts';

const router = Router();
const route = apiRoutes(router, '/v1/reports');

route(
	{
		method: 'get',
		path: '/:code',
		operationId: 'getReport',
		summary: 'One report by its short code',
		description:
			'PublicReport (fuzzed area; no chip number, contact data or exact point). A manager of the report gets ' +
			'ReportOwnerView. Hidden, removed and reports closed more than 30 days ago answer GONE with `details.reason`.',
		request: { params: CodeParams },
		responses: { 200: { description: 'The report', schema: z.union([ReportOwnerView, PublicReport]) } },
		errors: ['NOT_FOUND', 'GONE'],
	},
	optionalAuth,
	ReportsController.getReport
);

export default router;
