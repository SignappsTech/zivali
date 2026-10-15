// Payments (C13, ADR-011): checkout, the webhook ledger, own payment reads and payment.effects (receipt). Money only
// ever flows from a user to Najdimo; amounts are integer EUR cents; live mode is refused (adapter and webhook).
import { randomUUID } from 'node:crypto';

import { z } from 'zod';

import { USER_AMOUNT_PURPOSES, type Locale, type PaymentPurpose } from '@zivali/types';
import type { CheckoutInput } from '@zivali/validation';

import type { PAYMENT_PURPOSE, PAYMENT_STATUS } from '../../generated/enums.ts';
import configStore from '../../lib/config-store.ts';
import { config } from '../../lib/config.ts';
import type { Actor, Ctx } from '../../lib/ctx.ts';
import { AppError } from '../../lib/errors.ts';
import { prisma } from '../../prisma/prisma.ts';
import { NotificationsDomain } from '../notifications/index.ts';
import PaymentsDao, { type PaymentRow } from './payments.dao.ts';

/** Card minimum (C13 MIN_AMOUNT); the payments_amount_cents_check constraint holds the same floor. */
export const MIN_CENTS = 200;
const PAGE = 20;
const USER_AMOUNT: readonly PaymentPurpose[] = USER_AMOUNT_PURPOSES;

// Product name on the Checkout page.
const PRODUCT: Record<Locale, Record<PaymentPurpose, string>> = {
	sl: {
		tip: 'Zahvala za Najdimo',
		report_contribution: 'Prispevek za objavo iskanja',
		support: 'Podpora za Najdimo',
		boost: 'Izpostavitev prijave',
		subscription: 'Naročnina Najdimo',
	},
	en: {
		tip: 'Thank-you contribution to Najdimo',
		report_contribution: 'Contribution for publishing a search',
		support: 'Support for Najdimo',
		boost: 'Report boost',
		subscription: 'Najdimo subscription',
	},
};

// app_config payments.prices (C13): only the keys used so far are read.
const Prices = z.object({ boost_cents: z.number().int().min(MIN_CENTS) });

// C15 paymentsReturn: /placila/zakljucek (sl), /en/payments/return (en); the app returns through its scheme.
const RETURN_PATH: Record<Locale, string> = { sl: '/placila/zakljucek', en: '/en/payments/return' };
export const APP_RETURN_URL = 'zivali://payments/return';

function signedIn(ctx: Ctx): Actor {
	if (!ctx.actor || ctx.actor.is_anonymous) throw new AppError('UNAUTHENTICATED', 'Sign in required');
	return ctx.actor;
}

async function fixedPrice(purpose: PaymentPurpose): Promise<number> {
	// Subscriptions (Premium, Podpornik, Vet Partner) need a plan and Stripe Billing: M4.
	if (purpose === 'subscription') throw new AppError('SERVICE_UNAVAILABLE', 'Subscriptions are not available yet');
	const prices = Prices.safeParse(await configStore.get('payments.prices'));
	if (!prices.success) throw new Error('app_config payments.prices is missing or invalid');
	return prices.data.boost_cents;
}

function returnUrls(paymentId: string, input: z.infer<typeof CheckoutInput>) {
	const success = new URL(
		input.return_scheme ? APP_RETURN_URL : `${config.APP_URL.replace(/\/+$/, '')}${RETURN_PATH[input.locale]}`
	);
	success.searchParams.set('payment_id', paymentId);
	success.searchParams.set('return_to', input.return_to);
	const cancel = new URL(success);
	cancel.searchParams.set('canceled', '1');
	return { successUrl: success.toString(), cancelUrl: cancel.toString() };
}

/**
 * POST /v1/payments/checkout: the amount (user-chosen, or the fixed price from app_config, never the client), the
 * MIN_AMOUNT floor and report ownership, then the provider session (Stripe Checkout or the mock dev page) and the
 * payments row, pending. The provider call comes first, so a provider failure leaves no row behind; the webhook
 * cannot arrive earlier, since the customer only reaches Checkout through the URL returned here.
 */
export async function createCheckout(
	input: z.infer<typeof CheckoutInput>,
	ctx: Ctx
): Promise<{ payment_id: string; checkout_url: string }> {
	const actor = signedIn(ctx);
	const amount = USER_AMOUNT.includes(input.purpose) ? input.amount_cents! : await fixedPrice(input.purpose);
	if (amount < MIN_CENTS)
		throw new AppError('MIN_AMOUNT', 'Minimum card amount is EUR 2.00', { min_cents: MIN_CENTS });
	const report_id = input.refs?.report_id;
	if (input.purpose === 'report_contribution' && !(await PaymentsDao.isReportManager(report_id!, actor.user_id)))
		throw new AppError('FORBIDDEN', 'Not a manager of this report');

	const id = randomUUID();
	const { payments } = ctx.adapters;
	const session = await payments.createCheckout({
		paymentId: id,
		amountCents: amount,
		currency: 'eur',
		description: PRODUCT[input.locale][input.purpose],
		locale: input.locale,
		...returnUrls(id, input),
	});
	await PaymentsDao.insertPayment(
		{
			id,
			user_id: actor.user_id,
			purpose: input.purpose.toUpperCase() as PAYMENT_PURPOSE,
			amount_cents: amount,
			provider: payments.provider,
			provider_session_id: session.id,
			...(report_id && { refs: { report_id } }),
		},
		ctx.tx
	);
	ctx.logger.info({ payment_id: id, purpose: input.purpose, provider: payments.provider }, 'payments: checkout');
	return { payment_id: id, checkout_url: session.url };
}

