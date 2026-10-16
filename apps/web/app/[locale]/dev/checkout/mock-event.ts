import { createHmac, randomUUID } from 'node:crypto';

// C13 mock provider, the web half: the events apps/api/adapters/payments/mock.ts (mockEvent) describes, signed with
// Stripe's scheme, so POST /v1/webhooks/stripe takes the same path as with real Stripe events. Server only.

export const MOCK_OUTCOMES = {
	success: 'checkout.session.completed',
	fail: 'checkout.session.async_payment_failed',
	cancel: 'checkout.session.expired',
} as const;

export type MockOutcome = keyof typeof MOCK_OUTCOMES;

/** The JSON body of a mock event for one payment. */
export function mockEvent(outcome: MockOutcome, paymentId: string): string {
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

/** `Stripe-Signature` header: `t=<unix>,v1=<hex HMAC-SHA256 of "<t>.<body>">`. */
export function signWebhook(body: string, secret: string, t = Math.floor(Date.now() / 1000)): string {
	return `t=${t},v1=${createHmac('sha256', secret).update(`${t}.${body}`).digest('hex')}`;
}
