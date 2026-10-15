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
export type Payment = {
	id: Uuid;
	purpose: PaymentPurpose;
	amount_cents: number;
	currency: 'EUR';
	status: PaymentStatus;
	created_at: IsoDateTime;
	updated_at: IsoDateTime;
};
export type PaymentList = Page<Payment>;
