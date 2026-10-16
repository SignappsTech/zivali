// /v1/reports: wiring only (manage-link resend: C7; transitions: the C4 status machine). Search arrives with TASK-31.3.
import { Router } from 'express';
import { z } from 'zod';

import {
	CodeParams,
	CreateReportInput,
	CreateReportResponse,
	MapReportList,
	MapReportQuery,
	PublicReport,
	ReportList,
	ReportOwnerView,
	ReportTransitionInput,
	ReportSearch,
	UpdateReportInput,
	Uuid,
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
			'Requires `Idempotency-Key: <uuid>` (a replay from the same user returns the stored response for 24 h; ' +
			'later, or after a 5xx, the same key and body from the same user return the report created then with 201, ' +
			'with a new `manage_token` for anonymous callers whose old link stops working, none for closed or removed ' +
			'reports, 3 new links per report per day, then RATE_LIMITED; another body: CONFLICT). ' +
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

// Before /:code, so 'map' is not read as a short code.
route(
	{
		method: 'get',
		path: '/',
		operationId: 'searchReports',
		summary: 'Search public reports (list)',
		description:
			'Visible open and matched reports (with `include_closed=true` also those closed or reunited in the last 30 ' +
			'days), filtered by `bbox=w,s,e,n` and/or `near=lat,lng,km` (km ≤ 100) on the fuzzed public centre, ' +
			'`types`, `species`, `colours` (any of), `sizes` (comma lists) and `from`/`to` on event_at. Boosted reports ' +
			'first, then `sort=recent` (event_at, newest first; default) or `sort=distance` (needs `near`). Keyset ' +
			'pages: `cursor` = the last item id, `limit` ≤ 50 (default 20). Items are PublicReport only (also your own ' +
			'reports, with `is_mine`). `Cache-Control: private, no-store`.',
		request: { query: ReportSearch.extend({ cursor: Uuid.optional() }) },
		responses: { 200: { description: 'One page of reports', schema: ReportList } },
	},
	optionalAuth,
	rateLimit('reports.search', { limit: 120, window: 60, key: 'ip' }),
	ReportsController.searchReports
);

route(
	{
		method: 'get',
		path: '/map',
		operationId: 'getMapReports',
		summary: 'Public reports in a map viewport',
		description:
			'Minimal map items (fuzzed area, boosted, first thumbnail) of the reports whose public centre is in ' +
			'`bbox=w,s,e,n`, with the list filters; boosted first, then newest events. `limit` ≤ 1000 (default 500). ' +
			'`Cache-Control: private, no-store`.',
		request: { query: MapReportQuery },
		responses: { 200: { description: 'Map items', schema: MapReportList } },
	},
	optionalAuth,
	rateLimit('reports.map', { limit: 120, window: 60, key: 'ip' }),
	ReportsController.mapReports
);

route(
	{
		method: 'post',
		path: '/:code/transitions',
		operationId: 'transitionReport',
		summary: 'Change the status of a report (managers)',
		description:
			'C4 status machine. `mark_reunited` (open or matched → reunited): its matches close, nearby alerts stop, ' +
			'the boost ends, conversations become read-only, and the report on the other side of each confirmed ' +
			'match is reunited too and its managers notified. `close` (open or matched → closed) needs `reason` ' +
			'(found_elsewhere, gave_up, returned_to_owner, other) and ends the manage link. `reopen` (reunited or ' +
			'closed → open) within 7 days (`lifecycle.reopen_days`), later GONE. `extend` keeps the status and ' +
			'restarts the idle timer of the automatic expiry. A transition the status does not allow: CONFLICT.',
		request: { params: CodeParams, body: ReportTransitionInput },
		responses: { 200: { description: 'The report after the transition', schema: ReportOwnerView } },
		errors: ['UNAUTHENTICATED', 'FORBIDDEN', 'NOT_FOUND', 'CONFLICT', 'GONE', 'DUPLICATE_OPEN_REPORT'],
	},
	authMiddleware,
	rateLimit('reports.transition', { limit: 60, window: 3600, key: 'user' }),
	ReportsController.transitionReport
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
