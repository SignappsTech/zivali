// POST /v1/webhooks/stripe (C13) with mock-signed events (the Stripe signature scheme with MOCK_WEBHOOK_SECRET):
// signature on the raw body, livemode refused, the redacted idempotent ledger, status moves, payment.effects, and the
// mock provider end to end (checkout → success, fail or cancel → receipt email in the user's language and in-app).
import { randomUUID } from 'node:crypto';

import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { adapters } from '../../adapters/index.ts';
import { mockEvent, signWebhook } from '../../adapters/payments/mock.ts';
import { app } from '../../app.ts';
import { runJob } from '../../jobs/index.ts';
import { config } from '../../lib/config.ts';
import { drain, startJobs } from '../../lib/jobs.ts';
import { prisma } from '../../prisma/prisma.ts';
import { createAuthUser, deleteAuthUsers, signTestToken } from '../helpers/token.ts';

const HOOK = '/v1/webhooks/stripe';
const SECRET = config.MOCK_WEBHOOK_SECRET ?? 'mock-webhook-secret';
const ids: string[] = [];
const eventIds: string[] = [];

beforeAll(() => startJobs(), 30_000);

afterAll(async () => {
	await prisma.payment_events.deleteMany({ where: { provider_event_id: { in: eventIds } } });
	await prisma.notifications.deleteMany({ where: { user_id: { in: ids } } });
	await prisma.payments.deleteMany({ where: { user_id: { in: ids } } });
	await deleteAuthUsers(ids);
});

async function user(locale: 'sl' | 'en' = 'sl') {
	const id = await createAuthUser();
	ids.push(id);
	const auth = `Bearer ${await signTestToken({ sub: id, locale })}`;
	return { id, auth, email: `${id}@test.invalid` };
}

async function pay(auth: string, amount_cents = 500, locale: 'sl' | 'en' = 'sl') {
	const res = await request(app)
		.post('/v1/payments/checkout')
		.set('Authorization', auth)
		.set('Idempotency-Key', randomUUID())
		.send({ purpose: 'tip', amount_cents, locale, return_to: '/r/Hk3vT9qP/reunited' });
	expect(res.status).toBe(200);
	return res.body.payment_id as string;
}

/** Posts a body as Stripe does: raw JSON with the Stripe-Signature header. */
function post(raw: string, signature = signWebhook(raw, SECRET)) {
	const id = /"id":"(evt_[^"]+|mock_evt_[^"]+)"/.exec(raw)?.[1];
	if (id) eventIds.push(id);
	return request(app)
		.post(HOOK)
		.set('Content-Type', 'application/json; charset=utf-8')
		.set('Stripe-Signature', signature)
		.send(raw);
}

/** A Stripe-shaped event with the given object (id defaults to a mock event id). */
function event(type: string, object: Record<string, unknown>, extra: Record<string, unknown> = {}) {
	return JSON.stringify({ id: `evt_${randomUUID()}`, type, livemode: false, data: { object }, ...extra });
}

const status = async (id: string) => (await prisma.payments.findUniqueOrThrow({ where: { id } })).status;
const queued = async (payment_id: string) =>
	(
		await prisma.$queryRaw<{ n: bigint }[]>`
			select count(*) n from pgboss.job where name = 'payment.effects' and data->>'payment_id' = ${payment_id}`
	)[0]!.n;

describe('signature and live mode', () => {
	it('rejects an unsigned, wrongly signed or tampered body (400) and stores nothing', async () => {
		const { auth } = await user();
		const payment_id = await pay(auth);
		const raw = mockEvent('success', payment_id);
		for (const res of [
			await post(raw, ''),
			await post(raw, signWebhook(raw, 'not-the-secret')),
			await post(raw.replace('"paid"', '"unpaid"'), signWebhook(raw, SECRET)),
			await post('{"id":"evt_x"', signWebhook('{"id":"evt_x"', SECRET)),
		]) {
			expect(res.status).toBe(400);
			expect(res.body.error.code).toBe('VALIDATION');
		}
		expect(await prisma.payment_events.count({ where: { provider_event_id: JSON.parse(raw).id } })).toBe(0);
		expect(await status(payment_id)).toBe('PENDING');
	});

	it('refuses livemode events with 422 LIVE_MODE_FORBIDDEN and stores nothing', async () => {
		const { auth } = await user();
		const payment_id = await pay(auth);
		const raw = JSON.stringify({ ...JSON.parse(mockEvent('success', payment_id)), livemode: true });
		const res = await post(raw);
		expect(res.status).toBe(422);
		expect(res.body.error.code).toBe('LIVE_MODE_FORBIDDEN');
		expect(await prisma.payment_events.count({ where: { provider_event_id: JSON.parse(raw).id } })).toBe(0);
		expect(await status(payment_id)).toBe('PENDING');
	});
});

