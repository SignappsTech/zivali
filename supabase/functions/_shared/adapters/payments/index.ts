import { env, type Env } from '../../env.ts';
import { notImplemented, pickProvider } from '../select.ts';
import { mockPayments } from './mock.ts';

export interface CheckoutInput {
  paymentId: string;
  purpose: string;
  amountCents: number;
  currency: 'EUR';
  userId: string;
  refs: Record<string, string>;
  successUrl: string;
  cancelUrl: string;
}

export interface PaymentEvent {
  id: string;
  type: string;
  livemode: boolean;
  data: Record<string, unknown>;
}

export interface PaymentsAdapter {
  readonly provider: 'stripe' | 'mock';
  createCheckout(input: CheckoutInput): Promise<{ sessionId: string; url: string }>;
  /** Verifies the signature and returns the event; throws AppError VALIDATION when it does not match. */
  parseWebhook(rawBody: string, signature: string | null): Promise<PaymentEvent>;
}

/** PAYMENTS_PROVIDER = mock | stripe (STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET). ADR-011, C13. */
export function paymentsAdapter(get: Env = env): PaymentsAdapter {
  const provider = pickProvider('PAYMENTS_PROVIDER', { stripe: ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'] }, get);
  return provider === 'mock' ? mockPayments(get) : notImplemented('PAYMENTS_PROVIDER', provider);
}
