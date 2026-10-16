import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { payment } from '@zivali/api/__fixtures__/payments';
import en from '@zivali/i18n/dist/en.json';
import sl from '@zivali/i18n/dist/sl.json';
import type { Payment } from '@zivali/types';

import { PaymentsList } from './payments-list';

const state = vi.hoisted(() => ({
	query: {} as { data?: object; isError?: boolean; isFetching?: boolean; refetch?: () => void },
	arg: undefined as unknown,
}));
vi.mock('@zivali/api/payments', () => ({
	useListMyPaymentsQuery: (arg: unknown) => {
		state.arg = arg;
		return state.query;
	},
}));

const row = (n: number, fields: Partial<Payment>): Payment => ({ ...payment, id: `p${n}`, ...fields });
const items = [
	row(1, { amount_cents: 500, created_at: '2026-10-15T10:00:00Z' }),
	row(2, { purpose: 'report_contribution', status: 'failed', amount_cents: 300, created_at: '2026-10-02T10:00:00Z' }),
	row(3, { status: 'pending', created_at: '2026-10-01T10:00:00Z' }),
	row(4, { status: 'canceled', created_at: '2026-10-01T10:00:00Z' }),
	row(5, { purpose: 'support', status: 'refunded', amount_cents: 1000, created_at: '2026-09-18T10:00:00Z' }),
];

function show(query: typeof state.query, { locale = 'sl' as 'sl' | 'en', testMode = true } = {}) {
	state.query = query;
	return render(
		<NextIntlClientProvider locale={locale} messages={locale === 'en' ? en : sl}>
			<PaymentsList testMode={testMode} />
		</NextIntlClientProvider>
	);
}

const rows = () => screen.queryAllByRole('listitem').map((li) => li.textContent?.replace(/\s/g, ' '));

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

describe('PaymentsList', () => {
	it('lists settled payments: date · purpose · amount, status word, test label; skips pending and cancelled', () => {
		show({ data: { items, next_cursor: null } });
		expect(state.arg).toEqual({ limit: 50 });
		expect(rows()).toEqual([
			'15. 10. 2026 · Prispevek v zahvalo · 5,00 €PlačanoTestno',
			'2. 10. 2026 · Prispevek ob prijavi · 3,00 €NeuspešnoTestno',
			'18. 9. 2026 · Podpora za Najdimo · 10,00 €VrnjenoTestno',
		]);
	});

	it('formats for EN and drops the test label in production', () => {
		show({ data: { items: items.slice(0, 1), next_cursor: null } }, { locale: 'en', testMode: false });
		expect(rows()).toEqual(['15/10/2026 · Thank-you contribution · €5.00Paid']);
	});

	it('says so when there is nothing to list', () => {
		show({ data: { items: items.slice(2, 4), next_cursor: null } });
		expect(screen.getByText(sl.payments.empty)).toBeTruthy();
		expect(screen.queryByRole('list')).toBeNull();
	});

	it('announces loading and offers a retry on error', () => {
		show({});
		expect(screen.getByRole('status').textContent).toBe(sl.common.loading);
		cleanup();

		const refetch = vi.fn();
		show({ isError: true, refetch });
		fireEvent.click(screen.getByRole('button', { name: sl.common.inline_error_retry }));
		expect(refetch).toHaveBeenCalled();
	});
});
