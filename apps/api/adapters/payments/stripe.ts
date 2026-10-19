// Stripe over plain fetch (Checkout Sessions + signature check), so no SDK dependency is needed.
import { createHmac, timingSafeEqual } from 'node:crypto';

import { z } from 'zod';

import { AppError } from '../../lib/errors.ts';
import type { PaymentEvent, PaymentsAdapter } from './index.ts';
import { STRIPE_API_VERSION } from './stripe-version.ts';

const TOLERANCE_S = 300;

// Only the fields the ledger uses; everything else (customer details, card data) is dropped right here.
const StripeEvent = z.object({
	id: z.string().min(1).max(255),
	type: z.string().min(1).max(255),
	livemode: z.boolean(),
	data: z.object({
		object: z.object({
			id: z.string().min(1).max(255),
			payment_intent: z.string().max(255).nullish(),
			amount_total: z.number().int().nullish(),
			amount: z.number().int().nullish(),
			amount_refunded: z.number().int().nonnegative().nullish(),
			currency: z.string().max(8).nullish(),
			payment_status: z.string().max(32).nullish(),
			status: z.string().max(32).nullish(),
			refunded: z.boolean().nullish(),
			metadata: z.record(z.string(), z.string()).nullish(),
		}),
	}),
});

// GET /v1/prices: the fields the price check (C13 §Prices) compares.
const StripePrices = z.object({
	data: z.array(
		z.object({
			id: z.string().min(1).max(255),
			unit_amount: z.number().int().nullable(),
			currency: z.string().max(8),
			recurring: z.object({ interval: z.string().max(16) }).nullable(),
		})
	),
});

const invalid = () => new AppError('VALIDATION', 'Invalid webhook signature or payload');
const unavailable = () => new AppError('SERVICE_UNAVAILABLE', 'Payment provider unavailable');

/** The Stripe-Signature header for a body (`t=<unix s>,v1=<hex HMAC-SHA256 of "t.body">`); mock events and tests. */
export function signWebhook(rawBody: string, secret: string, t = Math.floor(Date.now() / 1000)): string {
	return `t=${t},v1=${createHmac('sha256', secret).update(`${t}.${rawBody}`).digest('hex')}`;
}

/** Stripe's signature scheme, shared by the stripe and mock providers (different secrets). */
export function verifyEvent(rawBody: string, signature: string | undefined, secret: string): PaymentEvent {
	// The header may hold several v1 signatures during secret rotation: any one matching is enough.
	const pairs = (signature ?? '').split(',').map((p) => p.split('=') as [string, string]);
	const ts = pairs.find(([k]) => k === 't')?.[1] ?? '';
	const t = Number(ts);
	const expected = Buffer.from(createHmac('sha256', secret).update(`${ts}.${rawBody}`).digest('hex'));
	const matches = pairs.some(([k, v]) => {
		const given = Buffer.from(v ?? '');
		return k === 'v1' && given.length === expected.length && timingSafeEqual(expected, given);
	});
	if (!t || Math.abs(Date.now() / 1000 - t) > TOLERANCE_S || !matches) throw invalid();
	let json: unknown;
	try {
		json = JSON.parse(rawBody);
	} catch {
		throw invalid();
	}
	const parsed = StripeEvent.safeParse(json);
	if (!parsed.success) throw invalid();
	const { id, type, livemode, data } = parsed.data;
	const o = data.object;
	return {
		id,
		type,
		livemode,
		object: {
			id: o.id,
			payment_intent: o.payment_intent,
			amount: o.amount_total ?? o.amount,
			amount_refunded: o.amount_refunded,
			currency: o.currency,
			status: o.payment_status ?? o.status,
			refunded: o.refunded,
			metadata: o.metadata ?? {},
		},
	};
}

export function stripePayments(secretKey: string, webhookSecret: string): PaymentsAdapter {
	const live = /^(sk|rk|pk)_live_/.test(secretKey);
	return {
		provider: 'stripe',
		live,
		async createCheckout(input) {
			const form = new URLSearchParams({
				mode: 'payment',
				// The account turns Managed Payments on by default, which needs a product tax code per line item;
				// Najdimo is the merchant here (fiscal invoices: TASK-92), so it is off per session.
				'managed_payments[enabled]': 'false',
				success_url: input.successUrl,
				cancel_url: input.cancelUrl,
				locale: input.locale,
				client_reference_id: input.paymentId,
				'metadata[payment_id]': input.paymentId,
				// Copied to the charge, so charge.refunded finds the payment too.
				'payment_intent_data[metadata][payment_id]': input.paymentId,
				'line_items[0][quantity]': '1',
				'line_items[0][price_data][currency]': input.currency,
				'line_items[0][price_data][unit_amount]': String(input.amountCents),
				'line_items[0][price_data][product_data][name]': input.description,
			});
			let res: Response;
			try {
				res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
					method: 'POST',
					// One session per payment row: a retried request reuses it.
					headers: {
						authorization: `Bearer ${secretKey}`,
						'idempotency-key': input.paymentId,
						'stripe-version': STRIPE_API_VERSION,
					},
					body: form,
					signal: AbortSignal.timeout(10_000),
				});
			} catch {
				// Timeout or network failure: the provider is unavailable (C1/C13), no payment row is written.
				throw unavailable();
			}
			if (!res.ok) throw new Error(`stripe: HTTP ${res.status}`);
			const json = (await res.json()) as { id: string; url: string; livemode?: boolean };
			if (json.livemode && !live)
				throw new AppError('LIVE_MODE_FORBIDDEN', 'Live mode is refused (test mode only)');
			return { id: json.id, url: json.url };
		},
		async findPrice(lookupKey) {
			const url = new URL('https://api.stripe.com/v1/prices');
			url.searchParams.append('lookup_keys[]', lookupKey);
			url.searchParams.set('active', 'true');
			let res: Response;
			try {
				res = await fetch(url, {
					headers: { authorization: `Bearer ${secretKey}`, 'stripe-version': STRIPE_API_VERSION },
					signal: AbortSignal.timeout(10_000),
				});
			} catch {
				throw unavailable();
			}
			if (!res.ok) throw new Error(`stripe: HTTP ${res.status}`);
			// An unexpected shape is our bug or Stripe's, never the client's: a plain error (500), not VALIDATION.
			const parsed = StripePrices.safeParse(await res.json());
			if (!parsed.success) throw new Error('stripe: unexpected price list');
			const price = parsed.data.data[0];
			if (!price) return null;
			const { id, unit_amount, currency, recurring } = price;
			return { id, unit_amount, currency, interval: recurring?.interval ?? null };
		},
		parseWebhook: (rawBody, signature) => verifyEvent(rawBody, signature, webhookSecret),
	};
}
