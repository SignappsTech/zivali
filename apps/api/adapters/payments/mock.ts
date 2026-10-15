import { createHmac, timingSafeEqual } from 'node:crypto';

import type { PaymentEvent, PaymentsAdapter } from './index.ts';

// Webhook body is a JSON PaymentEvent, signed as hex HMAC-SHA256 with the mock secret (signMockWebhook).
export function signMockWebhook(rawBody: string, secret: string): string {
	return createHmac('sha256', secret).update(rawBody).digest('hex');
}

export function mockPayments(secret: string): PaymentsAdapter {
	return {
		async createCheckout({ idempotencyKey, successUrl }) {
			const id = `mock_cs_${idempotencyKey}`;
			return { id, url: `${successUrl}${successUrl.includes('?') ? '&' : '?'}mock_checkout=${id}` };
		},
		parseWebhook(rawBody, signature) {
			const expected = Buffer.from(signMockWebhook(rawBody, secret));
			const given = Buffer.from(signature ?? '');
			if (expected.length !== given.length || !timingSafeEqual(expected, given)) {
				throw new Error('invalid webhook signature');
			}
			return JSON.parse(rawBody) as PaymentEvent;
		},
	};
}
