// /v1/admin (C3, ADR-018): staff routes. Wiring only. Admin areas of later tasks add their routes here.
import { Router } from 'express';

import {
	AdminAbuseReportList,
	AdminAbuseReportQuery,
	AdminMunicipalityShelter,
	AdminMunicipalityShelterList,
	AdminQueues,
	AdminShelterList,
	AdminUserList,
	AdminUserQuery,
	AuditLogList,
	AuditLogQuery,
	CreateShelterInput,
	DeleteShelterInput,
	DirectoryChangeList,
	DirectoryImportInput,
	DirectoryImportQuery,
	DirectoryImportResult,
	IdParams,
	ModerationFlagList,
	ModerationFlagQuery,
	MunicipalityShelterInput,
	MunicipalityShelterParams,
	SetRoleInput,
	SetRoleResponse,
	Shelter,
	ShelterSlugParams,
	UpdateShelterInput,
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

// Shelter directory (C18 §Admin, TASK-89): admins (aal2). Every write needs audit_note, bumps the row's version and
// adds a directory_changes row and an audit entry; the public /v1/shelters endpoints read the change at once.
// Admin-only is checked for the whole area before the route's request validation (a moderator gets FORBIDDEN).
router.use(['/shelters', '/municipality-shelters', '/directory'], adminOnly);
const directoryWrite = rateLimit('admin.directory', { limit: 300, window: 3600, key: 'user' });
const conflict = 'CONFLICT when `version` is stale (details.version = the current one).';

route(
	{
		method: 'get',
		path: '/shelters',
		operationId: 'listAdminShelters',
		summary: 'All shelters for editing',
		description: 'Admins (aal2). Inactive shelters included; municipality_count = confirmed municipalities.',
		responses: { 200: { description: 'Shelters by name', schema: AdminShelterList } },
		errors: [...staffErrors],
	},
	AdminController.listShelters
);

route(
	{
		method: 'get',
		path: '/municipality-shelters',
		operationId: 'listAdminMunicipalityShelters',
		summary: 'All municipality assignments',
		description: 'Admins (aal2). shelter_slug is the confirmed shelter, or the likely one of an UNCONFIRMED row.',
		responses: { 200: { description: 'Assignments by municipality name', schema: AdminMunicipalityShelterList } },
		errors: [...staffErrors],
	},
	AdminController.listMunicipalityShelters
);

route(
	{
		method: 'get',
		path: '/shelters/:slug/changes',
		operationId: 'listShelterChanges',
		summary: "A shelter's versions",
		description: 'Admins (aal2). Newest first; data is the full row after each change.',
		request: { params: ShelterSlugParams },
		responses: { 200: { description: 'Versions', schema: DirectoryChangeList } },
		errors: [...staffErrors, 'NOT_FOUND'],
	},
	AdminController.listShelterChanges
);

route(
	{
		method: 'post',
		path: '/shelters',
		operationId: 'createShelter',
		summary: 'Add a shelter',
		description:
			'Admins (aal2). The slug is derived from the name unless sent; a taken slug is VALIDATION. municipalities become CONFIRMED for it.',
		request: { body: CreateShelterInput },
		responses: { 201: { description: 'The shelter', schema: Shelter } },
		errors: [...staffErrors],
	},
	directoryWrite,
	AdminController.createShelter
);

route(
	{
		method: 'put',
		path: '/shelters/:slug',
		operationId: 'updateShelter',
		summary: 'Edit a shelter',
		description: `Admins (aal2). Replaces the fields and the confirmed municipalities (dropped ones become UNCONFIRMED without a shelter); the slug never changes. ${conflict}`,
		request: { params: ShelterSlugParams, body: UpdateShelterInput },
		responses: { 200: { description: 'The shelter', schema: Shelter } },
		errors: [...staffErrors, 'NOT_FOUND', 'CONFLICT'],
	},
	directoryWrite,
	AdminController.updateShelter
);

route(
	{
		method: 'delete',
		path: '/shelters/:slug',
		operationId: 'deleteShelter',
		summary: 'Remove a shelter',
		description:
			'Admins (aal2). Deactivates the shelter (it has history; the slug stays taken). CONFLICT with details.code HAS_ASSIGNMENTS (and count) while municipalities are confirmed to it.',
		request: { params: ShelterSlugParams, body: DeleteShelterInput },
		responses: { 204: { description: 'Deactivated' } },
		errors: [...staffErrors, 'NOT_FOUND', 'CONFLICT'],
	},
	directoryWrite,
	AdminController.deleteShelter
);

route(
	{
		method: 'put',
		path: '/municipality-shelters/:municipality',
		operationId: 'updateMunicipalityShelter',
		summary: 'Reassign a municipality',
		description: `Admins (aal2). CONFIRMED needs an active shelter. ${conflict}`,
		request: { params: MunicipalityShelterParams, body: MunicipalityShelterInput },
		responses: { 200: { description: 'The assignment', schema: AdminMunicipalityShelter } },
		errors: [...staffErrors, 'NOT_FOUND', 'CONFLICT'],
	},
	directoryWrite,
	AdminController.updateMunicipalityShelter
);

route(
	{
		method: 'post',
		path: '/directory/import',
		operationId: 'importDirectory',
		summary: 'Import a directory CSV',
		description:
			'Admins (aal2). shelters.csv or municipality_shelters.csv (seed format, told apart by the header). dry_run=true returns the diff and writes nothing; otherwise the diff is applied in one transaction, only when errors is empty, and audit_note is required.',
		request: { query: DirectoryImportQuery, body: DirectoryImportInput },
		responses: { 200: { description: 'Diff and row errors', schema: DirectoryImportResult } },
		errors: [...staffErrors],
	},
	rateLimit('admin.directory.import', { limit: 60, window: 3600, key: 'user' }),
	AdminController.importDirectory
);

export default router;
