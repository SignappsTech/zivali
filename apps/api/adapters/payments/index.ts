// Payments (C13). Provider: PAYMENTS_PROVIDER mock | stripe. Live keys are refused everywhere (test mode only).
import type { Config } from '../../lib/config.ts';
import { pickProvider } from '../select.ts';
import { mockPayments } from './mock.ts';
import { stripePayments } from './stripe.ts';

export type CheckoutInput = {
	amountCents: number;
	currency: 'eur';
	description: string;
	successUrl: string;
	cancelUrl: string;
	metadata?: Record<string, string>;
	idempotencyKey: string;
};
export type PaymentEvent = {
	id: string;
	type: 'checkout.completed' | 'checkout.expired' | 'payment.failed' | 'other';
	checkoutId: string;
	metadata: Record<string, string>;
};
export type PaymentsAdapter = {
	createCheckout(input: CheckoutInput): Promise<{ id: string; url: string }>;
	/** Verifies the signature over the raw body and returns the event; throws on a bad signature. */
	parseWebhook(rawBody: string, signature: string | undefined): PaymentEvent;
};

const LIVE_KEY = /^(sk|rk|pk)_live_/;

export function createPayments(cfg: Config): PaymentsAdapter {
	if (cfg.STRIPE_SECRET_KEY && LIVE_KEY.test(cfg.STRIPE_SECRET_KEY)) {
		throw new Error('STRIPE_SECRET_KEY: live keys are refused (test mode only, C13)');
	}
	const creds = !!(cfg.STRIPE_SECRET_KEY && cfg.STRIPE_WEBHOOK_SECRET);
	const p = pickProvider('PAYMENTS_PROVIDER', cfg.PAYMENTS_PROVIDER, creds, cfg.NODE_ENV === 'production');
	return p === 'mock'
		? mockPayments(cfg.MOCK_WEBHOOK_SECRET ?? 'mock-webhook-secret')
		: stripePayments(cfg.STRIPE_SECRET_KEY!, cfg.STRIPE_WEBHOOK_SECRET!);
}
