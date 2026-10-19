// scripts/stripe-prices.ts (C13 §Prices and entitlements, TASK-52.1) against an in-memory fake of the Stripe API: no
// test reaches Stripe. Key and account guard, dry run, create, replace (transfer_lookup_key + archive), idempotent rerun.
import { describe, expect, it } from 'vitest';

import { ACCOUNT_ID, ensurePrices, PRODUCT_ID, type StripeCall } from '../../scripts/stripe-prices.ts';

type FakePrice = {
	id: string;
	active: boolean;
	lookup_key: string | null;
	unit_amount: number;
	currency: string;
	recurring: { interval: string };
};

/** Stripe's product and price endpoints over in-memory state; every call is recorded. */
function fakeStripe({
	account = ACCOUNT_ID,
	product = false,
	prices = [] as FakePrice[],
}: { account?: string; product?: boolean; prices?: FakePrice[] } = {}) {
	const state = { products: product ? [{ id: PRODUCT_ID }] : [], prices: prices.map((p) => ({ ...p })) };
	const calls: { method: string; path: string; form?: Record<string, string> }[] = [];
	let n = 0;
	const stripe = (async (method: string, path: string, form?: URLSearchParams) => {
		calls.push({ method, path, ...(form && { form: Object.fromEntries(form) }) });
		const [route, qs] = path.split('?');
		const field = (name: string) => form?.get(name) ?? '';
		if (method === 'GET' && route === '/v1/account') return { id: account };
		if (method === 'GET' && route === '/v1/products') {
			const ids = new URLSearchParams(qs).getAll('ids[]');
			return { data: state.products.filter((p) => ids.includes(p.id)) };
		}
		if (method === 'GET' && route === '/v1/prices') {
			const q = new URLSearchParams(qs);
			const keys = q.getAll('lookup_keys[]');
			return {
				data: state.prices.filter(
					(p) => p.lookup_key && keys.includes(p.lookup_key) && (q.get('active') !== 'true' || p.active)
				),
			};
		}
		if (method === 'POST' && route === '/v1/products') {
			state.products.push({ id: field('id') });
			return { id: field('id') };
		}
		if (method === 'POST' && route === '/v1/prices') {
			if (field('transfer_lookup_key') === 'true')
				for (const p of state.prices) if (p.lookup_key === field('lookup_key')) p.lookup_key = null;
			const price = {
				id: `price_new_${++n}`,
				active: true,
				lookup_key: field('lookup_key'),
				unit_amount: Number(field('unit_amount')),
				currency: field('currency'),
				recurring: { interval: field('recurring[interval]') },
			};
			state.prices.push(price);
			return price;
		}
		const archived = state.prices.find((p) => route === `/v1/prices/${p.id}`);
		if (method === 'POST' && archived) {
			archived.active = field('active') !== 'false';
			return archived;
		}
		throw new Error(`unexpected ${method} ${path}`);
	}) as StripeCall;
	return { stripe, calls, state };
}

const price = (id: string, lookup_key: string, unit_amount: number, interval: string, currency = 'eur') => ({
	id,
	active: true,
	lookup_key,
	unit_amount,
	currency,
	recurring: { interval },
});
const writes = <C extends { method: string }>(calls: C[]) => calls.filter((c) => c.method !== 'GET');

describe('stripe-prices: key and account guard', () => {
	it('refuses anything but an sk_test_ key before any call (live, restricted, publishable, missing)', async () => {
		for (const key of [
			undefined,
			'',
			'sk_live_x',
			'rk_live_x',
			'rk_test_x',
			'pk_test_x',
			'pk_live_x',
			' sk_test_x',
		]) {
			const { stripe, calls } = fakeStripe();
			await expect(ensurePrices({ key, apply: true, stripe })).rejects.toThrow(/sk_test_/);
			expect(calls).toEqual([]);
		}
	});

	it('refuses another account after GET /v1/account, writing nothing', async () => {
		const { stripe, calls } = fakeStripe({ account: 'acct_someone_else' });
		await expect(ensurePrices({ key: 'sk_test_x', apply: true, stripe })).rejects.toThrow(/Najdimo sandbox/);
		expect(calls).toEqual([{ method: 'GET', path: '/v1/account' }]);
	});
});

