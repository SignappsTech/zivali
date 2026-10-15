// POST /v1/payments/checkout, GET /v1/payments/:id and GET /v1/me/payments (C13) with the mock provider over real
// auth.users rows: guards for every actor type, validation, MIN_AMOUNT, fixed prices from app_config, report
// ownership, return URLs (web per locale, app scheme), idempotent retries, owner-only reads.
import { randomUUID } from 'node:crypto';

import request from 'supertest';
import { afterAll, afterEach, describe, expect, it, vi } from 'vitest';

import { adapters } from '../../adapters/index.ts';
import { ReportsDomain } from '../../domains/reports/index.ts';
import { app } from '../../app.ts';
import { config } from '../../lib/config.ts';
import { userCtx } from '../../lib/ctx.ts';
import { prisma } from '../../prisma/prisma.ts';
import { createAuthUser, deleteAuthUsers, signTestToken, type TestTokenClaims } from '../helpers/token.ts';

const CHECKOUT = '/v1/payments/checkout';
const ids: string[] = [];
const reportIds: string[] = [];

async function user(options?: Parameters<typeof createAuthUser>[0], claims: TestTokenClaims = {}) {
	const id = await createAuthUser(options);
	ids.push(id);
	const token = await signTestToken({ sub: id, is_anonymous: options?.is_anonymous, ...claims });
	return { id, auth: `Bearer ${token}` };
}

afterEach(() => {
	vi.restoreAllMocks();
});

afterAll(async () => {
	await prisma.payments.deleteMany({ where: { user_id: { in: ids } } });
	await prisma.reports.deleteMany({ where: { id: { in: reportIds } } });
	await deleteAuthUsers(ids);
});

const tip = { purpose: 'tip', amount_cents: 500, locale: 'sl', return_to: '/r/Hk3vT9qP/reunited' };
const checkout = (auth: string, body: object = tip, key: string = randomUUID()) =>
	request(app).post(CHECKOUT).set('Authorization', auth).set('Idempotency-Key', key).send(body);

/** A lost report managed by the user (report_managers owner row). */
async function ownReport(user_id: string) {
	await prisma.profiles.upsert({ where: { id: user_id }, create: { id: user_id }, update: {} });
	const { id } = await ReportsDomain.insertReport(
		{ type: 'lost', species: 'dog', location: { lat: 46.0569, lng: 14.5058 }, event_at: new Date() },
		userCtx({ user_id, role: 'USER', is_anonymous: false, aal: 'aal1', email_verified: true, locale: 'sl' })
	);
	reportIds.push(id);
	return id;
}

describe('POST /v1/payments/checkout guards', () => {
	it('answers 401 without a token and for anonymous finders, and needs an Idempotency-Key', async () => {
		const anonymous = await user({ is_anonymous: true });
		for (const auth of ['', anonymous.auth]) {
			const res = await checkout(auth);
			expect(res.status).toBe(401);
			expect(res.body.error.code).toBe('UNAUTHENTICATED');
		}
		const { id, auth } = await user();
		const res = await request(app).post(CHECKOUT).set('Authorization', auth).send(tip);
		expect(res.status).toBe(400);
		expect(res.body.error.issues).toEqual([expect.objectContaining({ path: 'headers.idempotency-key' })]);
		expect(await prisma.payments.count({ where: { user_id: { in: [id, anonymous.id] } } })).toBe(0);
	});

	it('lets every real account pay, unverified email and staff included', async () => {
		for (const [role, aal, email_verified] of [
			['USER', 'aal1', false],
			['MODERATOR', 'aal1', true],
			['MODERATOR', 'aal2', true],
			['ADMIN', 'aal2', true],
		] as const) {
			const { id, auth } = await user({ email_verified }, { aal });
			await prisma.profiles.upsert({ where: { id }, create: { id, role }, update: { role } });
			const res = await checkout(auth);
			expect(res.status, `${role} ${aal}`).toBe(200);
		}
	});
});

