'use server';

import { getLocale } from 'next-intl/server';

import { redirect } from '@/i18n/navigation';
import { env } from '@/lib/env';
import { safeNext } from '@/lib/viewer';

import { MOCK_OUTCOMES, type MockOutcome, mockEvent, signWebhook } from './mock-event';

export type MockCheckoutState = { failed: true } | null;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Success, Fail or Cancel on /dev/checkout (C13 mock provider): posts the signed mock event to the API webhook, then
 * goes where Stripe would send the user, the return page (C15 paymentsReturn; cancel adds canceled=1). A server
 * action is a public endpoint, so it checks APP_ENV itself, as the page does.
 */
export async function sendMockEvent(_prev: MockCheckoutState, form: FormData): Promise<MockCheckoutState> {
	if (env.APP_ENV === 'production') throw new Error('The mock checkout is not available in production');
	const outcome = String(form.get('outcome'));
	const paymentId = String(form.get('payment_id'));
	if (!Object.hasOwn(MOCK_OUTCOMES, outcome) || !UUID.test(paymentId)) return { failed: true };

	const body = mockEvent(outcome as MockOutcome, paymentId);
	const response = await fetch(new URL('/v1/webhooks/stripe', env.NEXT_PUBLIC_API_URL), {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', 'Stripe-Signature': signWebhook(body, env.MOCK_WEBHOOK_SECRET) },
		body,
		cache: 'no-store',
	}).catch(() => null);
	if (!response?.ok) return { failed: true };

	const returnTo = safeNext(form.get('return_to'));
	return redirect({
		href: {
			pathname: '/payments/return',
			query: {
				payment_id: paymentId,
				...(returnTo && { return_to: returnTo }),
				...(outcome === 'cancel' && { canceled: '1' }),
			},
		},
		locale: await getLocale(),
	});
}
