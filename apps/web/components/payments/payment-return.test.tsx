import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getMockEvents, initAnalytics, resetMockEvents, setConsent } from '@zivali/analytics';
import { payment } from '@zivali/api/__fixtures__/payments';
import { ApiError } from '@zivali/api/client';
import sl from '@zivali/i18n/dist/sl.json';
import type { Payment } from '@zivali/types';

import { rememberPayment, settlePayment } from './answers';
import { PaymentReturn } from './payment-return';

const state = vi.hoisted(() => ({
	query: {} as { data?: object; isError?: boolean; isFetching?: boolean; refetch?: () => void },
	options: undefined as unknown,
	gate: 'ok',
	startCheckout: vi.fn(),
	redirectToCheckout: vi.fn(),
}));
vi.mock('@zivali/api/payments', () => ({
	useGetPaymentQuery: (_arg: unknown, options: unknown) => {
		state.options = options;
		return state.query;
	},
	startCheckout: state.startCheckout,
	redirectToCheckout: state.redirectToCheckout,
}));
vi.mock('@zivali/api/auth', () => ({ useRequireAuth: () => ({ gate: state.gate }) }));
vi.mock('@/i18n/navigation', () => ({
	Link: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}));
vi.mock('react-redux', () => ({ useDispatch: () => 'dispatch' }));

const RETURN_TO = '/r/Hk3vT9qP/spet-doma';

function show(data?: Partial<Payment>, { canceled = false } = {}) {
	state.query = { data: data && { ...payment, ...data }, refetch: vi.fn() };
	return render(
		<NextIntlClientProvider locale="sl" messages={sl}>
			<PaymentReturn paymentId={payment.id} returnTo={RETURN_TO} canceled={canceled} />
		</NextIntlClientProvider>
	);
}

const heading = () => screen.getByRole('heading', { level: 1 });
/** What reached the mock adapter (C12): only events sent with analytics consent. */
const events = () => getMockEvents().map(({ name, params }) => [name, params]);
const returned = ['flow_step', { flow: 'checkout', step: 'return' }];

beforeEach(() => {
	initAnalytics();
	setConsent({ analytics: true });
	resetMockEvents();
});
afterEach(() => {
	cleanup();
	vi.clearAllMocks();
	sessionStorage.clear();
	state.gate = 'ok';
});

