// Mock provider (C13): Checkout is the web dev page APP_URL/dev/checkout?payment_id=…; its Success, Fail and Cancel
// buttons post mockEvent() bodies to POST /v1/webhooks/stripe, signed like Stripe (signWebhook) with
// MOCK_WEBHOOK_SECRET, so the webhook runs the same parsing and ledger path as with real Stripe events.
import { randomUUID } from 'node:crypto';

import type { PaymentsAdapter } from './index.ts';
import { verifyEvent } from './stripe.ts';

export { signWebhook } from './stripe.ts';

export const MOCK_OUTCOMES = {
	success: 'checkout.session.completed',
	fail: 'checkout.session.async_payment_failed',
	cancel: 'checkout.session.expired',
} as const;

/** The JSON body of a mock event for one payment (what the dev page posts). */
export function mockEvent(outcome: keyof typeof MOCK_OUTCOMES, paymentId: string): string {
	return JSON.stringify({
		id: `mock_evt_${randomUUID()}`,
		type: MOCK_OUTCOMES[outcome],
		livemode: false,
		data: {
			object: {
				id: `mock_cs_${paymentId}`,
				payment_intent: outcome === 'success' ? `mock_pi_${paymentId}` : null,
				payment_status: outcome === 'success' ? 'paid' : 'unpaid',
				metadata: { payment_id: paymentId },
			},
		},
	});
}

export function mockPayments(appUrl: string, secret: string): PaymentsAdapter {
	return {
		provider: 'mock',
		async createCheckout({ paymentId }) {
			const url = new URL('/dev/checkout', appUrl);
			url.searchParams.set('payment_id', paymentId);
			return { id: `mock_cs_${paymentId}`, url: url.toString() };
		},
		parseWebhook: (rawBody, signature) => verifyEvent(rawBody, signature, secret),
	};
}
