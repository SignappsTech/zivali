// /v1/admin (C3, ADR-018): staff routes. Wiring only. Admin areas of later tasks add their routes here.
import { Router } from 'express';

import {
	AdDeleteInput,
	AdImageInput,
	AdImageUploadResponse,
	AdInput,
	AdminAd,
	AdminAdList,
	AdminAdQuery,
	AdStats,
	AdStatsQuery,
	AdStatusInput,
	AdminAbuseReportList,
	AdminAbuseReportQuery,
	AdminQueues,
	AdminUserList,
	AdminUserQuery,
	AuditLogList,
	AuditLogQuery,
	IdParams,
	ModerationFlagList,
	ModerationFlagQuery,
	SetRoleInput,
	SetRoleResponse,
} from '@zivali/validation';

import AbuseReportsController from '../controllers/abuse-reports.controller.ts';
import AdminController from '../controllers/admin.controller.ts';
import { apiRoutes } from '../lib/openapi.ts';
import { authMiddleware } from '../middleware/auth.middleware.ts';
import { requireAal2, requireRole } from '../middleware/permission.middleware.ts';
import { rateLimit } from '../middleware/rateLimit.middleware.ts';

const router = Router();
const route = apiRoutes(router, '/v1/admin');

// Every /v1/admin route, also future ones: a moderator or admin (role from app.profiles) with a TOTP session (aal2),
// checked before any request validation. Admin-only routes add requireRole('admin').
router.use(authMiddleware, requireRole('moderator'), requireAal2);

const staffErrors = ['UNAUTHENTICATED', 'FORBIDDEN', 'AAL2_REQUIRED'] as const;
const adminOnly = requireRole('admin');

route(
	{
		method: 'get',
		path: '/users',
		operationId: 'listAdminUsers',
		summary: 'Users for moderation',
		description:
			'Moderators and admins (aal2). query matches the display name or the email; emails are masked, no phone (C3). Audited.',
		request: { query: AdminUserQuery },
		responses: { 200: { description: 'One page of users, newest first', schema: AdminUserList } },
		errors: [...staffErrors],
	},
	AdminController.listUsers
);

route(
	{
		method: 'put',
		path: '/users/:id/role',
		operationId: 'setUserRole',
		summary: "Change a user's role",
		description:
			'Admins (aal2). The note is required and stored in the audit entry; the last admin cannot be demoted (CONFLICT). Takes effect on the next request of the user.',
		request: { params: IdParams, body: SetRoleInput },
		responses: { 200: { description: 'The new role', schema: SetRoleResponse } },
		errors: [...staffErrors, 'NOT_FOUND', 'CONFLICT'],
	},
	adminOnly,
	rateLimit('admin.role', { limit: 60, window: 3600, key: 'user' }),
	AdminController.setUserRole
);

route(
	{
		method: 'get',
		path: '/audit-log',
		operationId: 'listAuditLog',
		summary: 'Audit log',
		description: 'Admins (aal2). Staff and system actions, newest first, with exact-match filters. Audited.',
		request: { query: AuditLogQuery },
		responses: { 200: { description: 'One page of audit entries', schema: AuditLogList } },
		errors: [...staffErrors],
	},
	adminOnly,
	AdminController.listAuditLog
);

route(
	{
		method: 'get',
		path: '/queues',
		operationId: 'getAdminQueues',
		summary: 'Job queues',
		description:
			'Admins (aal2). pg-boss jobs per queue and state, and the latest failed jobs (error message only). Read-only; audited.',
		responses: { 200: { description: 'Queue state', schema: AdminQueues } },
		errors: [...staffErrors],
	},
	adminOnly,
	AdminController.getQueues
);

// Ads (C14 §Admin, TASK-37.2): admins (aal2) only; every write is audited.
const adWrites = rateLimit('admin.ads', { limit: 300, window: 3600, key: 'user' });
const adErrors = [...staffErrors, 'NOT_FOUND'] as const;
const saveRules =
	'Rejected with VALIDATION (one issue per field): alt text 5–140, https link, title ≤ 60, body ≤ 120, CTA ≤ 24, ' +
	'selling, giving away or rehoming animals (category and ads.blocked_terms keywords, SL and EN), an exclusive ad ' +
	'overlapping another exclusive ad in dates for a shared slot and region (a missing starts_at counts as now), and ' +
	'an uploaded image (path image) that is not a 4:3 JPG or PNG of at least 1200×900 px under 500 KB.';

