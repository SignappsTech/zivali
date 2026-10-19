// Payments adapter (C13): live-key guard, Stripe signature scheme (shared with the mock), event parsing and
// redaction, the Checkout Session request (fetch stubbed: no test reaches Stripe), the mock dev-page URL.
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createPayments, paymentsOn } from '../../adapters/payments/index.ts';
import { mockEvent, mockPayments, signWebhook } from '../../adapters/payments/mock.ts';
import { stripePayments } from '../../adapters/payments/stripe.ts';
import { STRIPE_API_VERSION } from '../../adapters/payments/stripe-version.ts';
import { config, type Config } from '../../lib/config.ts';

const blank: Config = {
	...config,
	PAYMENTS_PROVIDER: undefined,
	STRIPE_SECRET_KEY: undefined,
	STRIPE_WEBHOOK_SECRET: undefined,
	MOCK_WEBHOOK_SECRET: undefined,
};
const validation = expect.objectContaining({ name: 'AppError', code: 'VALIDATION' });

afterEach(() => {
	vi.restoreAllMocks();
});

describe('live-key guard', () => {
	it('refuses sk_live_, rk_live_ and pk_live_ keys with any provider outside APP_ENV=production', () => {
		for (const key of ['sk_live_abc', 'rk_live_abc', 'pk_live_abc']) {
			for (const PAYMENTS_PROVIDER of [undefined, 'mock', 'stripe', 'off'] as const) {
				for (const NODE_ENV of ['development', 'test', 'production'] as const) {
					for (const APP_ENV of ['local', 'staging'] as const) {
						expect(() =>
							createPayments({
								...blank,
								NODE_ENV,
								APP_ENV,
								PAYMENTS_PROVIDER,
								STRIPE_SECRET_KEY: key,
								STRIPE_WEBHOOK_SECRET: 'whsec_x',
							})
						).toThrow(/live keys are refused/);
					}
				}
			}
		}
	});

	it('boots a live key in APP_ENV=production as a live adapter (checkouts then wait for the live gate)', () => {
		const live = createPayments({
			...blank,
			NODE_ENV: 'production',
			APP_ENV: 'production',
			PAYMENTS_PROVIDER: 'stripe',
			STRIPE_SECRET_KEY: 'sk_live_abc',
			STRIPE_WEBHOOK_SECRET: 'whsec_x',
		});
		expect(live).toMatchObject({ provider: 'stripe', live: true });
		expect(stripePayments('sk_test_x', 'whsec_x').live).toBe(false);
		expect(mockPayments('http://localhost:3000', 's').live).toBe(false);
	});

	it('accepts test keys; without them outside production the mock provider runs', () => {
		const stripe = createPayments({
			...blank,
			PAYMENTS_PROVIDER: 'stripe',
			STRIPE_SECRET_KEY: 'sk_test_x',
			STRIPE_WEBHOOK_SECRET: 'whsec_x',
		});
		expect(stripe.provider).toBe('stripe');
		expect(createPayments({ ...blank, PAYMENTS_PROVIDER: 'stripe' }).provider).toBe('mock');
		expect(createPayments(blank).provider).toBe('mock');
	});
});

describe('payments off (TASK-76.1: production before the fiscal questions are cleared)', () => {
	const input = {
		paymentId: 'p1',
		amountCents: 500,
		currency: 'eur',
		description: 'Tip',
		locale: 'sl',
		successUrl: 'https://najdimo.si/placila/zakljucek',
		cancelUrl: 'https://najdimo.si/placila/zakljucek?canceled=1',
	} as const;
	const unavailable = expect.objectContaining({ name: 'AppError', code: 'SERVICE_UNAVAILABLE' });

	it('is the default in APP_ENV=production: every checkout and webhook answers SERVICE_UNAVAILABLE', () => {
		for (const NODE_ENV of ['development', 'production'] as const) {
			const off = createPayments({ ...blank, NODE_ENV, APP_ENV: 'production' });
			expect(() => off.createCheckout(input)).toThrowError(unavailable);
			expect(() => off.parseWebhook('{}', 'sig')).toThrowError(unavailable);
		}
		// Explicit off in any environment.
		const off = createPayments({ ...blank, PAYMENTS_PROVIDER: 'off' });
		expect(() => off.createCheckout(input)).toThrowError(unavailable);
		// What GET /v1/config/public reports as payments.enabled.
		expect(paymentsOn(off)).toBe(false);
		expect(paymentsOn(createPayments(blank))).toBe(true);
		expect(paymentsOn(stripePayments('sk_test_x', 'whsec_x'))).toBe(true);
	});

	it('production still takes an explicit stripe provider; staging keeps fail-fast without one', () => {
		const prod = { ...blank, NODE_ENV: 'production', APP_ENV: 'production' } as const;
		const stripe = {
			PAYMENTS_PROVIDER: 'stripe',
			STRIPE_SECRET_KEY: 'sk_test_x',
			STRIPE_WEBHOOK_SECRET: 'w',
		} as const;
		expect(createPayments({ ...prod, ...stripe }).provider).toBe('stripe');
		expect(() => createPayments({ ...prod, APP_ENV: 'staging' })).toThrow(/PAYMENTS_PROVIDER/);
		expect(createPayments({ ...prod, APP_ENV: 'staging', ...stripe }).provider).toBe('stripe');
	});
});