describe('ledger and status', () => {
	it('stores a redacted event once: a duplicate delivery is a 200 no-op', async () => {
		const { auth } = await user();
		const payment_id = await pay(auth);
		const raw = event('checkout.session.completed', {
			id: `mock_cs_${payment_id}`,
			payment_intent: `pi_${payment_id}`,
			amount_total: 500,
			currency: 'eur',
			payment_status: 'paid',
			status: 'complete',
			metadata: { payment_id },
			customer_details: { email: 'ana@example.com', name: 'Ana Novak', address: { city: 'Ljubljana' } },
			payment_method_details: { card: { brand: 'visa', last4: '4242' } },
		});
		const event_id = JSON.parse(raw).id;
		expect((await post(raw)).body).toEqual({ received: true });
		expect((await post(raw)).status).toBe(200);
		const rows = await prisma.payment_events.findMany({ where: { provider_event_id: event_id } });
		expect(rows).toHaveLength(1);
		expect(rows[0]).toMatchObject({ provider: 'mock', type: 'checkout.session.completed' });
		expect(rows[0]!.payload).toEqual({
			id: event_id,
			type: 'checkout.session.completed',
			object_id: `mock_cs_${payment_id}`,
			payment_intent: `pi_${payment_id}`,
			amount: 500,
			currency: 'eur',
			status: 'paid',
			livemode: false,
		});
		expect(JSON.stringify(rows[0]!.payload)).not.toMatch(/ana@example|Novak|Ljubljana|4242|visa/);
		expect(await prisma.payments.findUniqueOrThrow({ where: { id: payment_id } })).toMatchObject({
			status: 'SUCCEEDED',
			provider_payment_id: `pi_${payment_id}`,
		});
		expect(await queued(payment_id)).toBe(1n);
	});

	it('moves pending payments to failed or canceled; a late event never moves a settled one', async () => {
		const { auth } = await user();
		const failed = await pay(auth);
		const canceled = await pay(auth);
		expect((await post(mockEvent('fail', failed))).status).toBe(200);
		expect((await post(mockEvent('cancel', canceled))).status).toBe(200);
		expect(await status(failed)).toBe('FAILED');
		expect(await status(canceled)).toBe('CANCELED');
		await post(mockEvent('success', canceled));
		await post(mockEvent('success', failed));
		expect([await status(failed), await status(canceled)]).toEqual(['FAILED', 'CANCELED']);
		expect(await queued(failed)).toBe(0n);
		expect(await queued(canceled)).toBe(0n);
	});

	it('keeps a delayed-method completion pending until async_payment_succeeded', async () => {
		const { auth } = await user();
		const payment_id = await pay(auth);
		const object = { id: `mock_cs_${payment_id}`, payment_status: 'unpaid', metadata: { payment_id } };
		await post(event('checkout.session.completed', object));
		expect(await status(payment_id)).toBe('PENDING');
		await post(event('checkout.session.async_payment_succeeded', { ...object, payment_status: 'paid' }));
		expect(await status(payment_id)).toBe('SUCCEEDED');
	});

	it('marks a fully refunded charge refunded (found by its payment intent); a partial refund changes nothing', async () => {
		const { auth } = await user();
		const payment_id = await pay(auth);
		await post(mockEvent('success', payment_id));
		const charge = { id: `ch_${randomUUID()}`, payment_intent: `mock_pi_${payment_id}`, amount: 500, metadata: {} };
		await post(event('charge.refunded', { ...charge, refunded: false }));
		expect(await status(payment_id)).toBe('SUCCEEDED');
		await post(event('charge.refunded', { ...charge, refunded: true }));
		expect(await status(payment_id)).toBe('REFUNDED');
	});

	it('records events for unknown payments and unhandled types without failing (200)', async () => {
		const unknown = event('checkout.session.completed', {
			id: 'cs_test_unknown',
			payment_status: 'paid',
			metadata: { payment_id: 'not-a-uuid' },
		});
		const other = event('payment_intent.created', { id: 'pi_other' });
		expect((await post(unknown)).status).toBe(200);
		expect((await post(other)).status).toBe(200);
		expect(
			await prisma.payment_events.count({
				where: { provider_event_id: { in: [JSON.parse(unknown).id, JSON.parse(other).id] } },
			})
		).toBe(2);
	});
});

