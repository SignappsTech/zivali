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
	AdminMunicipalityShelter,
	AdminMunicipalityShelterList,
	AdminQueues,
	AdminShelterList,
	AdminLeadList,
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
	CursorQuery,
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
import PartnersController from '../controllers/partners.controller.ts';
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
		path: '/leads',
		operationId: 'listAdminLeads',
		summary: 'Partner leads',
		description: 'Admins (aal2). Enquiries from the partners page, newest first, with contact data (C14). Audited.',
		request: { query: CursorQuery },
		responses: { 200: { description: 'One page of leads', schema: AdminLeadList } },
		errors: [...staffErrors],
	},
	adminOnly,
	PartnersController.listLeads
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
