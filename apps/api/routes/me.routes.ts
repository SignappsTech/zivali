// /v1/me (C3): the caller's own profile, and the reports they manage (C4). Wiring only.
import { Router } from 'express';

import { CursorQuery, Me, MyReportList, Profile, UpdateMeInput, Uuid } from '@zivali/validation';

import MeController from '../controllers/me.controller.ts';
import ReportsController from '../controllers/reports.controller.ts';
import { apiRoutes } from '../lib/openapi.ts';
import { authMiddleware } from '../middleware/auth.middleware.ts';
import { rateLimit } from '../middleware/rateLimit.middleware.ts';

const router = Router();
const route = apiRoutes(router, '/v1/me');

route(
	{
		method: 'get',
		path: '/',
		operationId: 'getMe',
		summary: 'Own profile',
		description:
			'The own profile including private fields, plus email, email_verified (auth.users.email_confirmed_at), is_anonymous, role and aal (C3).',
		responses: { 200: { description: 'Own profile', schema: Me } },
		errors: ['UNAUTHENTICATED'],
	},
	authMiddleware,
	MeController.getMe
);

route(
	{
		method: 'patch',
		path: '/',
		operationId: 'updateMe',
		summary: 'Update own profile',
		description:
			'Partial update of the own profile. home is stored coarsened by 20-30 m (C6); sending the stored point back keeps it. The role cannot be changed here.',
		request: { body: UpdateMeInput },
		responses: { 200: { description: 'Updated profile', schema: Profile } },
		errors: ['UNAUTHENTICATED'],
	},
	authMiddleware,
	rateLimit('me.update', { limit: 60, window: 3600, key: 'user' }),
	MeController.updateMe
);

route(
	{
		method: 'get',
		path: '/reports',
		operationId: 'listMyReports',
		summary: 'Reports I manage',
		description:
			'ReportOwnerView of every report the caller manages (held, hidden and closed included), newest first, ' +
			'keyset-paginated (`cursor` = the last item id, `limit` ≤ 50).',
		request: { query: CursorQuery.extend({ cursor: Uuid.optional() }) },
		responses: { 200: { description: 'One page of own reports', schema: MyReportList } },
		errors: ['UNAUTHENTICATED'],
	},
	authMiddleware,
	ReportsController.listMyReports
);

export default router;