// Event type → status move. completed fires `unpaid` for delayed methods (settled by async_payment_succeeded or
// _failed); charge.refunded counts only once the charge is fully refunded.
const MOVES: Record<string, { to: PAYMENT_STATUS; from: PAYMENT_STATUS[] }> = {
	'checkout.session.completed': { to: 'SUCCEEDED', from: ['PENDING'] },
	'checkout.session.async_payment_succeeded': { to: 'SUCCEEDED', from: ['PENDING'] },
	'checkout.session.async_payment_failed': { to: 'FAILED', from: ['PENDING'] },
	'checkout.session.expired': { to: 'CANCELED', from: ['PENDING'] },
	'charge.refunded': { to: 'REFUNDED', from: ['PENDING', 'SUCCEEDED'] },
};

/**
 * POST /v1/webhooks/stripe: verified event (signature over the raw body), livemode refused, then in one transaction
 * the redacted payment_events row (a duplicate provider_event_id stops here), the status move and payment.effects.
 */
export async function handleWebhook(
	input: { rawBody: string; signature?: string },
	ctx: Ctx
): Promise<{ duplicate: boolean }> {
	const { payments } = ctx.adapters;
	const event = payments.parseWebhook(input.rawBody, input.signature);
	if (event.livemode) throw new AppError('LIVE_MODE_FORBIDDEN', 'Live mode events are refused (test mode only)');
	const o = event.object;
	return prisma.$transaction(async (tx) => {
		const fresh = await PaymentsDao.insertEvent(
			{
				provider: payments.provider,
				provider_event_id: event.id,
				type: event.type,
				// C13 redaction: never the raw event (customer details, card data).
				payload: {
					id: event.id,
					type: event.type,
					object_id: o.id,
					payment_intent: o.payment_intent ?? null,
					amount: o.amount ?? null,
					currency: o.currency ?? null,
					status: o.status ?? null,
					livemode: event.livemode,
				},
			},
			tx
		);
		if (!fresh) return { duplicate: true };
		const move = MOVES[event.type];
		const settled =
			move &&
			!(event.type === 'checkout.session.completed' && o.status === 'unpaid') &&
			!(event.type === 'charge.refunded' && !o.refunded);
		if (!settled) return { duplicate: false };
		const payment = await PaymentsDao.findForEvent(
			{ payment_id: o.metadata.payment_id, object_id: o.id, payment_intent: o.payment_intent },
			tx
		);
		if (!payment) {
			ctx.logger.warn({ event_id: event.id, event_type: event.type }, 'payments: event for an unknown payment');
			return { duplicate: false };
		}
		const data = { status: move.to, ...(o.payment_intent && { provider_payment_id: o.payment_intent }) };
		const moved = await PaymentsDao.moveStatus(payment.id, move.from, data, tx);
		ctx.logger.info(
			{ payment_id: payment.id, event_type: event.type, status: moved ? move.to : payment.status },
			'payments: webhook'
		);
		if (moved && move.to === 'SUCCEEDED')
			await ctx.jobs.send('payment.effects', { payment_id: payment.id }, { tx });
		return { duplicate: false };
	});
}

const EffectsInput = z.object({ payment_id: z.uuid() });

/**
 * payment.effects: the payment_receipt notification (email in the recipient's locale and in-app, C10) once per
 * succeeded payment; receipt_sent_at and the notify.send job commit together. Boosts and entitlements: M4.
 */
export async function paymentEffects(data: unknown, ctx: Ctx): Promise<void> {
	const parsed = EffectsInput.safeParse(data);
	if (!parsed.success) {
		ctx.logger.error('payment.effects: invalid job dropped');
		return;
	}
	const payment = await PaymentsDao.getPayment(parsed.data.payment_id);
	if (!payment?.user_id || payment.status !== 'SUCCEEDED' || payment.receipt_sent_at) return;
	const user_id = payment.user_id;
	await prisma.$transaction(async (tx) => {
		if (!(await PaymentsDao.markReceiptSent(payment.id, ctx.now, tx))) return;
		await NotificationsDomain.enqueueNotification(
			{
				user_id,
				type: 'payment_receipt',
				payload: { template: 'payment_receipt', payment_id: payment.id },
				dedupe_key: `payment_receipt:${payment.id}`,
			},
			{ ...ctx, tx }
		);
	});
}

/** GET /v1/payments/:id: the caller's own payment; anyone else's is NOT_FOUND. */
export async function getPayment(input: { id: string }, ctx: Ctx): Promise<PaymentRow> {
	const actor = signedIn(ctx);
	const payment = await PaymentsDao.getPayment(input.id, ctx.tx);
	if (!payment || payment.user_id !== actor.user_id) throw new AppError('NOT_FOUND', 'Payment not found');
	return payment;
}

/** GET /v1/me/payments: own payments, newest first, keyset-paginated. */
export async function listMyPayments(
	input: { cursor?: string; limit?: number },
	ctx: Ctx
): Promise<{ items: PaymentRow[]; next_cursor: string | null }> {
	const { user_id } = signedIn(ctx);
	const limit = input.limit ?? PAGE;
	const rows = await PaymentsDao.listByUser({ user_id, cursor: input.cursor, take: limit + 1 }, ctx.tx);
	const items = rows.slice(0, limit);
	return { items, next_cursor: rows.length > limit ? items[items.length - 1]!.id : null };
}

export default { createCheckout, handleWebhook, paymentEffects, getPayment, listMyPayments };
