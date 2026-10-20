// C13 payments (Stripe test mode, mock provider; no escrow). Endpoints are injectEndpoints stubs for TASK-32.1:
// delete them when `gen:api` emits the generated ones. `startCheckout` and the open helpers are hand-written and stay.
import type {
	CheckoutInput,
	CheckoutResponse,
	CursorQuery,
	Locale,
	Page,
	Payment,
	PaymentPurpose,
	Uuid,
} from '@zivali/types';

import { uuid } from './client.ts';
import { api, type ApiStore } from './rtk.ts';

/** The planned `Payment.invoice` (CH-293, TASK-32.8) with its CH-702 `test` flag: a mock PDF, not a fiscal document. */
export type PaymentInvoice = {
	number: string;
	status: 'pending' | 'verified' | 'failed';
	pdf_ready: boolean;
	test: boolean;
};
/** Stopgap until TASK-32.8 adds `invoice` to `Payment` in `@zivali/types`; then this becomes `Payment`. */
export type PaymentView = Payment & { invoice?: PaymentInvoice | null };

export const paymentsApi = api.enhanceEndpoints({ addTagTypes: ['Payment'] }).injectEndpoints({
	endpoints: (build) => ({
		/** `Idempotency-Key` is required (C1); keep one key per submit. */
		checkout: build.mutation<CheckoutResponse, { body: CheckoutInput; idempotencyKey: string }>({
			query: ({ body, idempotencyKey }) => ({
				url: '/v1/payments/checkout',
				method: 'POST',
				body,
				headers: { 'Idempotency-Key': idempotencyKey },
			}),
			invalidatesTags: ['Payment'],
		}),
		/** The caller's own payment (C13: 404 for another user's or an unknown id). */
		getPayment: build.query<PaymentView, { id: Uuid }>({
			query: ({ id }) => `/v1/payments/${encodeURIComponent(id)}`,
			providesTags: (_result, _error, { id }) => [{ type: 'Payment', id }],
		}),
		listMyPayments: build.query<Page<PaymentView>, CursorQuery | void>({
			query: (params) => ({ url: '/v1/me/payments', params: params ?? undefined }),
			providesTags: ['Payment'],
		}),
	}),
});

export const { useCheckoutMutation, useGetPaymentQuery, useListMyPaymentsQuery } = paymentsApi;

/** The receipt PDF (C13: owner only, 404 until the worker rendered it); `invoice.pdf_ready` says it is there. */
export const invoicePdfPath = (id: Uuid) => `/v1/payments/${encodeURIComponent(id)}/invoice.pdf`;

export type StartCheckoutInput = {
	purpose: PaymentPurpose;
	/** tip, report_contribution, support: integer cents 200–50 000 (< 200 → MIN_AMOUNT); none for fixed prices */
	amountCents?: number;
	refs?: CheckoutInput['refs'];
	/** Same-origin path to come back to, e.g. `/r/Hk3vT9qP/reunited`. */
	returnTo: string;
	locale: Locale;
	/** Mobile: Stripe returns through `zivali://payments/return`. */
	returnScheme?: boolean;
	/** Reuse it when the same submit is retried, so it opens the same checkout session; fresh by default. */
	idempotencyKey?: string;
};

/**
 * Creates the checkout session and returns its URL; then `redirectToCheckout` (web) or `openCheckout` (mobile).
 * Rejects with the `QueryError` (`error.data.code`, e.g. `MIN_AMOUNT`) on failure.
 */
export async function startCheckout(
	dispatch: ApiStore['dispatch'],
	{ purpose, amountCents, refs, returnTo, locale, returnScheme, idempotencyKey = uuid() }: StartCheckoutInput
): Promise<{ paymentId: Uuid; checkoutUrl: string }> {
	const body: CheckoutInput = {
		purpose,
		amount_cents: amountCents,
		refs,
		locale,
		return_to: returnTo,
		return_scheme: returnScheme,
	};
	const { payment_id, checkout_url } = await dispatch(
		paymentsApi.endpoints.checkout.initiate({ body, idempotencyKey })
	).unwrap();
	return { paymentId: payment_id, checkoutUrl: checkout_url };
}

/** Web: leaves the app for Stripe Checkout (or the mock `/dev/checkout`). */
export function redirectToCheckout(checkoutUrl: string): void {
	window.location.assign(checkoutUrl);
}

export const PAYMENTS_RETURN_URL = 'zivali://payments/return';

/**
 * Mobile: `openCheckout(WebBrowser.openAuthSessionAsync, checkoutUrl)` (expo-web-browser, passed in so this package
 * does not depend on Expo). Resolves when Stripe redirects back to the app or the user closes the browser.
 */
export function openCheckout<T>(
	openAuthSessionAsync: (url: string, redirectUrl: string) => Promise<T>,
	checkoutUrl: string
): Promise<T> {
	return openAuthSessionAsync(checkoutUrl, PAYMENTS_RETURN_URL);
}
