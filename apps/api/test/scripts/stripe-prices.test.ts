// scripts/stripe-prices.ts (C13 §Prices and entitlements, TASK-52.1) against an in-memory fake of the Stripe API: no
// test reaches Stripe. Key and account guard, archived product, dry run, create, replace (transfer_lookup_key +
// archive; also for a 3-month price or one on another product), idempotent rerun, lines printed as they happen.
import { describe, expect, it } from 'vitest';

import { ACCOUNT_ID, ensurePrices, PRODUCT_ID, type StripeCall } from '../../scripts/stripe-prices.ts';

type FakePrice = {
	id: string;
	active: boolean;
	product: string;
	lookup_key: string | null;
	unit_amount: number;
	currency: string;
	recurring: { interval: string; interval_count: number };
};

/** Stripe's product and price endpoints over in-memory state; every call is recorded. */
function fakeStripe({
	account = ACCOUNT_ID,
	product,
	prices = [] as FakePrice[],
	failArchive = false,
}: { account?: string; product?: 'active' | 'archived'; prices?: FakePrice[]; failArchive?: boolean } = {}) {
	const state = {
		products: product ? [{ id: PRODUCT_ID, active: product === 'active' }] : [],
		prices: prices.map((p) => ({ ...p })),
	};
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
			state.products.push({ id: field('id'), active: true });
			return { id: field('id') };
		}
		if (method === 'POST' && route === '/v1/prices') {
			if (field('transfer_lookup_key') === 'true')
				for (const p of state.prices) if (p.lookup_key === field('lookup_key')) p.lookup_key = null;
			const price = {
				id: `price_new_${++n}`,
				active: true,
				product: field('product'),
				lookup_key: field('lookup_key'),
				unit_amount: Number(field('unit_amount')),
				currency: field('currency'),
				recurring: {
					interval: field('recurring[interval]'),
					interval_count: Number(field('recurring[interval_count]') || 1),
				},
			};
			state.prices.push(price);
			return price;
		}
		const archived = state.prices.find((p) => route === `/v1/prices/${p.id}`);
		if (method === 'POST' && archived) {
			if (failArchive) throw new Error(`stripe POST /v1/prices/${archived.id}: HTTP 500`);
			archived.active = field('active') !== 'false';
			return archived;
		}
		throw new Error(`unexpected ${method} ${path}`);
	}) as StripeCall;
	return { stripe, calls, state };
}

const price = (
	id: string,
	lookup_key: string,
	unit_amount: number,
	interval: string,
	{ currency = 'eur', interval_count = 1, product = PRODUCT_ID } = {}
): FakePrice => ({
	id,
	active: true,
	product,
	lookup_key,
	unit_amount,
	currency,
	recurring: { interval, interval_count },
});
const writes = <C extends { method: string }>(calls: C[]) => calls.filter((c) => c.method !== 'GET');

/** ensurePrices with its lines collected; `out` keeps what was printed even when it rejects. */
function run(stripe: StripeCall, { apply = true, ...rest }: { apply?: boolean; key?: string } = {}) {
	// An explicit `key: undefined` stays undefined (a default would replace it).
	const key = 'key' in rest ? rest.key : 'sk_test_x';
	const out: string[] = [];
	return { out, done: ensurePrices({ key, apply, stripe, log: (line) => out.push(line) }) };
}

describe('stripe-prices: key, account and product guard', () => {
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
			await expect(run(stripe, { key }).done).rejects.toThrow(/sk_test_/);
			expect(calls).toEqual([]);
		}
	});

	it('refuses another account after GET /v1/account, writing nothing', async () => {
		const { stripe, calls } = fakeStripe({ account: 'acct_someone_else' });
		await expect(run(stripe).done).rejects.toThrow(/Najdimo sandbox/);
		expect(calls).toEqual([{ method: 'GET', path: '/v1/account' }]);
	});

	it('refuses an archived Premium product: no prices are created on it', async () => {
		for (const apply of [true, false]) {
			const { stripe, calls } = fakeStripe({ product: 'archived' });
			await expect(run(stripe, { apply }).done).rejects.toThrow(/najdimo_premium is archived: refused/);
			expect(writes(calls)).toEqual([]);
			expect(calls.some((c) => c.path.startsWith('/v1/prices'))).toBe(false);
		}
	});
});

