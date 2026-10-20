// C13 payments (Stripe test mode, mock provider). Rewards are display-only and never paid through the app.
import type { IsoDateTime, Page, Uuid } from './common.ts';
import type { Locale, PaymentPurpose, PaymentStatus } from './enums.ts';

/** POST /v1/payments/checkout (Idempotency-Key required). */
export type CheckoutInput = {
	purpose: PaymentPurpose;
	/** user-chosen purposes only (tip, report_contribution, support): integer cents ≤ 50 000; < 200 → MIN_AMOUNT */
	amount_cents?: number;
	/** `report_id` required for report_contribution */
	refs?: { report_id?: Uuid };
	locale: Locale;
	/** same-origin path */
	return_to: string;
	/** mobile: return through zivali://payments/return */
	return_scheme?: boolean;
};
export type CheckoutResponse = { payment_id: Uuid; checkout_url: string };
/** CH-701: card brand and last 4 digits, or the wallet; never the card number or expiry. */
export type PaymentMethod = {
	type: 'card' | 'link' | 'other';
	/** Stripe's brand, lowercase (visa, mastercard, amex, …). */
	brand: string | null;
	last4: string | null;
	wallet: 'apple_pay' | 'google_pay' | null;
};
export type Payment = {
	id: Uuid;
	purpose: PaymentPurpose;
	amount_cents: number;
	/** Refunded so far, partial refunds included (status refunded only once it reaches amount_cents). */
	refunded_cents: number;
	currency: 'EUR';
	status: PaymentStatus;
	/** null hides the "Način plačila" line (no charge event named it yet). */
	method: PaymentMethod | null;
	/** CH-702: mock provider or a Stripe test-mode payment, whatever APP_ENV says. */
	test: boolean;
	/** When the receipt email was sent; null before. */
	receipt_sent_at: IsoDateTime | null;
	/** When the last refund raised refunded_cents; null without refunds. */
	refunded_at: IsoDateTime | null;
	created_at: IsoDateTime;
	updated_at: IsoDateTime;
};
export type PaymentList = Page<Payment>;
