// /v1/payments (C13): checkout and own payment reads; GET /v1/me/payments is in me.routes.ts. Wiring only.
import { Router } from 'express';

import { CheckoutInput, CheckoutResponse, IdParams, Payment } from '@zivali/validation';

import PaymentsController from '../controllers/payments.controller.ts';
import { apiRoutes } from '../lib/openapi.ts';
import { authMiddleware } from '../middleware/auth.middleware.ts';
import { idempotency } from '../middleware/idempotency.middleware.ts';
import { rejectAnonymous } from '../middleware/permission.middleware.ts';
import { rateLimit } from '../middleware/rateLimit.middleware.ts';

const router = Router();
const route = apiRoutes(router, '/v1/payments');

route(
	{
		method: 'post',
		path: '/checkout',
		operationId: 'startCheckout',
		summary: 'Start a checkout',
		description:
			'Real accounts only; `Idempotency-Key` required. tip, report_contribution and support take `amount_cents` ' +
			'(integer, ≤ 50 000; below 200 → 422 MIN_AMOUNT); boost is priced by app_config payments.prices, never by ' +
			'the client; subscriptions arrive in M4 (503). report_contribution needs `refs.report_id` of a report the ' +
			'caller manages. Inserts a pending payment and returns the Stripe Checkout URL (mock provider: ' +
			'APP_URL/dev/checkout). `return_scheme: true` (mobile) returns through zivali://payments/return.',
		request: { body: CheckoutInput },
		responses: { 200: { description: 'The pending payment and its checkout URL', schema: CheckoutResponse } },
		errors: ['UNAUTHENTICATED', 'FORBIDDEN', 'CONFLICT', 'MIN_AMOUNT', 'SERVICE_UNAVAILABLE'],
	},
	authMiddleware,
	rejectAnonymous,
	rateLimit('payments.checkout', { limit: 20, window: 3600, key: 'user' }),
	idempotency({ required: true }),
	PaymentsController.checkout
);

route(
	{
		method: 'get',
		path: '/:id',
		operationId: 'getPayment',
		summary: 'Own payment',
		description: 'One of the caller’s payments (the return page polls it); anyone else’s answers 404.',
		request: { params: IdParams },
		responses: { 200: { description: 'The payment', schema: Payment } },
		errors: ['UNAUTHENTICATED', 'NOT_FOUND'],
	},
	authMiddleware,
	rejectAnonymous,
	PaymentsController.get
);

export default router;
