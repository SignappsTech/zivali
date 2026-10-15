// /v1/admin (C3, ADR-018): staff routes. Wiring only. Admin areas of later tasks add their routes here.
import { Router } from 'express';

import {
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
