// /v1/payments (C13): checkout and own payment reads; GET /v1/me/payments is in me.routes.ts. Wiring only.
import { Router } from 'express';
import { z } from 'zod';

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

route(
	{
		method: 'get',
		path: '/:id/invoice.pdf',
		operationId: 'getInvoicePdf',
		summary: 'Own fiscal invoice (PDF)',
		description:
			'The fiscal invoice of one of the caller’s payments as `application/pdf` (download; number, VAT 22 % ' +
			'breakdown, ZOI and EOR), rendered by the worker after the payment succeeded. 404 for anyone else’s payment ' +
			'and until the invoice exists (or when fiscal invoicing is off for its purpose).',
		request: { params: IdParams },
		responses: {
			200: {
				description: 'The invoice PDF',
				schema: z.string().meta({ format: 'binary' }),
				contentType: 'application/pdf',
			},
		},
		errors: ['UNAUTHENTICATED', 'NOT_FOUND'],
	},
	authMiddleware,
	rejectAnonymous,
	rateLimit('payments.invoice_pdf', { limit: 60, window: 3600, key: 'user' }),
	PaymentsController.invoicePdf
);

export default router;