describe('stripe-prices: dry run and apply', () => {
	it('is a dry run by default: reads only and prints the plan', async () => {
		const { stripe, calls, state } = fakeStripe();
		const { out, done } = run(stripe, { apply: false });
		await done;
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
		await run(stripe).done;
		const form = (unit_amount: string, interval: string, lookup_key: string) => ({
			product: PRODUCT_ID,
			currency: 'eur',
			unit_amount,
			'recurring[interval]': interval,
			'recurring[interval_count]': '1',
			tax_behavior: 'inclusive',
			lookup_key,
			transfer_lookup_key: 'true',
		});
		expect(writes(calls)).toEqual([
			{ method: 'POST', path: '/v1/products', form: { id: PRODUCT_ID, name: 'Najdimo Premium' } },
			{ method: 'POST', path: '/v1/prices', form: form('399', 'month', 'premium_monthly') },
			{ method: 'POST', path: '/v1/prices', form: form('2999', 'year', 'premium_yearly') },
		]);
		// Only active prices with the lookup keys are read.
		const read = calls.find((c) => c.path.startsWith('/v1/prices?'))!;
		const q = new URLSearchParams(read.path.split('?')[1]);
		expect(q.get('active')).toBe('true');
		expect(q.getAll('lookup_keys[]')).toEqual(['premium_monthly', 'premium_yearly']);

		calls.length = 0;
		const again = run(stripe);
		await again.done;
		expect(writes(calls)).toEqual([]);
		expect(again.out).toEqual([
			`account ${ACCOUNT_ID}, test mode`,
			'product najdimo_premium: exists',
			'premium_monthly: price_new_1 EUR 3.99 eur/month: ok',
			'premium_yearly: price_new_2 EUR 29.99 eur/year: ok',
		]);
	});

	it('replaces a price whose amount or currency differs: new price, lookup key moved, old archived', async () => {
		const { stripe, calls, state } = fakeStripe({
			product: 'active',
			prices: [
				price('price_old_m', 'premium_monthly', 299, 'month'),
				price('price_old_y', 'premium_yearly', 2999, 'year', { currency: 'usd' }),
			],
		});
		const { out, done } = run(stripe);
		await done;
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

	it('replaces a 3-month price and a price on another product; leaves the matching plan alone', async () => {
		for (const [stale, shown] of [
			[
				price('price_y', 'premium_yearly', 2999, 'year', { interval_count: 3 }),
				'premium_yearly: price_y EUR 29.99 eur/3 year -> create EUR 29.99 eur/year, archive price_y',
			],
			[
				price('price_y', 'premium_yearly', 2999, 'year', { product: 'prod_other' }),
				'premium_yearly: price_y EUR 29.99 eur/year on prod_other -> create EUR 29.99 eur/year, archive price_y',
			],
			[
				price('price_y', 'premium_yearly', 2999, 'month'),
				'premium_yearly: price_y EUR 29.99 eur/month -> create EUR 29.99 eur/year, archive price_y',
			],
		] as const) {
			const { stripe, calls } = fakeStripe({
				product: 'active',
				prices: [price('price_m', 'premium_monthly', 399, 'month'), stale],
			});
			const { out, done } = run(stripe);
			await done;
			expect(writes(calls).map((c) => [c.path, c.form?.product ?? c.form?.active])).toEqual([
				['/v1/prices', PRODUCT_ID],
				['/v1/prices/price_y', 'false'],
			]);
			expect(out).toContain('premium_monthly: price_m EUR 3.99 eur/month: ok');
			expect(out).toContain(shown);
		}
	});

	it('prints each line as it happens: a failed archive still shows the price just created', async () => {
		const { stripe } = fakeStripe({
			product: 'active',
			prices: [price('price_old_m', 'premium_monthly', 299, 'month')],
			failArchive: true,
		});
		const { out, done } = run(stripe);
		await expect(done).rejects.toThrow(/price_old_m: HTTP 500/);
		expect(out.at(-1)).toBe('premium_monthly: created price_new_1');
	});
});
