// C13 payments: POST /v1/payments/checkout, payment reads. Rewards are display-only (C4) and never paid here.
import { USER_AMOUNT_PURPOSES } from '@zivali/types';

import { IsoDateTime, page, Uuid } from './common.schema.ts';
import { Locale, PaymentPurpose, PaymentStatus } from './enums.ts';
import { z } from './zod.ts';

const userAmount = (purpose: string) => (USER_AMOUNT_PURPOSES as readonly string[]).includes(purpose);

/** Amounts below 200 cents pass here and fail in the domain with MIN_AMOUNT (C13). */
export const CheckoutInput = z
	.object({
		purpose: PaymentPurpose,
		amount_cents: z.number().int().positive().max(50_000).optional(),
		refs: z.object({ report_id: Uuid.optional() }).optional(),
		locale: Locale,
		return_to: z
			.string()
			.max(512)
			.regex(/^\/(?![/\\])[^\s\\]*$/, 'Same-origin path expected'),
		return_scheme: z.boolean().optional(),
	})
	.superRefine((c, ctx) => {
		if (userAmount(c.purpose) && c.amount_cents === undefined)
			ctx.addIssue({ code: 'custom', path: ['amount_cents'], message: 'Required' });
		if (!userAmount(c.purpose) && c.amount_cents !== undefined)
			ctx.addIssue({ code: 'custom', path: ['amount_cents'], message: 'Price is set by the server' });
		if (c.purpose === 'report_contribution' && !c.refs?.report_id)
			ctx.addIssue({ code: 'custom', path: ['refs', 'report_id'], message: 'Required' });
	})
	.openapi('CheckoutInput', {
		example: {
			purpose: 'tip',
			amount_cents: 500,
			refs: { report_id: '7c1e2a4b-5d6f-4a8b-9c0d-1e2f3a4b5c6d' },
			locale: 'sl',
			return_to: '/r/Hk3vT9qP/reunited',
		},
	});
export const CheckoutResponse = z.object({ payment_id: Uuid, checkout_url: z.url() }).openapi('CheckoutResponse');
/** CH-701: card brand and last 4 digits, or the wallet; never the card number or expiry. */
export const PaymentMethod = z
	.object({
		type: z.enum(['card', 'link', 'other']),
		/** Stripe's brand, lowercase (visa, mastercard, amex, …). */
		brand: z.string().max(32).nullable(),
		last4: z
			.string()
			.regex(/^\d{4}$/)
			.nullable(),
		wallet: z.enum(['apple_pay', 'google_pay']).nullable(),
	})
	.openapi('PaymentMethod');
export const Payment = z
	.object({
		id: Uuid,
		purpose: PaymentPurpose,
		amount_cents: z.number().int(),
		/** Refunded so far, partial refunds included (status refunded only once it reaches amount_cents). */
		refunded_cents: z.number().int().nonnegative(),
		currency: z.literal('EUR'),
		status: PaymentStatus,
		/** null hides the "Način plačila" line (no charge event named it yet). */
		method: PaymentMethod.nullable(),
		/** CH-702: mock provider or a Stripe test-mode payment, whatever APP_ENV says. */
		test: z.boolean(),
		/** When the receipt email was sent; null before. */
		receipt_sent_at: IsoDateTime.nullable(),
		/** When the last refund raised refunded_cents; null without refunds. */
		refunded_at: IsoDateTime.nullable(),
		created_at: IsoDateTime,
		updated_at: IsoDateTime,
	})
	.openapi('Payment');
export const PaymentList = page(Payment).openapi('PaymentList');