route(
	{
		method: 'get',
		path: '/ads',
		operationId: 'listAdminAds',
		summary: 'Ads',
		description:
			'Admins (aal2). Newest first, without deleted ads; null targeting = every region, municipality or species.',
		request: { query: AdminAdQuery },
		responses: { 200: { description: 'One page of ads', schema: AdminAdList } },
		errors: [...staffErrors],
	},
	adminOnly,
	AdminController.listAds
);

route(
	{
		method: 'post',
		path: '/ads',
		operationId: 'createAd',
		summary: 'Create an ad',
		description: `Admins (aal2). Audited. ${saveRules}`,
		request: { body: AdInput },
		responses: { 201: { description: 'The new ad', schema: AdminAd } },
		errors: [...staffErrors],
	},
	adminOnly,
	adWrites,
	AdminController.createAd
);

route(
	{
		method: 'put',
		path: '/ads/:id',
		operationId: 'updateAd',
		summary: 'Edit an ad',
		description: `Admins (aal2). Fields left out keep their value, null clears one. Audited. ${saveRules}`,
		request: { params: IdParams, body: AdInput },
		responses: { 200: { description: 'The saved ad', schema: AdminAd } },
		errors: [...adErrors],
	},
	adminOnly,
	adWrites,
	AdminController.updateAd
);

route(
	{
		method: 'post',
		path: '/ads/:id/image',
		operationId: 'requestAdImageUpload',
		summary: 'Upload an ad image',
		description:
			'Admins (aal2). A 5-minute presigned PUT to the media bucket (ads/<id>/…) pinned to the declared type and size: 4:3, at least 1200×900 px, JPG or PNG under 500 KB. The ad keeps its current image: send the returned key as `image` on the next save, which checks the uploaded file and only then switches the image.',
		request: { params: IdParams, body: AdImageInput },
		responses: { 200: { description: 'Where to PUT the file', schema: AdImageUploadResponse } },
		errors: [...adErrors],
	},
	adminOnly,
	adWrites,
	AdminController.requestAdImageUpload
);

route(
	{
		method: 'post',
		path: '/ads/:id/status',
		operationId: 'setAdStatus',
		summary: "Change an ad's status",
		description: `Admins (aal2). Pausing or ending is always allowed; any other status runs the save checks. Stats are kept. Audited. ${saveRules}`,
		request: { params: IdParams, body: AdStatusInput },
		responses: { 200: { description: 'The saved ad', schema: AdminAd } },
		errors: [...adErrors],
	},
	adminOnly,
	adWrites,
	AdminController.setAdStatus
);

route(
	{
		method: 'delete',
		path: '/ads/:id',
		operationId: 'deleteAd',
		summary: 'Delete an ad',
		description:
			'Admins (aal2). Soft delete: no longer listed or served; stats are kept. The note is required and stored in the audit entry.',
		request: { params: IdParams, body: AdDeleteInput },
		responses: { 204: { description: 'Deleted' } },
		errors: [...adErrors],
	},
	adminOnly,
	adWrites,
	AdminController.deleteAd
);

route(
	{
		method: 'get',
		path: '/abuse-reports',
		operationId: 'listAdminAbuseReports',
		summary: 'Abuse reports',
		description:
			'Moderators and admins (aal2). Newest first, filtered by status and target type; the reporter as an id only (C11). Audited.',
		request: { query: AdminAbuseReportQuery },
		responses: { 200: { description: 'One page of abuse reports', schema: AdminAbuseReportList } },
		errors: [...staffErrors],
	},
	AbuseReportsController.listAdmin
);

route(
	{
		method: 'get',
		path: '/ads/:id/stats',
		operationId: 'getAdStats',
		summary: 'Ad stats',
		description:
			'Admins (aal2). Impressions, clicks and CTR (clicks / impressions) per day (Europe/Ljubljana), slot and region (null = unknown), from and to inclusive, at most 366 days.',
		request: { params: IdParams, query: AdStatsQuery },
		responses: { 200: { description: 'Daily rows', schema: AdStats } },
		errors: [...adErrors],
	},
	adminOnly,
	AdminController.getAdStats
);

route(
	{
		method: 'get',
		path: '/moderation-flags',
		operationId: 'listModerationFlags',
		summary: 'Moderation flags',
		description:
			'Moderators and admins (aal2). Duplicate chips, anonymous holds and auto-hidden listings, newest first (C11). Audited.',
		request: { query: ModerationFlagQuery },
		responses: { 200: { description: 'One page of moderation flags', schema: ModerationFlagList } },
		errors: [...staffErrors],
	},
	AbuseReportsController.listFlags
);

export default router;