describe('POST /v1/payments/checkout amounts', () => {
	it('inserts a pending tip and returns the mock dev-page checkout URL', async () => {
		const { id, auth } = await user();
		const res = await checkout(auth);
		expect(res.status).toBe(200);
		const { payment_id, checkout_url } = res.body;
		expect(checkout_url).toBe(`${new URL('/dev/checkout', config.APP_URL)}?payment_id=${payment_id}`);
		expect(await prisma.payments.findUniqueOrThrow({ where: { id: payment_id } })).toMatchObject({
			user_id: id,
			purpose: 'TIP',
			amount_cents: 500,
			currency: 'EUR',
			status: 'PENDING',
			provider: 'mock',
			provider_session_id: `mock_cs_${payment_id}`,
			refs: null,
			receipt_sent_at: null,
		});
	});

	it('answers 422 MIN_AMOUNT below EUR 2.00 for every user-chosen purpose, 200 cents is enough', async () => {
		const { id, auth } = await user();
		for (const purpose of ['tip', 'support'] as const) {
			const res = await checkout(auth, { ...tip, purpose, amount_cents: 199 });
			expect(res.status).toBe(422);
			expect(res.body.error).toEqual({
				code: 'MIN_AMOUNT',
				message: 'Minimum card amount is EUR 2.00',
				details: { min_cents: 200 },
			});
		}
		const report_id = await ownReport(id);
		const low = await checkout(auth, {
			...tip,
			purpose: 'report_contribution',
			amount_cents: 150,
			refs: { report_id },
		});
		expect(low.body.error.code).toBe('MIN_AMOUNT');
		expect(await prisma.payments.count({ where: { user_id: id } })).toBe(0);
		expect((await checkout(auth, { ...tip, amount_cents: 200 })).status).toBe(200);
	});

	it('rejects bad amounts, a client price for fixed purposes and foreign return paths (400 VALIDATION)', async () => {
		const { id, auth } = await user();
		for (const body of [
			{ ...tip, amount_cents: 2.5 },
			{ ...tip, amount_cents: '500' },
			{ ...tip, amount_cents: 0 },
			{ ...tip, amount_cents: 50_001 },
			{ ...tip, amount_cents: undefined },
			{ ...tip, purpose: 'boost' },
			{ ...tip, purpose: 'subscription' },
			{ ...tip, purpose: 'donation' },
			{ ...tip, purpose: 'report_contribution' },
			{ ...tip, currency: 'USD', locale: 'de' },
			{ ...tip, return_to: 'https://evil.example/' },
			{ ...tip, return_to: '//evil.example/' },
			{ ...tip, return_to: '/\\evil.example' },
		]) {
			const res = await checkout(auth, body);
			expect(res.status, JSON.stringify(body)).toBe(400);
			expect(res.body.error.code).toBe('VALIDATION');
		}
		expect(await prisma.payments.count({ where: { user_id: id } })).toBe(0);
		expect((await checkout(auth, { ...tip, amount_cents: 50_000 })).status).toBe(200);
	});

	it('prices boost from app_config payments.prices, never from the client; subscriptions wait for M4', async () => {
		const { id, auth } = await user();
		const prices = await prisma.app_config.findUniqueOrThrow({ where: { key: 'payments.prices' } });
		const res = await checkout(auth, { purpose: 'boost', locale: 'en', return_to: '/my-reports' });
		expect(res.status).toBe(200);
		const row = await prisma.payments.findUniqueOrThrow({ where: { id: res.body.payment_id } });
		expect(row).toMatchObject({
			purpose: 'BOOST',
			amount_cents: (prices.value as { boost_cents: number }).boost_cents,
		});
		expect(row.amount_cents).toBe(499);
		const sub = await checkout(auth, { purpose: 'subscription', locale: 'en', return_to: '/account' });
		expect(sub.status).toBe(503);
		expect(sub.body.error.code).toBe('SERVICE_UNAVAILABLE');
		expect(await prisma.payments.count({ where: { user_id: id } })).toBe(1);
	});

	it('keeps payments.live_allowed false and private (live gate, C13)', async () => {
		expect(await prisma.app_config.findUniqueOrThrow({ where: { key: 'payments.live_allowed' } })).toMatchObject({
			value: false,
			is_public: false,
		});
	});
});