describe('PaymentReturn', () => {
	it('waits for the webhook: pending, announced, polling, focus on the heading', () => {
		show();
		expect(heading().textContent).toBe(sl.payments.pending_title);
		expect(document.activeElement).toBe(heading());
		expect(screen.getByRole('status').textContent).toContain(sl.payments.pending_body);
		expect(state.options).toMatchObject({ pollingInterval: 3000 });
		expect(screen.getByRole('link', { name: sl.payments.pending_back }).getAttribute('href')).toBe(RETURN_TO);
	});

	it('keeps polling with a retry when the read fails', () => {
		state.query = { isError: true, refetch: vi.fn() };
		render(
			<NextIntlClientProvider locale="sl" messages={sl}>
				<PaymentReturn paymentId={payment.id} returnTo={RETURN_TO} canceled={false} />
			</NextIntlClientProvider>
		);
		fireEvent.click(screen.getByRole('button', { name: sl.common.inline_error_retry }));
		expect(state.query.refetch).toHaveBeenCalled();
	});

	it('thanks on success, stops polling, sets the title and goes back to the report', () => {
		show({ status: 'succeeded' });
		expect(heading().textContent).toBe(sl.payments.success_title);
		expect(document.activeElement).toBe(heading());
		expect(document.title).toBe(`${sl.payments.success_title} · Najdimo`);
		expect(screen.getByText(sl.payments.success_body)).toBeTruthy();
		expect(state.options).toMatchObject({ pollingInterval: 0 });
		expect(screen.getByRole('link', { name: sl.payments.success_back }).getAttribute('href')).toBe(RETURN_TO);
	});

	it('sends flow_step return, purchase and donation once on success, value, currency and purpose only (C12b §6)', () => {
		rememberPayment(payment.id, 'tip:Hk3vT9qP');
		show({ status: 'succeeded', amount_cents: 1000 });
		// No payment id, transaction_id or items.
		expect(events()).toEqual([
			returned,
			['purchase', { value: 10, currency: 'EUR', purpose: 'tip' }],
			['donation', { value: 10, currency: 'EUR', amount_bucket: '10-19', purpose: 'tip' }],
		]);
		expect(sessionStorage.getItem('zz_support:tip:Hk3vT9qP')).toBe('paid');
		// A reload of the return page sends nothing again.
		cleanup();
		show({ status: 'succeeded', amount_cents: 1000 });
		expect(events()).toHaveLength(3);
	});

	it.each([
		[200, 'report_contribution', '2-4'],
		[500, 'support', '5-9'],
		[2500, 'tip', '20+'],
	] as const)('bands %i cents of %s as %s', (amount_cents, purpose, amount_bucket) => {
		show({ status: 'succeeded', amount_cents, purpose });
		const value = amount_cents / 100;
		expect(events()).toEqual([
			returned,
			['purchase', { value, currency: 'EUR', purpose }],
			['donation', { value, currency: 'EUR', amount_bucket, purpose }],
		]);
	});

	it('a Podpornik subscription sends purchase and supporter_subscribe, no donation', () => {
		show({ status: 'succeeded', amount_cents: 300, purpose: 'subscription' });
		expect(events()).toEqual([
			returned,
			['purchase', { value: 3, currency: 'EUR', purpose: 'subscription' }],
			['supporter_subscribe', { value: 3, currency: 'EUR' }],
		]);
	});

	it('sends only flow_step return while pending; the same payment settling later adds purchase, no donation for a fixed price', () => {
		show({ status: 'pending' });
		expect(events()).toEqual([returned]);
		cleanup();
		show({ status: 'succeeded', purpose: 'boost', amount_cents: 499 });
		expect(events()).toEqual([returned, ['purchase', { value: 4.99, currency: 'EUR', purpose: 'boost' }]]);
	});

	it.each([
		['failed', {}, 'payment_failed'],
		['canceled', {}, 'canceled'],
		['pending', { canceled: true }, 'canceled'],
	] as const)('a %s payment sends flow_error return %s once', (status, options, code) => {
		show({ status }, options);
		const refused = ['flow_error', { flow: 'checkout', step: 'return', error_code: code }];
		expect(events()).toEqual([returned, refused]);
		cleanup();
		show({ status }, options);
		expect(events()).toEqual([returned, refused]);
	});

	it('sends nothing without analytics consent', () => {
		setConsent({ analytics: false });
		for (const status of ['succeeded', 'failed', 'canceled'] as const) {
			show({ status });
			cleanup();
		}
		expect(getMockEvents()).toEqual([]);
	});

	it('says the receipt waits for a confirmed address', () => {
		state.gate = 'verify';
		show({ status: 'succeeded' });
		expect(screen.getByText(sl.support.unverified)).toBeTruthy();
		expect(screen.queryByText(sl.payments.success_body)).toBeNull();
	});

	it('shows the cancelled state from the cancel URL without polling, and retries the same payment', async () => {
		state.startCheckout.mockResolvedValue({ paymentId: 'p2', checkoutUrl: 'https://checkout.test/p2' });
		show({ status: 'pending' }, { canceled: true });
		expect(heading().textContent).toBe(sl.payments.cancel_title);
		expect(screen.getByText(sl.payments.cancel_body)).toBeTruthy();
		expect(state.options).toMatchObject({ pollingInterval: 0 });
		expect(screen.getByRole('link', { name: sl.payments.cancel_back }).getAttribute('href')).toBe(RETURN_TO);

		let atRedirect: unknown[] = [];
		state.redirectToCheckout.mockImplementationOnce(() => (atRedirect = events()));
		fireEvent.click(screen.getByRole('button', { name: sl.payments.cancel_retry }));
		await vi.waitFor(() => expect(state.redirectToCheckout).toHaveBeenCalledWith('https://checkout.test/p2'));
		// begin_checkout right before the redirect, also on Retry.
		expect(atRedirect.at(-1)).toEqual(['begin_checkout', { value: 5, currency: 'EUR', purpose: 'tip' }]);
		expect(state.startCheckout).toHaveBeenCalledWith('dispatch', {
			purpose: 'tip',
			amountCents: 500,
			returnTo: RETURN_TO,
			locale: 'sl',
		});
	});

	it('links the retry checkout to the ask the cancelled one answered, so a later success closes it', async () => {
		state.startCheckout.mockResolvedValue({ paymentId: 'p2', checkoutUrl: 'https://checkout.test/p2' });
		rememberPayment(payment.id, 'tip:Hk3vT9qP');
		show({ status: 'pending' }, { canceled: true });
		fireEvent.click(screen.getByRole('button', { name: sl.payments.cancel_retry }));
		await vi.waitFor(() => expect(state.redirectToCheckout).toHaveBeenCalled());
		expect(settlePayment('p2')).toBe(true);
		expect(sessionStorage.getItem('zz_support:tip:Hk3vT9qP')).toBe('paid');
	});

	it('explains a declined card calmly, retry first, skip back; a failed retry says why', async () => {
		state.startCheckout.mockRejectedValue(new ApiError('NETWORK', 'offline'));
		show({ status: 'failed' });
		expect(heading().textContent).toBe(sl.payments.failed_title);
		expect(screen.getByText(sl.payments.failed_body)).toBeTruthy();
		expect(screen.getByRole('link', { name: sl.payments.failed_skip }).getAttribute('href')).toBe(RETURN_TO);

		fireEvent.click(screen.getByRole('button', { name: sl.payments.failed_retry }));
		expect((await screen.findByRole('alert')).textContent).toBe(sl.errors.NETWORK);
		expect(state.redirectToCheckout).not.toHaveBeenCalled();
		expect(events().map(([name]) => name)).not.toContain('begin_checkout');
	});

	it('sends a report contribution back to its report to try again (the read has no report id)', () => {
		show({ status: 'failed', purpose: 'report_contribution' });
		expect(screen.getByRole('link', { name: sl.payments.failed_retry }).getAttribute('href')).toBe(RETURN_TO);
	});

	it('lets the server status win over the cancel hint, which only covers a pending payment', () => {
		show({ status: 'succeeded' }, { canceled: true });
		expect(heading().textContent).toBe(sl.payments.success_title);
		cleanup();
		show({ status: 'failed' }, { canceled: true });
		expect(heading().textContent).toBe(sl.payments.failed_title);
	});

	it('offers retry only for user-amount purposes', () => {
		show({ status: 'failed', purpose: 'boost' });
		expect(screen.queryByRole('button', { name: sl.payments.failed_retry })).toBeNull();
		expect(screen.queryByRole('link', { name: sl.payments.failed_retry })).toBeNull();
		cleanup();
		show({ status: 'canceled', purpose: 'subscription' });
		expect(screen.queryByRole('button', { name: sl.payments.cancel_retry })).toBeNull();
		cleanup();
		show({ status: 'failed', purpose: 'support' });
		expect(screen.getByRole('button', { name: sl.payments.failed_retry })).toBeTruthy();
	});

	it('stops polling after 90 s and points to My payments', () => {
		vi.useFakeTimers();
		try {
			show({ status: 'pending' });
			expect(state.options).toMatchObject({ pollingInterval: 3000 });
			expect(screen.queryByText(sl.payments.pending_slow)).toBeNull();
			act(() => {
				vi.advanceTimersByTime(90_000);
			});
			expect(state.options).toMatchObject({ pollingInterval: 0 });
			expect(heading().textContent).toBe(sl.payments.pending_title);
			expect(screen.getByText(sl.payments.pending_slow)).toBeTruthy();
			expect(screen.getByRole('link', { name: sl.payments.pending_payments }).getAttribute('href')).toBe(
				'/account/payments'
			);
			expect(events()).toEqual([
				returned,
				['flow_error', { flow: 'checkout', step: 'return', error_code: 'timeout' }],
			]);
		} finally {
			vi.useRealTimers();
		}
	});
});