describe('webhook signature and parsing (Stripe scheme)', () => {
	const secret = 'whsec_test';
	const { parseWebhook } = stripePayments('sk_test_x', secret);
	const event = {
		id: 'evt_1',
		type: 'checkout.session.completed',
		livemode: false,
		data: {
			object: {
				id: 'cs_test_1',
				payment_intent: 'pi_1',
				amount_total: 500,
				currency: 'eur',
				payment_status: 'paid',
				status: 'complete',
				metadata: { payment_id: 'p1' },
				customer_details: { email: 'owner@example.com', name: 'Ana Novak' },
				payment_method_details: { card: { last4: '4242', brand: 'visa', exp_month: 12 } },
			},
		},
	};
	const body = JSON.stringify(event);

	it('parses a signed event into the fields the ledger keeps, nothing personal', () => {
		const parsed = parseWebhook(body, signWebhook(body, secret));
		expect(parsed).toEqual({
			id: 'evt_1',
			type: 'checkout.session.completed',
			livemode: false,
			object: {
				id: 'cs_test_1',
				payment_intent: 'pi_1',
				amount: 500,
				currency: 'eur',
				status: 'paid',
				refunded: undefined,
				metadata: { payment_id: 'p1' },
			},
		});
		expect(JSON.stringify(parsed)).not.toMatch(/owner@example|Novak|4242|visa/);
	});

	it('rejects a wrong secret, a tampered body, a stale or missing timestamp and a missing header', () => {
		const old = Math.floor(Date.now() / 1000) - 301;
		for (const [raw, signature] of [
			[body, signWebhook(body, 'whsec_other')],
			[body.replace('500', '50000'), signWebhook(body, secret)],
			[body, signWebhook(body, secret, old)],
			[body, signWebhook(body, secret).replace(/^t=\d+,/, '')],
			[body, undefined],
		] as const) {
			expect(() => parseWebhook(raw, signature)).toThrowError(validation);
		}
	});

	it('rejects signed bodies that are not JSON or not a Stripe event', () => {
		for (const raw of ['not json', '{}', JSON.stringify({ ...event, livemode: 'no' })]) {
			expect(() => parseWebhook(raw, signWebhook(raw, secret))).toThrowError(validation);
		}
	});

	it('reads charge events: amount, status and refunded', () => {
		const raw = JSON.stringify({
			id: 'evt_2',
			type: 'charge.refunded',
			livemode: false,
			data: {
				object: {
					id: 'ch_1',
					payment_intent: 'pi_1',
					amount: 500,
					status: 'succeeded',
					refunded: true,
					metadata: {},
				},
			},
		});
		expect(parseWebhook(raw, signWebhook(raw, secret)).object).toMatchObject({
			id: 'ch_1',
			amount: 500,
			status: 'succeeded',
			refunded: true,
		});
	});
});

