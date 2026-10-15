// /v1/reports: wiring only (manage-link resend: C7). Search and transitions arrive with TASK-31.3 and TASK-26.3.
import { Router } from 'express';
import { z } from 'zod';

import {
	CodeParams,
	CreateReportInput,
	CreateReportResponse,
	PublicReport,
	ReportOwnerView,
	UpdateReportInput,
} from '@zivali/validation';

import ReportsController from '../controllers/reports.controller.ts';
import { apiRoutes } from '../lib/openapi.ts';
import { authMiddleware, optionalAuth } from '../middleware/auth.middleware.ts';
import { idempotency } from '../middleware/idempotency.middleware.ts';
import { rateLimit } from '../middleware/rateLimit.middleware.ts';

const router = Router();
const route = apiRoutes(router, '/v1/reports');

route(
	{
		method: 'post',
		path: '/',
		operationId: 'createReport',
		summary: 'Create a lost, found or sighted report',
		description:
			'Requires `Idempotency-Key: <uuid>` (a replay from the same user returns the stored response for 24 h). ' +
			'`location` is the point the client already coarsened; the API coarsens it again by 20–30 m and never ' +
			'stores or returns the received point. Lost reports need a real account. `warnings` may hold OLD_EVENT ' +
			'(event older than 30 days). Starts photo publishing, matching and, for visible lost reports, nearby alerts. ' +
			'Anonymous callers (C7): `manage_token` (shown once; a replay returns the same one), the manage link by ' +
			'email when `finder_email` is given (anonymous only), 5 reports per hour and 20 per day per IP and per ' +
			'`x-device-id`; a report may come back `held` (being checked).',
		request: { body: CreateReportInput },
		responses: { 201: { description: 'Created', schema: CreateReportResponse } },
		errors: ['UNAUTHENTICATED', 'FORBIDDEN', 'CONFLICT', 'DUPLICATE_OPEN_REPORT'],
	},
	authMiddleware,
	rateLimit('reports.create', { limit: 30, window: 3600, key: 'user' }),
	idempotency({ required: true }),
	ReportsController.createReport
);

route(
	{
		method: 'patch',
		path: '/:code',
		operationId: 'updateReport',
		summary: 'Update a report (managers)',
		description:
			'Partial CreateReportInput without `type`. No `location`, or the stored point sent back, keeps the stored ' +
			'point; a new point is coarsened anew. `photo_ids` replaces the photos in order. Removed, closed and ' +
			'reunited reports answer GONE.',
		request: { params: CodeParams, body: UpdateReportInput },
		responses: { 200: { description: 'The updated report', schema: ReportOwnerView } },
		errors: ['UNAUTHENTICATED', 'FORBIDDEN', 'NOT_FOUND', 'GONE', 'DUPLICATE_OPEN_REPORT'],
	},
	authMiddleware,
	rateLimit('reports.update', { limit: 120, window: 3600, key: 'user' }),
	ReportsController.updateReport
);

route(
	{
		method: 'post',
		path: '/:code/manage-link/resend',
		operationId: 'resendManageLink',
		summary: 'Email the manage link again (managers)',
		description:
			'Sends a new manage link to the finder email on file; the old link stops working (only the token hash is ' +
			'stored; it is written only after the email went out); if the email cannot be sent nothing changes (500). 3 per report per day. No email on file: ' +
			'CONFLICT; removed or closed more than 7 days ago: GONE.',
		request: { params: CodeParams },
		responses: { 204: { description: 'Sent' } },
		errors: ['UNAUTHENTICATED', 'FORBIDDEN', 'NOT_FOUND', 'CONFLICT', 'GONE'],
	},
	authMiddleware,
	ReportsController.resendManageLink
);

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
