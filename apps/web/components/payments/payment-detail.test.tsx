import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, it, type MockInstance, vi } from 'vitest';

import { paymentDetail } from '@zivali/api/__fixtures__/payments';
import type { PaymentView } from '@zivali/api/payments';
import en from '@zivali/i18n/dist/en.json';
import sl from '@zivali/i18n/dist/sl.json';

import { methodText, PaymentDetail } from './payment-detail';

const state = vi.hoisted(() => ({
	query: {} as {
		currentData?: object;
		isError?: boolean;
		error?: object;
		isFetching?: boolean;
		refetch?: () => void;
	},
	arg: undefined as unknown,
}));
vi.mock('@zivali/api/payments', () => ({
	useGetMyPaymentQuery: (arg: unknown) => {
		state.arg = arg;
		return state.query;
	},
	invoicePdfPath: (id: string) => `/v1/payments/${id}/invoice.pdf`,
}));
vi.mock('@/lib/store', () => ({ API_URL: 'https://api.test', accessToken: async () => 'token-1' }));

const p = sl.payments;
const ID = paymentDetail.id;

function show(
	query: typeof state.query,
	{ locale = 'sl' as 'sl' | 'en', testMode = false }: { locale?: 'sl' | 'en'; testMode?: boolean } = {}
) {
	state.query = query;
	return render(
		<NextIntlClientProvider locale={locale} messages={locale === 'en' ? en : sl}>
			<PaymentDetail id={ID} testMode={testMode} />
		</NextIntlClientProvider>
	);
}
const showPayment = (fields: Partial<PaymentView> = {}, options?: Parameters<typeof show>[1]) =>
	show({ currentData: { ...paymentDetail, ...fields } }, options);

/** The facts card as [label, value] pairs. */
const facts = () =>
	[...document.querySelectorAll('dl > div')].map((div) => [
		div.querySelector('dt')?.textContent,
		div.querySelector('dd')?.textContent?.replace(/\s/g, ' '),
	]);
const receipt = () => screen.queryByRole('region', { name: p.receipt });
const text = (value: string) => screen.queryAllByText(value, { normalizer: (s) => s.replace(/\s+/g, ' ').trim() });

afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});