describe('stripe createCheckout', () => {
	it('posts one Checkout Session (managed payments off, payment id as metadata and idempotency key)', async () => {
		const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
			new Response(JSON.stringify({ id: 'cs_test_9', url: 'https://checkout.stripe.com/c/pay/cs_test_9' }), {
				status: 200,
			})
		);
		const result = await stripePayments('sk_test_secret', 'whsec_x').createCheckout({
			paymentId: 'p9',
			amountCents: 500,
			currency: 'eur',
			description: 'Zahvala za Najdimo',
			locale: 'sl',
			successUrl: 'zivali://payments/return?payment_id=p9',
			cancelUrl: 'zivali://payments/return?payment_id=p9&canceled=1',
		});
		expect(result).toEqual({ id: 'cs_test_9', url: 'https://checkout.stripe.com/c/pay/cs_test_9' });
		const [url, init] = fetch.mock.calls[0]!;
		expect(url).toBe('https://api.stripe.com/v1/checkout/sessions');
		expect(init?.headers).toMatchObject({
			authorization: 'Bearer sk_test_secret',
			'idempotency-key': 'p9',
			'stripe-version': STRIPE_API_VERSION,
		});
		expect(init?.signal).toBeInstanceOf(AbortSignal);
		const form = Object.fromEntries(init?.body as URLSearchParams);
		expect(form).toMatchObject({
			mode: 'payment',
			'managed_payments[enabled]': 'false',
			locale: 'sl',
			client_reference_id: 'p9',
			'metadata[payment_id]': 'p9',
			'payment_intent_data[metadata][payment_id]': 'p9',
			'line_items[0][price_data][currency]': 'eur',
			'line_items[0][price_data][unit_amount]': '500',
			success_url: 'zivali://payments/return?payment_id=p9',
			cancel_url: 'zivali://payments/return?payment_id=p9&canceled=1',
		});
	});

	it('fails on a Stripe error and refuses a live session', async () => {
		const input = {
			paymentId: 'p9',
			amountCents: 500,
			currency: 'eur',
			description: 'x',
			locale: 'en',
			successUrl: 'https://a.si/s',
			cancelUrl: 'https://a.si/c',
		} as const;
		const adapter = stripePayments('sk_test_secret', 'whsec_x');
		vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response('{}', { status: 400 }));
		await expect(adapter.createCheckout(input)).rejects.toThrow(/HTTP 400/);
		vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
			new Response(JSON.stringify({ id: 'cs_live_1', url: 'https://x', livemode: true }), { status: 200 })
		);
		await expect(adapter.createCheckout(input)).rejects.toMatchObject({ code: 'LIVE_MODE_FORBIDDEN' });
		// A live key's sessions are live (the domain's live gate decides before the call).
		vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
			new Response(JSON.stringify({ id: 'cs_live_1', url: 'https://x', livemode: true }), { status: 200 })
		);
		await expect(stripePayments('sk_live_secret', 'whsec_x').createCheckout(input)).resolves.toEqual({
			id: 'cs_live_1',
			url: 'https://x',
		});
	});

	it('maps a timeout or network failure to SERVICE_UNAVAILABLE', async () => {
		const adapter = stripePayments('sk_test_secret', 'whsec_x');
		vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new DOMException('timed out', 'TimeoutError'));
		await expect(
			adapter.createCheckout({
				paymentId: 'p9',
				amountCents: 500,
				currency: 'eur',
				description: 'x',
				locale: 'en',
				successUrl: 'https://a.si/s',
				cancelUrl: 'https://a.si/c',
			})
		).rejects.toMatchObject({ code: 'SERVICE_UNAVAILABLE' });
	});
});