describe('stripe-prices: dry run and apply', () => {
	it('is a dry run by default: reads only and prints the plan', async () => {
		const { stripe, calls, state } = fakeStripe();
		const out = await ensurePrices({ key: 'sk_test_x', apply: false, stripe });
		expect(writes(calls)).toEqual([]);
		expect(state).toEqual({ products: [], prices: [] });
		expect(out).toEqual([
			`account ${ACCOUNT_ID}, test mode, dry run`,
			'product najdimo_premium: missing -> create',
			'premium_monthly: none -> create EUR 3.99 eur/month',
			'premium_yearly: none -> create EUR 29.99 eur/year',
			'dry run: nothing written; rerun with --apply',
		]);
	});

	it('--apply creates the product and both recurring EUR prices; a rerun changes nothing', async () => {
		const { stripe, calls } = fakeStripe();
		await ensurePrices({ key: 'sk_test_x', apply: true, stripe });
		expect(writes(calls)).toEqual([
			{ method: 'POST', path: '/v1/products', form: { id: PRODUCT_ID, name: 'Najdimo Premium' } },
			{
				method: 'POST',
				path: '/v1/prices',
				form: {
					product: PRODUCT_ID,
					currency: 'eur',
					unit_amount: '399',
					'recurring[interval]': 'month',
					tax_behavior: 'inclusive',
					lookup_key: 'premium_monthly',
					transfer_lookup_key: 'true',
				},
			},
			{
				method: 'POST',
				path: '/v1/prices',
				form: {
					product: PRODUCT_ID,
					currency: 'eur',
					unit_amount: '2999',
					'recurring[interval]': 'year',
					tax_behavior: 'inclusive',
					lookup_key: 'premium_yearly',
					transfer_lookup_key: 'true',
				},
			},
		]);
		// Only active prices with the lookup keys are read.
		const read = calls.find((c) => c.path.startsWith('/v1/prices?'))!;
		const q = new URLSearchParams(read.path.split('?')[1]);
		expect(q.get('active')).toBe('true');
		expect(q.getAll('lookup_keys[]')).toEqual(['premium_monthly', 'premium_yearly']);

		calls.length = 0;
		const again = await ensurePrices({ key: 'sk_test_x', apply: true, stripe });
		expect(writes(calls)).toEqual([]);
		expect(again).toEqual([
			`account ${ACCOUNT_ID}, test mode`,
			'product najdimo_premium: exists',
			'premium_monthly: price_new_1 EUR 3.99 eur/month: ok',
			'premium_yearly: price_new_2 EUR 29.99 eur/year: ok',
		]);
	});

	it('replaces a price whose amount, currency or interval differs: new price, lookup key moved, old archived', async () => {
		const { stripe, calls, state } = fakeStripe({
			product: true,
			prices: [
				price('price_old_m', 'premium_monthly', 299, 'month'),
				price('price_old_y', 'premium_yearly', 2999, 'year', 'usd'),
			],
		});
		const out = await ensurePrices({ key: 'sk_test_x', apply: true, stripe });
		expect(writes(calls).map((c) => c.path)).toEqual([
			'/v1/prices',
			'/v1/prices/price_old_m',
			'/v1/prices',
			'/v1/prices/price_old_y',
		]);
		expect(calls.filter((c) => c.path.startsWith('/v1/prices/')).map((c) => c.form)).toEqual([
			{ active: 'false' },
			{ active: 'false' },
		]);
		expect(out).toContain(
			'premium_monthly: price_old_m EUR 2.99 eur/month -> create EUR 3.99 eur/month, archive price_old_m'
		);
		expect(out).toContain('premium_yearly: archived price_old_y');
		// Never deleted: the old prices stay, archived and without their lookup keys.
		expect(state.prices.filter((p) => p.id.startsWith('price_old'))).toMatchObject([
			{ id: 'price_old_m', active: false, lookup_key: null, unit_amount: 299 },
			{ id: 'price_old_y', active: false, lookup_key: null, unit_amount: 2999 },
		]);
	});

	it('touches only the plan that differs (wrong interval on the yearly price)', async () => {
		const { stripe, calls } = fakeStripe({
			product: true,
			prices: [
				price('price_m', 'premium_monthly', 399, 'month'),
				price('price_y', 'premium_yearly', 2999, 'month'),
			],
		});
		const out = await ensurePrices({ key: 'sk_test_x', apply: true, stripe });
		expect(writes(calls).map((c) => [c.path, c.form?.lookup_key ?? c.form?.active])).toEqual([
			['/v1/prices', 'premium_yearly'],
			['/v1/prices/price_y', 'false'],
		]);
		expect(out).toContain('premium_monthly: price_m EUR 3.99 eur/month: ok');
	});
});