describe('PaymentDetail', () => {
	it('paid, PDF ready: back link, purpose, amount, status, one test note, the facts and the receipt', () => {
		showPayment();
		expect(state.arg).toEqual({ id: ID });
		expect(screen.getByRole('link', { name: p.detail_back }).getAttribute('href')).toBe('/racun/placila');
		expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(p.purpose_tip);
		expect(text('5,00 €')[0].className).not.toContain('text-muted-foreground');
		expect(screen.getByText(p.status_paid)).toBeTruthy();
		expect(screen.getAllByText(p.detail_test_note)).toHaveLength(1);
		expect(facts()).toEqual([
			// 16:20 UTC is 18:20 in Ljubljana (CEST).
			[p.detail_date, '14. 10. 2026 ob 18:20'],
			[p.detail_method, 'Visa •••• 4242'],
		]);
		const section = within(receipt()!);
		expect(section.getByText('Račun št. 1-1-000123')).toBeTruthy();
		expect(section.getByRole('button', { name: p.receipt_download })).toBeTruthy();
		expect(section.getByText(p.receipt_test)).toBeTruthy();
		expect(section.queryByText(p.receipt_sent)).toBeNull();
	});

	it('paid, PDF not ready: one sentence and the email line, no button', () => {
		showPayment({ invoice: { ...paymentDetail.invoice!, pdf_ready: false } });
		const section = within(receipt()!);
		expect(section.getByText(p.receipt_pending)).toBeTruthy();
		expect(section.getByText(p.receipt_sent)).toBeTruthy();
		expect(section.queryByRole('button')).toBeNull();
		cleanup();

		// No invoice yet (TASK-32.8): only the email line; neither: no receipt section at all.
		showPayment({ invoice: null });
		expect(within(receipt()!).queryByText(p.receipt_pending)).toBeNull();
		expect(within(receipt()!).getByText(p.receipt_sent)).toBeTruthy();
		cleanup();
		showPayment({ invoice: null, receipt_sent_at: null });
		expect(receipt()).toBeNull();
		expect(screen.queryByRole('heading', { level: 2 })).toBeNull();
	});

	it('partly refunded: one status word, the paid and refunded amounts with the refund date', () => {
		showPayment({ amount_cents: 1000, refunded_cents: 200, refunded_at: '2026-10-16T09:00:00Z' });
		expect(screen.getByText(p.status_refunded_partial)).toBeTruthy();
		expect(facts().slice(2)).toEqual([
			[p.detail_paid, '10,00 €'],
			[p.detail_refunded, `2,00 € · 16. 10. 2026${p.detail_refund_note}`],
		]);
		expect(receipt()).toBeTruthy();
	});

	it('refunded: muted amount, "Vrnjeno", the refund without a date while the API has none', () => {
		showPayment({ status: 'refunded', refunded_cents: 500, refunded_at: undefined });
		// The status word under the amount; the facts card has its own "Vrnjeno" label.
		expect(text(p.status_refunded).map((el) => el.tagName)).toEqual(['SPAN', 'DT']);
		expect(text('5,00 €')[0].className).toContain('text-muted-foreground');
		expect(facts().at(-1)).toEqual([p.detail_refunded, `5,00 €${p.detail_refund_note}`]);
	});

	it('failed: muted amount, nothing charged, no receipt section', () => {
		showPayment({ status: 'failed', invoice: null, method: null });
		expect(screen.getByText(p.status_failed)).toBeTruthy();
		expect(screen.getByText(p.detail_failed)).toBeTruthy();
		expect(text('5,00 €')[0].className).toContain('text-muted-foreground');
		expect(facts().map(([label]) => label)).toEqual([p.detail_date]);
		expect(receipt()).toBeNull();
	});

	it('shows the test note from the payment’s own flag, the environment only while the API sends none', () => {
		showPayment({ test: false }, { testMode: true });
		expect(screen.queryByText(p.detail_test_note)).toBeNull();
		cleanup();
		showPayment({ test: undefined }, { testMode: true });
		expect(screen.getAllByText(p.detail_test_note)).toHaveLength(1);
	});

	it('loading: the back link at once and one polite status', () => {
		show({});
		expect(screen.getByRole('link', { name: p.detail_back })).toBeTruthy();
		expect(screen.getByRole('status').textContent).toBe(sl.common.loading);
	});

	it('not found: someone else’s, unknown or malformed id, and checkouts that are not payments', () => {
		for (const query of [
			{ isError: true, error: { status: 404, data: { code: 'NOT_FOUND' } } },
			{ isError: true, error: { status: 400, data: { code: 'VALIDATION' } } },
			{ currentData: { ...paymentDetail, status: 'pending' } },
		]) {
			show(query);
			expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(p.detail_not_found_title);
			expect(screen.getByText(p.detail_not_found_body)).toBeTruthy();
			expect(screen.getByRole('link', { name: p.detail_back })).toBeTruthy();
			cleanup();
		}
	});

	it('network error: the inline error with a retry', () => {
		const refetch = vi.fn();
		show({ isError: true, error: { status: 0, data: { code: 'NETWORK' } }, refetch });
		fireEvent.click(screen.getByRole('button', { name: sl.common.inline_error_retry }));
		expect(refetch).toHaveBeenCalled();
	});

	it('EN copy and route', () => {
		showPayment({}, { locale: 'en' });
		expect(screen.getByRole('link', { name: en.payments.detail_back }).getAttribute('href')).toBe(
			'/en/account/payments'
		);
		expect(facts()[0]).toEqual([en.payments.detail_date, '14/10/2026 at 18:20']);
	});

	describe('receipt download', () => {
		// jsdom has no object URLs and does not navigate; the clicked link is the spy's `this`.
		let click: MockInstance<HTMLAnchorElement['click']>;
		const saved = () => click.mock.contexts[0] as HTMLAnchorElement | undefined;
		beforeEach(() => {
			URL.createObjectURL = vi.fn(() => 'blob:receipt');
			URL.revokeObjectURL = vi.fn();
			click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
		});

		it('fetches the PDF with the session token and saves it as a file', async () => {
			const fetch = vi.fn(async () => ({ ok: true, blob: async () => new Blob(['%PDF']) }));
			vi.stubGlobal('fetch', fetch);
			showPayment();
			fireEvent.click(screen.getByRole('button', { name: p.receipt_download }));
			await waitFor(() => expect(saved()?.download).toBe('Potrdilo-1-1-000123.pdf'));
			expect(fetch).toHaveBeenCalledWith(`https://api.test/v1/payments/${ID}/invoice.pdf`, {
				headers: { Authorization: 'Bearer token-1' },
			});
			expect(saved()?.href).toBe('blob:receipt');
			expect(screen.queryByRole('alert')).toBeNull();
		});

		it('says so when the PDF cannot be loaded, and keeps the button', async () => {
			vi.stubGlobal(
				'fetch',
				vi.fn(async () => ({ ok: false, status: 404 }))
			);
			showPayment();
			fireEvent.click(screen.getByRole('button', { name: p.receipt_download }));
			expect((await screen.findByRole('alert')).textContent).toContain(sl.common.inline_error);
			expect(screen.getByRole('button', { name: p.receipt_download })).toBeTruthy();
			expect(saved()).toBeUndefined();
		});
	});
});

describe('methodText', () => {
	it('shows the brand and the last 4 digits only, the wallet in brackets, nothing without a method', () => {
		expect(methodText(paymentDetail.method)).toBe('Visa •••• 4242');
		expect(methodText({ type: 'card', brand: 'mastercard', last4: '4444', wallet: 'google_pay' })).toBe(
			'Mastercard •••• 4444 (Google Pay)'
		);
		expect(methodText({ type: 'link', brand: null, last4: null, wallet: null })).toBe('Link');
		expect(methodText({ type: 'other', brand: null, last4: null, wallet: null })).toBeNull();
		expect(methodText(null)).toBeNull();
		expect(methodText(undefined)).toBeNull();
	});
});
