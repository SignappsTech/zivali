// Stripe over plain fetch (Checkout Sessions + signature check), so no SDK dependency is needed yet.
import { createHmac, timingSafeEqual } from 'node:crypto';

import type { PaymentEvent, PaymentsAdapter } from './index.ts';

const TOLERANCE_S = 300;
const TYPES: Record<string, PaymentEvent['type']> = {
	'checkout.session.completed': 'checkout.completed',
	'checkout.session.expired': 'checkout.expired',
	'checkout.session.async_payment_failed': 'payment.failed',
};

export function stripePayments(secretKey: string, webhookSecret: string): PaymentsAdapter {
	return {
		async createCheckout(input) {
			const form = new URLSearchParams({
				mode: 'payment',
				success_url: input.successUrl,
				cancel_url: input.cancelUrl,
				'line_items[0][quantity]': '1',
				'line_items[0][price_data][currency]': input.currency,
				'line_items[0][price_data][unit_amount]': String(input.amountCents),
				'line_items[0][price_data][product_data][name]': input.description,
			});
			for (const [k, v] of Object.entries(input.metadata ?? {})) form.set(`metadata[${k}]`, v);
			const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
				method: 'POST',
				headers: { authorization: `Bearer ${secretKey}`, 'idempotency-key': input.idempotencyKey },
				body: form,
			});
			if (!res.ok) throw new Error(`stripe: HTTP ${res.status}`);
			const json = (await res.json()) as { id: string; url: string };
			return { id: json.id, url: json.url };
		},
		parseWebhook(rawBody, signature) {
			// The header may hold several v1 signatures during secret rotation: any one matching is enough.
			const pairs = (signature ?? '').split(',').map((p) => p.split('=') as [string, string]);
			const ts = pairs.find(([k]) => k === 't')?.[1] ?? '';
			const t = Number(ts);
			const expected = Buffer.from(createHmac('sha256', webhookSecret).update(`${ts}.${rawBody}`).digest('hex'));
			const matches = pairs.some(([k, v]) => {
				const given = Buffer.from(v ?? '');
				return k === 'v1' && given.length === expected.length && timingSafeEqual(expected, given);
			});
			if (!t || Math.abs(Date.now() / 1000 - t) > TOLERANCE_S || !matches) {
				throw new Error('invalid webhook signature');
			}
			const event = JSON.parse(rawBody) as {
				id: string;
				type: string;
				data: { object: { id: string; metadata?: Record<string, string> } };
			};
			return {
				id: event.id,
				type: TYPES[event.type] ?? 'other',
				checkoutId: event.data.object.id,
				metadata: event.data.object.metadata ?? {},
			};
		},
	};
}
