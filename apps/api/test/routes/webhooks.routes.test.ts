// POST /v1/webhooks/stripe (C13) with mock-signed events (the Stripe signature scheme with MOCK_WEBHOOK_SECRET):
// signature on the raw body, livemode refused, the redacted idempotent ledger, status moves, payment.effects, and the
// mock provider end to end (checkout → success, fail or cancel → receipt email in the user's language and in-app).
import { randomUUID } from 'node:crypto';

import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { adapters } from '../../adapters/index.ts';
import { mockEvent, signWebhook } from '../../adapters/payments/mock.ts';
import { app } from '../../app.ts';
import { InvoicesDomain, PaymentsDomain } from '../../domains/payments/index.ts';
import { runJob } from '../../jobs/index.ts';
import { config } from '../../lib/config.ts';
import { systemCtx } from '../../lib/ctx.ts';
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
	await prisma.invoices.deleteMany({ where: { payment: { user_id: { in: ids } } } });
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

	it('records livemode events only with a live key: money a live checkout took is never dropped', async () => {
		const { auth } = await user();
		const payment_id = await pay(auth);
		const rawBody = JSON.stringify({ ...JSON.parse(mockEvent('success', payment_id)), livemode: true });
		eventIds.push(JSON.parse(rawBody).id);
		const live = systemCtx({ adapters: { ...adapters, payments: { ...adapters.payments, live: true } } });
		await PaymentsDomain.handleWebhook({ rawBody, signature: signWebhook(rawBody, SECRET) }, live);
		expect(await status(payment_id)).toBe('SUCCEEDED');
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
		// TASK-92.3: FURS retries wait minutes (app_config fiscal.retry: 2 min, doubling, at most 30 min), not seconds.
		expect(
			await prisma.$queryRaw`
				select retry_limit, retry_delay, retry_backoff, retry_delay_max from pgboss.job
				where name = 'payment.effects' and data->>'payment_id' = ${payment_id}`
		).toEqual([{ retry_limit: 5, retry_delay: 120, retry_backoff: true, retry_delay_max: 1800 }]);
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

describe('payment detail fields (CH-701, CH-703)', () => {
	// A Stripe test-mode charge.succeeded object (trimmed): expiry, fingerprint, checks, the wallet's device number and
	// billing details arrive with it and are never stored.
	const stripeCharge = (payment_id: string, card: Record<string, unknown> = {}) => ({
		id: `ch_${randomUUID()}`,
		object: 'charge',
		payment_intent: `pi_${payment_id}`,
		amount: 500,
		currency: 'eur',
		status: 'succeeded',
		metadata: { payment_id },
		billing_details: { email: 'ana@example.com', name: 'Ana Novak' },
		payment_method_details: {
			type: 'card',
			card: {
				brand: 'mastercard',
				last4: '4444',
				exp_month: 12,
				exp_year: 2034,
				fingerprint: 'Xt5EWLLDS7FJjR1c',
				funding: 'credit',
				checks: { cvc_check: 'pass' },
				wallet: { type: 'apple_pay', apple_pay: {}, dynamic_last4: '1234' },
				...card,
			},
		},
	});
	const detail = async (auth: string, payment_id: string) =>
		(await request(app).get(`/v1/payments/${payment_id}`).set('Authorization', auth)).body;

	it('charge.succeeded fills the method with brand, last 4 and wallet only; a failed attempt never replaces it', async () => {
		const owner = await user();
		const payment_id = await pay(owner.auth);
		const succeeded = event('charge.succeeded', stripeCharge(payment_id));
		expect((await post(succeeded)).status).toBe(200);
		const declined = {
			...stripeCharge(payment_id, { brand: 'visa', last4: '0002', wallet: null }),
			status: 'failed',
		};
		expect((await post(event('charge.failed', declined))).status).toBe(200);

		const mastercard = { type: 'card', brand: 'mastercard', last4: '4444', wallet: 'apple_pay' };
		const row = await prisma.payments.findUniqueOrThrow({ where: { id: payment_id } });
		expect(row).toMatchObject({ status: 'PENDING', method: mastercard });
		const body = await detail(owner.auth, payment_id);
		expect(body).toMatchObject({ method: mastercard, test: true });
		for (const stored of [row, body]) expect(JSON.stringify(stored)).not.toMatch(/2034|Xt5E|1234|cvc|Novak|ana@/);
		const ledger = await prisma.payment_events.findUniqueOrThrow({
			where: { provider_event_id: JSON.parse(succeeded).id },
		});
		expect(JSON.stringify(ledger.payload)).not.toMatch(/4444|mastercard|apple_pay/);
	});

	it('the mock names its test card on a paid session; receipt and refund times reach the DTO', async () => {
		const owner = await user();
		const payment_id = await pay(owner.auth, 1000);
		const failed = await pay(owner.auth);
		await post(mockEvent('success', payment_id));
		await post(mockEvent('fail', failed));
		await drain(runJob);
		expect(await detail(owner.auth, failed)).toMatchObject({ status: 'failed', method: null });
		expect(await detail(owner.auth, payment_id)).toMatchObject({
			status: 'succeeded',
			method: { type: 'card', brand: 'visa', last4: '4242', wallet: null },
			test: true,
			receipt_sent_at: expect.any(String),
			refunded_at: null,
		});

		const charge = {
			id: `ch_${randomUUID()}`,
			payment_intent: `mock_pi_${payment_id}`,
			amount: 1000,
			metadata: {},
		};
		await post(event('charge.refunded', { ...charge, amount_refunded: 300, refunded: false }));
		const partly = await detail(owner.auth, payment_id);
		expect(partly).toMatchObject({ status: 'succeeded', refunded_cents: 300, refunded_at: expect.any(String) });
		// A redelivered total is no new refund: the time stays.
		await post(event('charge.refunded', { ...charge, amount_refunded: 300, refunded: false }));
		expect((await detail(owner.auth, payment_id)).refunded_at).toBe(partly.refunded_at);
		await drain(runJob);
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

		// The fiscal invoice (TASK-92, mock provider) came first: its number, ZOI and EOR are on the receipt.
		for (const [who, payment_id, label, gross] of [
			[en, paid.en, 'Invoice no.', 700],
			[sl, paid.sl, 'Račun št.', 500],
		] as const) {
			const invoice = await prisma.invoices.findUniqueOrThrow({
				where: { payment_id_refund_total_cents: { payment_id, refund_total_cents: 0 } },
			});
			expect(invoice).toMatchObject({ status: 'VERIFIED', gross_cents: gross, vat_rate: 22 });
			const { text, html } = mail(who.email)[0]!;
			for (const line of [`${label} ${invoice.number}`, `ZOI: ${invoice.zoi}`, `EOR: ${invoice.eor}`]) {
				expect(text).toContain(line);
				expect(html).toContain(line);
			}
		}

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

describe('refunds and credit notes (TASK-92.4)', () => {
	const invoiceOf = (payment_id: string) =>
		prisma.invoices.findUniqueOrThrow({
			where: { payment_id_refund_total_cents: { payment_id, refund_total_cents: 0 } },
		});
	const notesOf = (reference_invoice_id: string) =>
		prisma.invoices.findMany({ where: { reference_invoice_id }, orderBy: { sequence: 'asc' } });
	const charge = (payment_id: string, amount: number) => ({
		id: `ch_${randomUUID()}`,
		payment_intent: `mock_pi_${payment_id}`,
		amount,
		metadata: {},
	});
	const refunded = (object: object, amount_refunded: number, full = false) =>
		event('charge.refunded', { ...object, amount_refunded, refunded: full });

	it('a partial then a full refund: one credit note each, idempotent across redelivery and job retries', async () => {
		const owner = await user();
		const payment_id = await pay(owner.auth, 1000);
		await post(mockEvent('success', payment_id));
		await drain(runJob);
		const invoice = await invoiceOf(payment_id);
		const ch = charge(payment_id, 1000);

		const partial = refunded(ch, 300);
		expect((await post(partial)).status).toBe(200);
		// Stripe redelivers the same event; a replay under a new event id carries the same refunded total.
		expect((await post(partial)).status).toBe(200);
		expect((await post(refunded(ch, 300))).status).toBe(200);
		await drain(runJob);
		// payment.effects runs again (a retry after its credit note was stored).
		const { handlers } = await import('../../jobs/index.ts');
		const { jobs } = await import('../../lib/jobs.ts');
		const jobCtx = { ...systemCtx(), prisma, send: jobs.send };
		await handlers['payment.effects']({ payment_id }, jobCtx);
		// An amount_refunded above the payment is logged and ignored.
		await post(refunded(ch, 1001));
		await drain(runJob);
		expect((await prisma.payments.findUniqueOrThrow({ where: { id: payment_id } })).refunded_cents).toBe(300);

		const [first, ...none] = await notesOf(invoice.id);
		expect(none).toHaveLength(0);
		expect(first).toMatchObject({
			payment_id,
			refund_total_cents: 300,
			premise_id: invoice.premise_id,
			device_id: invoice.device_id,
			gross_cents: -300,
			net_cents: -246,
			vat_cents: -54,
			status: 'VERIFIED',
			pdf_key: `invoices/${first!.id}.pdf`,
		});
		expect(first!.sequence).toBeGreaterThan(invoice.sequence);
		let res = await request(app).get(`/v1/payments/${payment_id}`).set('Authorization', owner.auth);
		expect(res.body).toMatchObject({ status: 'succeeded', amount_cents: 1000, refunded_cents: 300 });

		// The rest is refunded; a late event with the earlier total changes nothing.
		await post(refunded(ch, 1000, true));
		await post(refunded(ch, 300));
		await drain(runJob);
		const notes = await notesOf(invoice.id);
		expect(notes.map((n) => [n.refund_total_cents, n.gross_cents, n.status])).toEqual([
			[300, -300, 'VERIFIED'],
			[1000, -700, 'VERIFIED'],
		]);
		expect(notes[1]!.number).toBe(`${invoice.premise_id}-${invoice.device_id}-${notes[1]!.sequence}`);
		const pdf = await adapters.storage.get({ bucket: 'private', key: notes[1]!.pdf_key! });
		expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');

		// My payments shows the refund.
		res = await request(app).get(`/v1/payments/${payment_id}`).set('Authorization', owner.auth);
		expect(res.body).toMatchObject({ status: 'refunded', refunded_cents: 1000 });
		res = await request(app).get('/v1/me/payments').set('Authorization', owner.auth);
		expect(res.body.items.find((p: { id: string }) => p.id === payment_id)).toMatchObject({
			status: 'refunded',
			amount_cents: 1000,
			refunded_cents: 1000,
		});
		// One receipt, sent for the payment before the refunds.
		expect(adapters.email.sent!.filter((m) => m.to === owner.email)).toHaveLength(1);
	});

	it('a refund before payment.effects ran: the invoice first, then its credit note; no receipt', async () => {
		const owner = await user();
		const payment_id = await pay(owner.auth, 500);
		await post(mockEvent('success', payment_id));
		await post(refunded(charge(payment_id, 500), 500, true));
		await drain(runJob);
		const invoice = await invoiceOf(payment_id);
		expect(invoice).toMatchObject({ gross_cents: 500, status: 'VERIFIED' });
		expect(await notesOf(invoice.id)).toMatchObject([
			{ refund_total_cents: 500, gross_cents: -500, net_cents: -410, vat_cents: -90, status: 'VERIFIED' },
		]);
		expect((await prisma.payments.findUniqueOrThrow({ where: { id: payment_id } })).status).toBe('REFUNDED');
		expect(adapters.email.sent!.filter((m) => m.to === owner.email)).toHaveLength(0);
	});

	it('a partial refund while the payment is still pending, then its completion: one credit note', async () => {
		const owner = await user();
		const payment_id = await pay(owner.auth, 1000);
		// The charge names the payment (metadata): Stripe may send charge.refunded before the session completes.
		await post(refunded({ ...charge(payment_id, 1000), metadata: { payment_id } }, 400));
		await drain(runJob);
		expect(await prisma.payments.findUniqueOrThrow({ where: { id: payment_id } })).toMatchObject({
			status: 'PENDING',
			refunded_cents: 400,
		});
		expect(await prisma.invoices.count({ where: { payment_id } })).toBe(0);
		await post(mockEvent('success', payment_id));
		await drain(runJob);
		const invoice = await invoiceOf(payment_id);
		expect(invoice).toMatchObject({ gross_cents: 1000, status: 'VERIFIED' });
		expect(await notesOf(invoice.id)).toMatchObject([
			{ refund_total_cents: 400, gross_cents: -400, net_cents: -328, vat_cents: -72, status: 'VERIFIED' },
		]);
		expect(adapters.email.sent!.filter((m) => m.to === owner.email)).toHaveLength(1);
	});

	it('a refund whose payment.effects failed before the credit note is healed by fiscal.resubmit', async () => {
		const owner = await user();
		const payment_id = await pay(owner.auth, 800);
		await post(mockEvent('success', payment_id));
		await drain(runJob);
		const invoice = await invoiceOf(payment_id);
		await post(refunded(charge(payment_id, 800), 200));
		// The worker crashes on that refund's job on every attempt: retries run out, the refund has no credit note.
		await drain((queue, job) =>
			queue === 'payment.effects' ? Promise.reject(new Error('worker crashed')) : runJob(queue, job)
		);
		expect(await notesOf(invoice.id)).toEqual([]);
		const failed = () =>
			prisma.$queryRaw<{ state: string }[]>`
				select state from pgboss.job where name = 'payment.effects' and data->>'payment_id' = ${payment_id}
				order by created_on`;
		expect((await failed()).map((j) => j.state)).toEqual(['completed', 'failed']);
		// A fresh refund may still have its job running: fiscal.resubmit leaves it alone.
		await InvoicesDomain.resubmitInvoices(undefined, systemCtx());
		expect(await failed()).toHaveLength(2);
		// Past the retries (3 h): fiscal.resubmit sends payment.effects again, which issues the note from stored state.
		await prisma.$executeRaw`update app.payments set updated_at = now() - interval '4 hours' where id = ${payment_id}::uuid`;
		await InvoicesDomain.resubmitInvoices(undefined, systemCtx());
		await drain(runJob);
		expect(await notesOf(invoice.id)).toMatchObject([
			{ refund_total_cents: 200, gross_cents: -200, net_cents: -164, vat_cents: -36, status: 'VERIFIED' },
		]);
		// Credited in full: the next run sends nothing.
		await prisma.$executeRaw`update app.payments set updated_at = now() - interval '4 hours' where id = ${payment_id}::uuid`;
		const before = (await failed()).length;
		await InvoicesDomain.resubmitInvoices(undefined, systemCtx());
		expect(await failed()).toHaveLength(before);
	});
});
