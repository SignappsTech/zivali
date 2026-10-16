// /v1/me (C3): the caller's own profile, the reports they manage (C4), their payments (C13) and the password of an
// anonymous session that becomes an account (C7 §6). Wiring only.
import { Router } from 'express';

import {
	ConvertPasswordInput,
	CursorQuery,
	Me,
	MyReportList,
	PaymentList,
	Profile,
	UpdateMeInput,
	Uuid,
} from '@zivali/validation';

import MeController from '../controllers/me.controller.ts';
import PaymentsController from '../controllers/payments.controller.ts';
import ReportsController from '../controllers/reports.controller.ts';
import { apiRoutes } from '../lib/openapi.ts';
import { authMiddleware } from '../middleware/auth.middleware.ts';
import { rejectAnonymous } from '../middleware/permission.middleware.ts';
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
		method: 'post',
		path: '/convert-password',
		operationId: 'convertAnonymousPassword',
		summary: 'Set the password of an anonymous session that becomes an account',
		description:
			'C7 §6. Anonymous sessions only (the token and Supabase Auth both say so), after updateUser({ email }) has ' +
			'left an address pending: sets the password (the sign-up policy, 8–72 characters) with the Auth Admin API, ' +
			'because GoTrue asks a session older than 24 h to reauthenticate, which an anonymous user cannot. The user ' +
			'stays anonymous until the email_change link is opened. FORBIDDEN for an account or without a pending ' +
			'address. Audited without the password. 10 per hour per IP.',
		request: { body: ConvertPasswordInput },
		responses: { 204: { description: 'Password set' } },
		errors: ['UNAUTHENTICATED', 'FORBIDDEN', 'SERVICE_UNAVAILABLE'],
	},
	authMiddleware,
	rateLimit('me.convert_password', { limit: 10, window: 3600, key: 'ip' }),
	MeController.convertPassword
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

route(
	{
		method: 'get',
		path: '/payments',
		operationId: 'listMyPayments',
		summary: 'My payments',
		description:
			'The caller’s payments (every status), newest first, keyset-paginated (`cursor` = the last item id, `limit` ≤ 50). Real accounts only (C13).',
		request: { query: CursorQuery.extend({ cursor: Uuid.optional() }) },
		responses: { 200: { description: 'One page of own payments', schema: PaymentList } },
		errors: ['UNAUTHENTICATED'],
	},
	authMiddleware,
	rejectAnonymous,
	PaymentsController.listMine
);

export default router;
