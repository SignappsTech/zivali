// C13 examples (wire shape): checkout, a payment, the MIN_AMOUNT error.
import type { ApiErrorBody, CheckoutInput, CheckoutResponse, Payment } from '@zivali/types';

export const checkoutInput: CheckoutInput = {
	purpose: 'tip',
	amount_cents: 500,
	refs: { report_id: '7c1e4b2a-0000-4000-8000-000000000001' },
	locale: 'sl',
	return_to: '/r/Hk3vT9qP/reunited',
};

export const checkout: CheckoutResponse = {
	payment_id: '9d8c7b6a-0000-4000-8000-000000000001',
	checkout_url: 'https://checkout.stripe.com/c/pay/cs_test_a1b2c3',
};

export const payment: Payment = {
	id: checkout.payment_id,
	purpose: 'tip',
	amount_cents: 500,
	currency: 'EUR',
	status: 'succeeded',
	created_at: '2026-10-14T16:20:00Z',
	updated_at: '2026-10-14T16:21:30Z',
};

export const minAmount: ApiErrorBody = {
	error: { code: 'MIN_AMOUNT', message: 'Minimum card amount is EUR 2.00', details: { min_cents: 200 } },
};
