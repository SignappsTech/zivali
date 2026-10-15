// /v1/alert-subscription (C10 §Nearby alerts): the caller's own nearby-alert subscription. Wiring only.
import { Router } from 'express';
import { z } from 'zod';

import { AlertSubscription, AlertSubscriptionInput } from '@zivali/validation';

import AlertSubscriptionController from '../controllers/alert-subscription.controller.ts';
import { apiRoutes } from '../lib/openapi.ts';
import { authMiddleware } from '../middleware/auth.middleware.ts';
import { rejectAnonymous, requireVerified } from '../middleware/permission.middleware.ts';
import { rateLimit } from '../middleware/rateLimit.middleware.ts';

const router = Router();
const route = apiRoutes(router, '/v1/alert-subscription');

route(
	{
		method: 'get',
		path: '/',
		operationId: 'getAlertSubscription',
		summary: 'Own nearby-alert subscription',
		description: 'The caller’s subscription, or null when there is none. Real accounts only (C10).',
		responses: { 200: { description: 'The subscription or null', schema: z.union([AlertSubscription, z.null()]) } },
		errors: ['UNAUTHENTICATED'],
	},
	authMiddleware,
	rejectAnonymous,
	AlertSubscriptionController.get
);

route(
	{
		method: 'put',
		path: '/',
		operationId: 'saveAlertSubscription',
		summary: 'Create or replace the own nearby-alert subscription',
		description:
			'Needs a confirmed email. center is stored coarsened by 20-30 m (C6); sending the stored centre back keeps it. ' +
			'radius_km 1-25; paused keeps the subscription without alerts.',
		request: { body: AlertSubscriptionInput },
		responses: { 200: { description: 'The saved subscription', schema: AlertSubscription } },
		errors: ['UNAUTHENTICATED', 'UNVERIFIED_EMAIL'],
	},
	authMiddleware,
	requireVerified,
	rateLimit('alerts.save', { limit: 30, window: 3600, key: 'user' }),
	AlertSubscriptionController.save
);

route(
	{
		method: 'delete',
		path: '/',
		operationId: 'deleteAlertSubscription',
		summary: 'Delete the own nearby-alert subscription',
		description: 'Stops all nearby alerts; 204 also when there was none.',
		responses: { 204: { description: 'Deleted' } },
		errors: ['UNAUTHENTICATED'],
	},
	authMiddleware,
	rejectAnonymous,
	AlertSubscriptionController.remove
);

export default router;
