// Premium prices (C13 §Prices and entitlements, TASK-52.1) against the local database: the migrated payments.prices,
// PaymentsDomain.premiumPrice on the mock provider (fixture prices from payments.prices), its 10 min cache and the
// mismatch guard (503 SERVICE_UNAVAILABLE, log payments.price_mismatch).
import { afterEach, describe, expect, it, vi } from 'vitest';

import { adapters } from '../../adapters/index.ts';
import type { PaymentsAdapter, ProviderPrice } from '../../adapters/payments/index.ts';
import { mockPayments } from '../../adapters/payments/mock.ts';
import { offAdapter } from '../../adapters/select.ts';
import PaymentsDomain, { PRICE_TTL_MS } from '../../domains/payments/payments.domain.ts';
import configStore from '../../lib/config-store.ts';
import { systemCtx } from '../../lib/ctx.ts';
import { logger } from '../../lib/logger.ts';

const unavailable = expect.objectContaining({ name: 'AppError', code: 'SERVICE_UNAVAILABLE' });

/** A ctx with its own payments adapter, so each test starts with an empty price cache. */
function priceCtx(patch: Partial<PaymentsAdapter> = {}) {
	const payments = { ...mockPayments('http://localhost:3000', 's'), ...patch };
	return { ctx: systemCtx({ adapters: { ...adapters, payments } }), payments };
}

afterEach(() => {
	vi.restoreAllMocks();
});

describe('payments.prices (TASK-52.1 migration)', () => {
	it('holds Premium EUR 3.99/month and EUR 29.99/year; every other field stays as TASK-6.8 inserted it', async () => {
		configStore.invalidate();
		expect(await configStore.get('payments.prices')).toEqual({
			boost_cents: 499,
			premium_monthly_cents: 399,
			premium_yearly_cents: 2999,
			vet_partner_monthly_cents: 3900,
			podpornik_min_monthly_cents: 200,
			support_suggested_cents: [300, 500, 1000],
			support_highlight_cents: 500,
			custom_min_cents: 200,
		});
	});
});

describe('PaymentsDomain.premiumPrice', () => {
	it('resolves both plans on the mock provider from payments.prices', async () => {
		const { ctx } = priceCtx();
		await expect(PaymentsDomain.premiumPrice('monthly', ctx)).resolves.toEqual({
			price_id: 'mock_price_premium_monthly',
			amount_cents: 399,
			currency: 'eur',
			interval: 'month',
		});
		await expect(PaymentsDomain.premiumPrice('yearly', ctx)).resolves.toEqual({
			price_id: 'mock_price_premium_yearly',
			amount_cents: 2999,
			currency: 'eur',
			interval: 'year',
		});
	});

	it('looks a lookup key up once per 10 minutes', async () => {
		const { ctx, payments } = priceCtx();
		const find = vi.spyOn(payments, 'findPrice');
		await PaymentsDomain.premiumPrice('monthly', ctx);
		await PaymentsDomain.premiumPrice('monthly', ctx);
		await PaymentsDomain.premiumPrice('yearly', ctx);
		expect(find.mock.calls).toEqual([['premium_monthly'], ['premium_yearly']]);
		const now = Date.now();
		vi.spyOn(Date, 'now').mockReturnValue(now + PRICE_TTL_MS + 1);
		await PaymentsDomain.premiumPrice('monthly', ctx);
		expect(find).toHaveBeenCalledTimes(3);
	});

	it('does not cache a failed lookup', async () => {
		const { ctx, payments } = priceCtx();
		const real = payments.findPrice;
		const find = vi
			.spyOn(payments, 'findPrice')
			.mockRejectedValueOnce(new Error('stripe: HTTP 500'))
			.mockImplementation(real);
		await expect(PaymentsDomain.premiumPrice('monthly', ctx)).rejects.toThrow(/HTTP 500/);
		await expect(PaymentsDomain.premiumPrice('monthly', ctx)).resolves.toMatchObject({ amount_cents: 399 });
		expect(find).toHaveBeenCalledTimes(2);
	});

	it('refuses with SERVICE_UNAVAILABLE and logs payments.price_mismatch when amount, currency, interval or interval_count differs', async () => {
		const good: ProviderPrice = {
			id: 'price_x',
			unit_amount: 399,
			currency: 'eur',
			interval: 'month',
			interval_count: 1,
		};
		for (const found of [
			{ ...good, unit_amount: 299 },
			{ ...good, currency: 'usd' },
			{ ...good, interval: 'year' },
			// Every 3 months is not monthly.
			{ ...good, interval_count: 3 },
			{ ...good, interval_count: null },
			{ ...good, unit_amount: null },
			null,
		]) {
			const error = vi.spyOn(logger, 'error').mockImplementation(() => undefined);
			const { ctx } = priceCtx({ findPrice: async () => found });
			await expect(PaymentsDomain.premiumPrice('monthly', ctx)).rejects.toThrowError(unavailable);
			expect(error).toHaveBeenCalledWith(
				{
					plan: 'monthly',
					lookup_key: 'premium_monthly',
					expected: { unit_amount: 399, currency: 'eur', interval: 'month', interval_count: 1 },
					found,
				},
				'payments.price_mismatch'
			);
			error.mockRestore();
		}
		// The same price passes.
		const { ctx } = priceCtx({ findPrice: async () => good });
		await expect(PaymentsDomain.premiumPrice('monthly', ctx)).resolves.toMatchObject({ price_id: 'price_x' });
	});

	it('answers SERVICE_UNAVAILABLE with payments off', async () => {
		const ctx = systemCtx({
			adapters: { ...adapters, payments: offAdapter<PaymentsAdapter>('PAYMENTS_PROVIDER') },
		});
		await expect(PaymentsDomain.premiumPrice('yearly', ctx)).rejects.toThrowError(unavailable);
	});

	it('mock provider: an unknown lookup key has no price', async () => {
		await expect(mockPayments('http://localhost:3000', 's').findPrice('boost')).resolves.toBeNull();
	});
});
