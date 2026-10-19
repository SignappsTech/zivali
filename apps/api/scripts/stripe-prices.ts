// Premium prices in the "Najdimo sandbox" Stripe account (C13 §Prices and entitlements, TASK-52.1). Usage:
//   pnpm --filter api stripe:prices            dry run: prints what it would change, writes nothing
//   pnpm --filter api stripe:prices --apply    writes (a person, or with the lead's approval)
// Idempotent: it finds the Premium product and the active prices holding the lookup keys first. A missing product is
// created. A lookup key whose price differs from PRICES gets a new price (transfer_lookup_key moves the key to it) and
// the replaced price is archived: never deleted or edited (Stripe prices are immutable; test subscriptions keep theirs).
// A matching price is left alone, so a second run changes nothing.
// STRIPE_SECRET_KEY comes only from the root .env.local (a different key in the environment is refused) and must be an
// sk_test_ key of acct_1UQa5wAbrzQytqtO, checked with GET /v1/account before anything else. The key is never printed.
import { existsSync, readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { parseEnv } from 'node:util';

import { STRIPE_API_VERSION } from '../adapters/payments/stripe-version.ts';

export const ACCOUNT_ID = 'acct_1UQa5wAbrzQytqtO'; // Najdimo sandbox
export const PRODUCT_ID = 'najdimo_premium';
/** Must equal app_config payments.prices premium_monthly_cents / premium_yearly_cents: checkout refuses a mismatch. */
export const PRICES = [
	{ lookup_key: 'premium_monthly', unit_amount: 399, interval: 'month' },
	{ lookup_key: 'premium_yearly', unit_amount: 2999, interval: 'year' },
] as const;

type StripePrice = {
	id: string;
	lookup_key: string | null;
	unit_amount: number | null;
	currency: string;
	recurring: { interval: string } | null;
};
/** One Stripe API call (injected in tests): parsed JSON, throws on an HTTP error. */
export type StripeCall = <T>(method: 'GET' | 'POST', path: string, form?: URLSearchParams) => Promise<T>;

const euro = (cents: number | null) => `EUR ${((cents ?? 0) / 100).toFixed(2)}`;
const label = (p: StripePrice) => `${p.id} ${euro(p.unit_amount)} ${p.currency}/${p.recurring?.interval ?? 'one-time'}`;

/** Brings the Premium product and prices to PRICES; returns the report lines. Writes only with `apply`. */
export async function ensurePrices({
	key,
	apply,
	stripe,
}: {
	key: string | undefined;
	apply: boolean;
	stripe: StripeCall;
}): Promise<string[]> {
	if (!key?.startsWith('sk_test_'))
		throw new Error('STRIPE_SECRET_KEY must be a secret test key (sk_test_): refused');
	const account = await stripe<{ id: string }>('GET', '/v1/account');
	if (account.id !== ACCOUNT_ID)
		throw new Error(`Stripe account is not the Najdimo sandbox (${ACCOUNT_ID}): refused`);
	const out = [`account ${ACCOUNT_ID}, test mode${apply ? '' : ', dry run'}`];

	const products = await stripe<{ data: unknown[] }>(
		'GET',
		`/v1/products?${new URLSearchParams({ 'ids[]': PRODUCT_ID })}`
	);
	if (products.data.length) out.push(`product ${PRODUCT_ID}: exists`);
	else {
		out.push(`product ${PRODUCT_ID}: missing -> create`);
		if (apply)
			await stripe('POST', '/v1/products', new URLSearchParams({ id: PRODUCT_ID, name: 'Najdimo Premium' }));
	}

	const query = new URLSearchParams({ active: 'true', limit: '100' });
	for (const want of PRICES) query.append('lookup_keys[]', want.lookup_key);
	const { data } = await stripe<{ data: StripePrice[] }>('GET', `/v1/prices?${query}`);
	for (const want of PRICES) {
		const current = data.find((p) => p.lookup_key === want.lookup_key);
		const target = `${euro(want.unit_amount)} eur/${want.interval}`;
		if (
			current?.unit_amount === want.unit_amount &&
			current.currency === 'eur' &&
			current.recurring?.interval === want.interval
		) {
			out.push(`${want.lookup_key}: ${current.id} ${target}: ok`);
			continue;
		}
		out.push(
			`${want.lookup_key}: ${current ? label(current) : 'none'} -> create ${target}` +
				(current ? `, archive ${current.id}` : '')
		);
		if (!apply) continue;
		const created = await stripe<{ id: string }>(
			'POST',
			'/v1/prices',
			new URLSearchParams({
				product: PRODUCT_ID,
				currency: 'eur',
				unit_amount: String(want.unit_amount),
				'recurring[interval]': want.interval,
				// C13: VAT included.
				tax_behavior: 'inclusive',
				lookup_key: want.lookup_key,
				transfer_lookup_key: 'true',
			})
		);
		out.push(`${want.lookup_key}: created ${created.id}`);
		if (current) {
			await stripe(
				'POST',
				`/v1/prices/${encodeURIComponent(current.id)}`,
				new URLSearchParams({ active: 'false' })
			);
			out.push(`${want.lookup_key}: archived ${current.id}`);
		}
	}
	if (!apply && out.some((line) => line.includes('->'))) out.push('dry run: nothing written; rerun with --apply');
	return out;
}

async function main() {
	const file = new URL('../../../.env.local', import.meta.url);
	const key = existsSync(file) ? parseEnv(readFileSync(file, 'utf8')).STRIPE_SECRET_KEY : undefined;
	if (process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY !== key)
		throw new Error('STRIPE_SECRET_KEY in the environment differs from the root .env.local: refused (unset it)');
	const stripe: StripeCall = async <T>(method: 'GET' | 'POST', path: string, form?: URLSearchParams) => {
		const res = await fetch(`https://api.stripe.com${path}`, {
			method,
			headers: { authorization: `Bearer ${key}`, 'stripe-version': STRIPE_API_VERSION },
			body: form,
			signal: AbortSignal.timeout(20_000),
		});
		const json = (await res.json()) as { error?: { message?: string } };
		if (!res.ok)
			throw new Error(`stripe ${method} ${path.split('?')[0]}: HTTP ${res.status} ${json.error?.message ?? ''}`);
		return json as T;
	};
	const lines = await ensurePrices({ key, apply: process.argv.includes('--apply'), stripe });
	process.stdout.write(`${lines.join('\n')}\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
	main().catch((err: Error) => {
		process.stderr.write(`${err.message}\n`);
		process.exit(1);
	});
}
