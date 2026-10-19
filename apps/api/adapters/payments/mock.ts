// Mock provider (C13): Checkout is the web dev page APP_URL/dev/checkout?payment_id=…&return_to=…; its Success,
// Fail and Cancel buttons post mockEvent() bodies to POST /v1/webhooks/stripe, signed like Stripe (signWebhook) with
// MOCK_WEBHOOK_SECRET, so the webhook runs the same parsing and ledger path as with real Stripe events.
import { randomUUID } from 'node:crypto';

import { CheckoutInput } from '@zivali/validation';

import configStore from '../../lib/config-store.ts';
import type { PaymentsAdapter } from './index.ts';
import { verifyEvent } from './stripe.ts';

// Lookup key → interval; the amount is app_config payments.prices `<lookup key>_cents` (C13 §Mock provider).
const MOCK_INTERVALS: Record<string, string> = { premium_monthly: 'month', premium_yearly: 'year' };

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
		live: false,
		async createCheckout({ paymentId, successUrl }) {
			const url = new URL('/dev/checkout', appUrl);
			url.searchParams.set('payment_id', paymentId);
			// return_to rides on the success URL the domain built; it passes only under the checkout's own C13 rule
			// (same-origin path), so the dev page never becomes an open redirect.
			const returnTo = new URL(successUrl).searchParams.get('return_to');
			if (returnTo && CheckoutInput.shape.return_to.safeParse(returnTo).success)
				url.searchParams.set('return_to', returnTo);
			return { id: `mock_cs_${paymentId}`, url: url.toString() };
		},
		async findPrice(lookupKey) {
			const prices = (await configStore.get('payments.prices')) as Record<string, unknown> | undefined;
			const cents = prices?.[`${lookupKey}_cents`];
			const interval = Object.hasOwn(MOCK_INTERVALS, lookupKey) ? MOCK_INTERVALS[lookupKey]! : null;
			if (!interval || typeof cents !== 'number') return null;
			return { id: `mock_price_${lookupKey}`, unit_amount: cents, currency: 'eur', interval };
		},
		parseWebhook: (rawBody, signature) => verifyEvent(rawBody, signature, secret),
	};
}