describe('POST /v1/payments/checkout refs and return URLs', () => {
	it('report_contribution needs a report the caller manages', async () => {
		const owner = await user();
		const other = await user();
		const report_id = await ownReport(owner.id);
		const body = { ...tip, purpose: 'report_contribution', refs: { report_id } };
		const foreign = await checkout(other.auth, body);
		expect(foreign.status).toBe(403);
		expect(foreign.body.error.code).toBe('FORBIDDEN');
		const missing = await checkout(owner.auth, { ...body, refs: { report_id: randomUUID() } });
		expect(missing.status).toBe(403);
		const res = await checkout(owner.auth, body);
		expect(res.status).toBe(200);
		expect(await prisma.payments.findUniqueOrThrow({ where: { id: res.body.payment_id } })).toMatchObject({
			purpose: 'REPORT_CONTRIBUTION',
			refs: { report_id },
		});
		expect(await prisma.payments.count({ where: { user_id: other.id } })).toBe(0);
	});

	it('returns to the localised web page, or through zivali://payments/return for the app', async () => {
		const { auth } = await user();
		const spy = vi.spyOn(adapters.payments, 'createCheckout');
		const base = config.APP_URL.replace(/\/+$/, '');
		const cases = [
			[{ locale: 'sl' }, `${base}/placila/zakljucek`],
			[{ locale: 'en' }, `${base}/en/payments/return`],
			[{ locale: 'sl', return_scheme: true }, 'zivali://payments/return'],
		] as const;
		for (const [extra, prefix] of cases) {
			const res = await checkout(auth, { ...tip, ...extra });
			expect(res.status).toBe(200);
			const { successUrl, cancelUrl, locale, amountCents, paymentId } = spy.mock.lastCall![0];
			const query = `payment_id=${res.body.payment_id}&return_to=%2Fr%2FHk3vT9qP%2Freunited`;
			expect(successUrl).toBe(`${prefix}?${query}`);
			expect(cancelUrl).toBe(`${prefix}?${query}&canceled=1`);
			expect({ locale, amountCents, paymentId }).toEqual({
				locale: extra.locale,
				amountCents: 500,
				paymentId: res.body.payment_id,
			});
		}
	});

	it('replays a retried request (same Idempotency-Key): one payment, one provider session', async () => {
		const { id, auth } = await user();
		const spy = vi.spyOn(adapters.payments, 'createCheckout');
		const key = randomUUID();
		const first = await checkout(auth, tip, key);
		const again = await checkout(auth, tip, key);
		expect(again.status).toBe(200);
		expect(again.headers['idempotent-replayed']).toBe('true');
		expect(again.body).toEqual(first.body);
		expect(spy).toHaveBeenCalledTimes(1);
		expect(await prisma.payments.count({ where: { user_id: id } })).toBe(1);
		const other = await checkout(auth, { ...tip, amount_cents: 600 }, key);
		expect(other.status).toBe(409);
	});

	it('leaves no payment row when the provider fails', async () => {
		const { id, auth } = await user();
		vi.spyOn(adapters.payments, 'createCheckout').mockRejectedValueOnce(new Error('stripe: HTTP 500'));
		const res = await checkout(auth);
		expect(res.status).toBe(500);
		expect(await prisma.payments.count({ where: { user_id: id } })).toBe(0);
	});
});

describe('GET /v1/payments/:id and GET /v1/me/payments', () => {
	it('show the owner their payments only, newest first and paginated', async () => {
		const owner = await user();
		const made: string[] = [];
		for (const amount_cents of [300, 500, 1000])
			made.push((await checkout(owner.auth, { ...tip, amount_cents })).body.payment_id);

		const one = await request(app).get(`/v1/payments/${made[0]}`).set('Authorization', owner.auth);
		expect(one.status).toBe(200);
		expect(one.body).toEqual({
			id: made[0],
			purpose: 'tip',
			amount_cents: 300,
			currency: 'EUR',
			status: 'pending',
			created_at: expect.any(String),
			updated_at: expect.any(String),
		});

		const page1 = await request(app).get('/v1/me/payments?limit=2').set('Authorization', owner.auth);
		expect(page1.status).toBe(200);
		expect(page1.body.items.map((p: { id: string }) => p.id)).toEqual([made[2], made[1]]);
		const page2 = await request(app)
			.get(`/v1/me/payments?limit=2&cursor=${page1.body.next_cursor}`)
			.set('Authorization', owner.auth);
		expect(page2.body).toEqual({ items: [expect.objectContaining({ id: made[0] })], next_cursor: null });
	});

	it('hide a payment from everyone else (404), staff included; anonymous and signed-out get 401', async () => {
		const owner = await user();
		const { payment_id } = (await checkout(owner.auth)).body;
		for (const [role, aal] of [
			['USER', 'aal1'],
			['MODERATOR', 'aal2'],
			['ADMIN', 'aal2'],
		] as const) {
			const other = await user({}, { aal });
			await prisma.profiles.upsert({ where: { id: other.id }, create: { id: other.id, role }, update: { role } });
			const res = await request(app).get(`/v1/payments/${payment_id}`).set('Authorization', other.auth);
			expect(res.status, role).toBe(404);
			expect((await request(app).get('/v1/me/payments').set('Authorization', other.auth)).body.items).toEqual([]);
		}
		const anonymous = await user({ is_anonymous: true });
		for (const auth of ['', anonymous.auth]) {
			expect((await request(app).get(`/v1/payments/${payment_id}`).set('Authorization', auth)).status).toBe(401);
			expect((await request(app).get('/v1/me/payments').set('Authorization', auth)).status).toBe(401);
		}
		expect((await request(app).get('/v1/payments/not-a-uuid').set('Authorization', owner.auth)).status).toBe(400);
	});
});