describe('mock provider end to end', () => {
	it('success: payment.effects sends the receipt email in the user’s language and an in-app notification, once', async () => {
		const en = await user('en');
		const sl = await user('sl');
		const paid = { en: await pay(en.auth, 700, 'en'), sl: await pay(sl.auth, 500) };
		for (const payment_id of Object.values(paid)) {
			expect((await post(mockEvent('success', payment_id))).status).toBe(200);
			// A second delivery of the same outcome (new event id) changes nothing.
			expect((await post(mockEvent('success', payment_id))).status).toBe(200);
		}
		await drain(runJob);

		const sent = adapters.email.sent!;
		const mail = (to: string) => sent.filter((m) => m.to === to);
		expect(mail(en.email)).toHaveLength(1);
		expect(mail(en.email)[0]!.subject).toBe('Test · Payment receipt: €7.00');
		expect(mail(en.email)[0]!.text).toContain(`Reference: ${paid.en.slice(0, 8).toUpperCase()}`);
		expect(mail(sl.email)).toHaveLength(1);
		expect(mail(sl.email)[0]!.subject).toBe('Test · Potrdilo o plačilu: 5,00 €');

		for (const [who, payment_id] of [
			[en, paid.en],
			[sl, paid.sl],
		] as const) {
			const inbox = await prisma.notifications.findMany({ where: { user_id: who.id } });
			expect(inbox).toHaveLength(1);
			expect(inbox[0]).toMatchObject({ type: 'payment_receipt' });
			expect(inbox[0]!.payload).toMatchObject({ payment_id, purpose: 'tip', is_test: true });
			expect(
				(await prisma.payments.findUniqueOrThrow({ where: { id: payment_id } })).receipt_sent_at
			).not.toBeNull();
		}

		// The job runs again (retry): no second receipt.
		const { handlers } = await import('../../jobs/index.ts');
		const { systemCtx } = await import('../../lib/ctx.ts');
		const { jobs } = await import('../../lib/jobs.ts');
		await handlers['payment.effects']({ payment_id: paid.en }, { ...systemCtx(), prisma, send: jobs.send });
		await drain(runJob);
		expect(mail(en.email)).toHaveLength(1);

		const res = await request(app).get(`/v1/payments/${paid.en}`).set('Authorization', en.auth);
		expect(res.body).toMatchObject({ status: 'succeeded', amount_cents: 700 });
	});

	it('fail and cancel: the return page reads failed and canceled; no receipt', async () => {
		const { id, auth, email } = await user();
		const failed = await pay(auth);
		const canceled = await pay(auth);
		await post(mockEvent('fail', failed));
		await post(mockEvent('cancel', canceled));
		await drain(runJob);
		for (const [payment_id, expected] of [
			[failed, 'failed'],
			[canceled, 'canceled'],
		] as const) {
			const res = await request(app).get(`/v1/payments/${payment_id}`).set('Authorization', auth);
			expect(res.body.status).toBe(expected);
		}
		expect(adapters.email.sent!.filter((m) => m.to === email)).toHaveLength(0);
		expect(await prisma.notifications.count({ where: { user_id: id } })).toBe(0);
	});
});
