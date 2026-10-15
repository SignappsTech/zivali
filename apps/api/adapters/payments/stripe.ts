// Stripe over plain fetch (Checkout Sessions + signature check), so no SDK dependency is needed yet.
import { createHmac, timingSafeEqual } from 'node:crypto';

import type { PaymentEvent, PaymentsAdapter } from './index.ts';

const TOLERANCE_S = 300;
const TYPES: Record<string, PaymentEvent['type']> = {
	'checkout.session.completed': 'checkout.completed',
	'checkout.session.expired': 'checkout.expired',
	'payment_intent.payment_failed': 'payment.failed',
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
			const parts = Object.fromEntries((signature ?? '').split(',').map((p) => p.split('=') as [string, string]));
			const t = Number(parts.t);
			const expected = createHmac('sha256', webhookSecret).update(`${parts.t}.${rawBody}`).digest('hex');
			const a = Buffer.from(expected);
			const b = Buffer.from(parts.v1 ?? '');
			if (
				!t ||
				Math.abs(Date.now() / 1000 - t) > TOLERANCE_S ||
				a.length !== b.length ||
				!timingSafeEqual(a, b)
			) {
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
