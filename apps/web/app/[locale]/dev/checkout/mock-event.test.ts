import { createHmac } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { mockEvent, signWebhook } from './mock-event';

const PAYMENT = '9d8c7b6a-0000-4000-8000-000000000001';

describe('mock checkout events (C13)', () => {
	it('builds the Stripe event shape the webhook parses, per outcome', () => {
		const success = JSON.parse(mockEvent('success', PAYMENT));
		expect(success).toMatchObject({
			type: 'checkout.session.completed',
			livemode: false,
			data: {
				object: {
					id: `mock_cs_${PAYMENT}`,
					payment_intent: `mock_pi_${PAYMENT}`,
					payment_status: 'paid',
					metadata: { payment_id: PAYMENT },
				},
			},
		});
		expect(success.id).toMatch(/^mock_evt_/);
		expect(JSON.parse(mockEvent('fail', PAYMENT))).toMatchObject({
			type: 'checkout.session.async_payment_failed',
			data: { object: { payment_intent: null, payment_status: 'unpaid' } },
		});
		expect(JSON.parse(mockEvent('cancel', PAYMENT)).type).toBe('checkout.session.expired');
		// A fresh event id each time, so a second click is a new event, not a duplicate.
		expect(JSON.parse(mockEvent('success', PAYMENT)).id).not.toBe(success.id);
	});

	it('signs like Stripe: t=<unix>,v1=<HMAC-SHA256 of "<t>.<body>">', () => {
		const body = mockEvent('success', PAYMENT);
		const v1 = createHmac('sha256', 'secret').update(`1700000000.${body}`).digest('hex');
		expect(signWebhook(body, 'secret', 1_700_000_000)).toBe(`t=1700000000,v1=${v1}`);
		expect(signWebhook(body, 'secret')).toMatch(/^t=\d{10},v1=[0-9a-f]{64}$/);
	});
});
