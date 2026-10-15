// Payments (C13). Provider: PAYMENTS_PROVIDER mock | stripe | off. Live keys are refused at boot outside
// APP_ENV=production; in production a live key boots, but every checkout waits for the live gate
// (PaymentsDomain.liveGateOpen: app_config payments.live_allowed, fiscal invoicing live or not required, TASK-92).
import type { Config } from '../../lib/config.ts';
import { offAdapter, pickProvider } from '../select.ts';
import { mockPayments } from './mock.ts';
import { stripePayments } from './stripe.ts';

export type CheckoutInput = {
	/** payments.id: carried as metadata, so every webhook event finds its payment. */
	paymentId: string;
	amountCents: number;
	currency: 'eur';
	/** Product name on the Checkout page. */
	description: string;
	locale: 'sl' | 'en';
	successUrl: string;
	cancelUrl: string;
};
/** A verified webhook event (Stripe event shape; the mock signs the same shape with MOCK_WEBHOOK_SECRET). */
export type PaymentEvent = {
	id: string;
	/** Stripe event type, e.g. checkout.session.completed or charge.refunded. */
	type: string;
	livemode: boolean;
	object: {
		/** Checkout Session id (cs_…) or Charge id (ch_…). */
		id: string;
		payment_intent?: string | null;
		/** Sessions: amount_total; charges: amount. */
		amount?: number | null;
		currency?: string | null;
		/** Sessions: payment_status (paid | unpaid | no_payment_required); charges: status. */
		status?: string | null;
		/** Charges: true once fully refunded. */
		refunded?: boolean | null;
		metadata: Record<string, string>;
	};
};
export type PaymentsAdapter = {
	provider: 'stripe' | 'mock';
	/** A live Stripe key (APP_ENV=production only): checkouts are refused while the live gate is closed. */
	live: boolean;
	createCheckout(input: CheckoutInput): Promise<{ id: string; url: string }>;
	/** Verifies the signature over the raw body and parses the event; throws AppError VALIDATION otherwise. */
	parseWebhook(rawBody: string, signature: string | undefined): PaymentEvent;
};

const LIVE_KEY = /^(sk|rk|pk)_live_/;

export function createPayments(cfg: Config): PaymentsAdapter {
	if (cfg.STRIPE_SECRET_KEY && LIVE_KEY.test(cfg.STRIPE_SECRET_KEY) && cfg.APP_ENV !== 'production') {
		throw new Error('STRIPE_SECRET_KEY: live keys are refused outside APP_ENV=production (test mode only, C13)');
	}
	const creds = !!(cfg.STRIPE_SECRET_KEY && cfg.STRIPE_WEBHOOK_SECRET);
	const p = pickProvider('PAYMENTS_PROVIDER', cfg.PAYMENTS_PROVIDER, creds, cfg.NODE_ENV === 'production');
	if (p === 'off') return offAdapter<PaymentsAdapter>('PAYMENTS_PROVIDER');
	return p === 'mock'
		? mockPayments(cfg.APP_URL, cfg.MOCK_WEBHOOK_SECRET ?? 'mock-webhook-secret')
		: stripePayments(cfg.STRIPE_SECRET_KEY!, cfg.STRIPE_WEBHOOK_SECRET!);
}
