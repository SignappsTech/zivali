import { type Env, requireEnv } from '../../env.ts';
import { AppError } from '../../errors.ts';
import type { PaymentEvent, PaymentsAdapter } from './index.ts';

const utf8 = new TextEncoder();

/**
 * Checkout goes to the web dev page `APP_URL/dev/checkout?payment_id=…` (C13); its events are signed with
 * hex HMAC-SHA256(rawBody, MOCK_WEBHOOK_SECRET) and rejected when the signature does not match.
 */
export function mockPayments(get: Env): PaymentsAdapter {
  return {
    provider: 'mock',
    createCheckout: ({ paymentId }) =>
      Promise.resolve({
        sessionId: `mock_${paymentId}`,
        url: `${requireEnv('APP_URL', get)}/dev/checkout?payment_id=${encodeURIComponent(paymentId)}`,
      }),
    async parseWebhook(rawBody, signature) {
      const key = await crypto.subtle.importKey(
        'raw',
        utf8.encode(requireEnv('MOCK_WEBHOOK_SECRET', get)),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['verify'],
      );
      const valid = !!signature && /^[0-9a-f]{64}$/.test(signature) &&
        await crypto.subtle.verify(
          'HMAC',
          key,
          Uint8Array.from(signature.match(/../g)!, (h) => parseInt(h, 16)),
          utf8.encode(rawBody),
        );
      if (!valid) throw new AppError('VALIDATION', 'Invalid webhook signature');
      return JSON.parse(rawBody) as PaymentEvent;
    },
  };
}
