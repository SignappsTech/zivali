import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { payment } from '@zivali/api/__fixtures__/payments';
import type { PaymentView } from '@zivali/api/payments';
import en from '@zivali/i18n/dist/en.json';
import sl from '@zivali/i18n/dist/sl.json';

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

const row = (n: number, fields: Partial<PaymentView>): PaymentView => ({ ...payment, id: `p${n}`, ...fields });
const items = [
	row(1, { amount_cents: 500, created_at: '2026-10-15T10:00:00Z' }),
	row(2, { purpose: 'report_contribution', status: 'failed', amount_cents: 300, created_at: '2026-10-02T10:00:00Z' }),
	row(3, { status: 'pending', created_at: '2026-10-01T10:00:00Z' }),
	row(4, { status: 'canceled', created_at: '2026-10-01T10:00:00Z' }),
	row(5, { purpose: 'support', status: 'refunded', amount_cents: 1000, created_at: '2026-09-18T10:00:00Z' }),
	// A partial refund keeps the payment paid; the row says so in one status word (P15 Q5), the amounts are in the detail.
	row(6, { amount_cents: 1000, refunded_cents: 300, created_at: '2026-09-10T10:00:00Z' }),
];

function show(query: typeof state.query, { locale = 'sl' as 'sl' | 'en', testMode = false } = {}) {
	state.query = query;
	return render(
		<NextIntlClientProvider locale={locale} messages={locale === 'en' ? en : sl}>
			<PaymentsList testMode={testMode} />
		</NextIntlClientProvider>
	);
}

const links = () =>
	screen.queryAllByRole('link').map((a) => [a.getAttribute('href'), a.textContent?.replace(/\s/g, ' ')]);
const testNotes = (catalogue = sl) => screen.queryAllByText(catalogue.payments.test_note_list);

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

describe('PaymentsList', () => {
	it('shows one card row per settled payment, each one link to its detail; skips pending and cancelled', () => {
		show({ data: { items, next_cursor: null } });
		expect(state.arg).toEqual({ limit: 50 });
		expect(screen.getByRole('list', { name: sl.payments.list_title })).toBeTruthy();
		// Purpose, date, amount, status word, in that order (the link's name).
		expect(links()).toEqual([
			['/racun/placila/p1', 'Prispevek v zahvalo15. 10. 20265,00 €Plačano'],
			['/racun/placila/p2', 'Prispevek ob prijavi2. 10. 20263,00 €Neuspešno'],
			['/racun/placila/p5', 'Podpora za Najdimo18. 9. 202610,00 €Vrnjeno'],
			['/racun/placila/p6', 'Prispevek v zahvalo10. 9. 202610,00 €Delno vrnjeno'],
		]);
		// Failed and fully refunded amounts are muted; the receipt lives in the detail (TASK-32.9 moved there).
		expect(screen.getByText('3,00 €').className).toContain('text-muted-foreground');
		expect(screen.getByText('5,00 €').className).toContain('font-bold');
		expect(screen.queryByRole('button')).toBeNull();
		expect(screen.queryByText(sl.payments.receipt_download)).toBeNull();
		expect(screen.queryByText(sl.payments.test_label)).toBeNull();
	});

	it('formats for EN', () => {
		show({ data: { items: items.slice(0, 1), next_cursor: null } }, { locale: 'en' });
		expect(links()).toEqual([['/en/account/payments/p1', 'Thank-you contribution15/10/2026€5.00Paid']]);
	});

	it('puts one test note above the list from the payments’ own flag (CH-702), not one label per row', () => {
		show({ data: { items: items.map((item) => ({ ...item, test: true })), next_cursor: null } });
		expect(testNotes()).toHaveLength(1);
		cleanup();

		// The payment's flag wins over the environment ...
		show(
			{ data: { items: items.map((item) => ({ ...item, test: false })), next_cursor: null } },
			{ testMode: true }
		);
		expect(testNotes()).toHaveLength(0);
		cleanup();

		// ... which decides only while the API sends no flag.
		show({ data: { items, next_cursor: null } }, { testMode: true, locale: 'en' });
		expect(testNotes(en)).toHaveLength(1);
	});

	it('says so when there is nothing to list, without a test note', () => {
		show({ data: { items: items.slice(2, 4), next_cursor: null } }, { testMode: true });
		expect(screen.getByText(sl.payments.empty)).toBeTruthy();
		expect(screen.queryByRole('list')).toBeNull();
		expect(testNotes()).toHaveLength(0);
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