describe('stripe findPrice (C13 §Prices: by lookup key)', () => {
	const adapter = stripePayments('sk_test_secret', 'whsec_x');
	const list = (data: unknown[]) => new Response(JSON.stringify({ object: 'list', data }), { status: 200 });

	it('asks for the active price with the lookup key and keeps amount, currency and interval', async () => {
		const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
			list([
				{
					id: 'price_1',
					object: 'price',
					unit_amount: 399,
					currency: 'eur',
					recurring: { interval: 'month', interval_count: 1 },
					lookup_key: 'premium_monthly',
				},
			])
		);
		await expect(adapter.findPrice('premium_monthly')).resolves.toEqual({
			id: 'price_1',
			unit_amount: 399,
			currency: 'eur',
			interval: 'month',
		});
		const [url, init] = fetch.mock.calls[0]!;
		const u = new URL(String(url));
		expect(`${u.origin}${u.pathname}`).toBe('https://api.stripe.com/v1/prices');
		expect(u.searchParams.getAll('lookup_keys[]')).toEqual(['premium_monthly']);
		expect(u.searchParams.get('active')).toBe('true');
		expect(init?.method ?? 'GET').toBe('GET');
		expect(init?.headers).toMatchObject({
			authorization: 'Bearer sk_test_secret',
			'stripe-version': STRIPE_API_VERSION,
		});
		expect(init?.signal).toBeInstanceOf(AbortSignal);
	});

	it('answers null without a price, an interval of null for a one-time price', async () => {
		vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(list([]));
		await expect(adapter.findPrice('premium_yearly')).resolves.toBeNull();
		vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
			list([{ id: 'price_2', unit_amount: 2999, currency: 'eur', recurring: null }])
		);
		await expect(adapter.findPrice('premium_yearly')).resolves.toMatchObject({ interval: null });
	});

	it('maps a network failure to SERVICE_UNAVAILABLE; an HTTP error or odd body is a plain error', async () => {
		vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new DOMException('timed out', 'TimeoutError'));
		await expect(adapter.findPrice('premium_monthly')).rejects.toMatchObject({ code: 'SERVICE_UNAVAILABLE' });
		vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response('{}', { status: 401 }));
		await expect(adapter.findPrice('premium_monthly')).rejects.toThrow(/HTTP 401/);
		vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(list([{ id: 'price_3' }]));
		const odd = adapter.findPrice('premium_monthly');
		await expect(odd).rejects.toThrow(/unexpected price list/);
		await expect(odd).rejects.not.toHaveProperty('code');
	});
});

describe('mock provider', () => {
	it('checks out on the web dev page and parses its signed success, fail and cancel events', async () => {
		const mock = mockPayments('http://localhost:3000', 's');
		const session = await mock.createCheckout({
			paymentId: 'p1',
			amountCents: 500,
			currency: 'eur',
			description: 'x',
			locale: 'sl',
			successUrl: 'http://localhost:3000/placila/zakljucek?payment_id=p1',
			cancelUrl: 'http://localhost:3000/placila/zakljucek?payment_id=p1&canceled=1',
		});
		expect(session).toEqual({ id: 'mock_cs_p1', url: 'http://localhost:3000/dev/checkout?payment_id=p1' });
		for (const [outcome, type] of [
			['success', 'checkout.session.completed'],
			['fail', 'checkout.session.async_payment_failed'],
			['cancel', 'checkout.session.expired'],
		] as const) {
			const raw = mockEvent(outcome, 'p1');
			expect(mock.parseWebhook(raw, signWebhook(raw, 's'))).toMatchObject({
				type,
				livemode: false,
				object: { id: 'mock_cs_p1', metadata: { payment_id: 'p1' } },
			});
		}
	});

	describe('return_to on the dev-page URL (back to the page the payment started from)', () => {
		const mock = mockPayments('http://localhost:3000', 's');
		const checkout = (successUrl: string) =>
			mock.createCheckout({
				paymentId: 'p1',
				amountCents: 500,
				currency: 'eur',
				description: 'x',
				locale: 'en',
				successUrl,
				cancelUrl: `${successUrl}&canceled=1`,
			});
		const page = 'http://localhost:3000/dev/checkout?payment_id=p1';

		it('carries the URL-encoded return_to of the success URL (web and app scheme)', async () => {
			for (const base of ['http://localhost:3000/en/payments/return', 'zivali://payments/return']) {
				const { url } = await checkout(`${base}?payment_id=p1&return_to=%2Fen%2Fr%2FHk3vT9qP%2Freunited`);
				expect(url).toBe(`${page}&return_to=%2Fen%2Fr%2FHk3vT9qP%2Freunited`);
				expect(new URL(url).searchParams.get('return_to')).toBe('/en/r/Hk3vT9qP/reunited');
			}
		});

		it('omits it when the caller gave none', async () => {
			expect((await checkout('http://localhost:3000/placila/zakljucek?payment_id=p1')).url).toBe(page);
		});

		it('drops what the C13 rule refuses, so the dev page is no open redirect', async () => {
			for (const returnTo of [
				'https://evil.example/',
				'//evil.example/',
				'/\\evil.example',
				'/\\/evil.example',
				'javascript:alert(1)',
				'evil.example',
				'/r/x y',
				`/${'a'.repeat(512)}`,
			]) {
				const success = new URL('http://localhost:3000/placila/zakljucek?payment_id=p1');
				success.searchParams.set('return_to', returnTo);
				expect((await checkout(success.toString())).url).toBe(page);
			}
		});
	});
});
