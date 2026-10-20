import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { Provider } from 'react-redux';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getMockEvents, initAnalytics, resetMockEvents, setConsent } from '@zivali/analytics';
import { checkout as created } from '@zivali/api/__fixtures__/payments';
import { createMockApi, mockError, type MockHandler, type MockRequest, type MockRoutes } from '@zivali/api/mock';
import { createApiStore } from '@zivali/api/rtk';
import en from '@zivali/i18n/dist/en.json';
import sl from '@zivali/i18n/dist/sl.json';
import { formatEur } from '@zivali/i18n/format';

import { settlePayment } from './answers';
import { toCents } from './amount-ask';
import { ContributionRow, SupportCard, SupportTip } from './support';

// Radix radios inside a form measure their hidden input; jsdom has no ResizeObserver.
globalThis.ResizeObserver ??= class {
	observe() {}
	unobserve() {}
	disconnect() {}
} as unknown as typeof ResizeObserver;

const t = sl.support;
const REPORT = '7c1e4b2a-0000-4000-8000-000000000001';
const CODE = 'Hk3vT9qP';

// Counts loads of the payments client: no page ships it before Pay (TASK-33.2). The browser never leaves in a test.
const payments = vi.hoisted(() => ({ loads: 0, redirect: vi.fn() }));
vi.mock('@zivali/api/payments', async (actual) => {
	payments.loads++;
	return { ...(await actual<object>()), redirectToCheckout: payments.redirect };
});
const session = vi.hoisted(() => ({ current: { me: { id: 'u1' } as object | null, isAnonymous: false } }));
vi.mock('@zivali/api/auth', async (actual) => ({ ...(await actual<object>()), useSession: () => session.current }));

function show(ui: React.ReactNode, routes: MockRoutes = {}, locale: 'sl' | 'en' = 'sl') {
	const api = createMockApi({ 'POST /v1/payments/checkout': created, 'GET /v1/config/public': {}, ...routes });
	render(
		<NextIntlClientProvider locale={locale} messages={{ sl, en }[locale]}>
			<Provider store={createApiStore(api)}>{ui}</Provider>
		</NextIntlClientProvider>
	);
	return api;
}

const tip = (testMode = false) => <SupportTip reportId={REPORT} code={CODE} testMode={testMode} />;
const radio = (name: string) => screen.getByRole('radio', { name });
const button = (name: string) => screen.getByRole('button', { name }) as HTMLButtonElement;
const checkouts = (api: { calls: MockRequest[] }) =>
	api.calls.filter((call) => call.method === 'POST' && call.path === '/v1/payments/checkout');
const keyOf = (call: MockRequest) => call.headers['Idempotency-Key'];
/** formatEur as the button shows it (Intl puts a no-break space before €). */
const eur = (cents: number) => formatEur(cents, 'sl');

beforeEach(() => {
	initAnalytics();
	setConsent({ analytics: true });
	resetMockEvents();
});
afterEach(() => {
	cleanup();
	vi.clearAllMocks();
	sessionStorage.clear();
	session.current = { me: { id: 'u1' }, isAnonymous: false };
});

describe('reunited tip (P15)', () => {
	it('3, 5 (suggested, not chosen), 10 € or another amount; Pay waits, Skip as visible; then Checkout (AC#1)', async () => {
		const api = show(tip());

		expect(screen.getByRole('heading', { level: 2, name: t.tip_title })).toBeTruthy();
		expect(screen.getByText(t.tip_body)).toBeTruthy();
		const group = await screen.findByRole('radiogroup', { name: t.amount_group });
		expect(
			[...group.querySelectorAll('[role=radio]')].map(
				(pill) => pill.getAttribute('aria-label') ?? pill.textContent
			)
		).toEqual(['3 €', `5 €, ${t.amount_suggested_a11y}`, '10 €', t.amount_other]);
		expect(screen.queryByRole('radio', { checked: true })).toBeNull();
		// The suggestion is a visible muted label, and the pill has no selected styling.
		expect(screen.getByText(t.amount_suggested_label)).toBeTruthy();
		expect(radio(`5 €, ${t.amount_suggested_a11y}`).className).not.toMatch(/inset-ring/);
		const pay = button(t.pay_disabled);
		const skip = button(t.skip);
		expect(pay.disabled).toBe(true);
		expect(document.getElementById(pay.getAttribute('aria-describedby')!)?.textContent).toBe(t.pay_disabled_help);
		// Same variant and size: Skip is exactly as visible as Pay.
		expect([skip.dataset.variant, skip.dataset.size]).toEqual([pay.dataset.variant, pay.dataset.size]);
		expect(skip.disabled).toBe(false);
		expect(screen.getByText(t.not_donation_note)).toBeTruthy();
		expect(screen.queryByText(t.test_note)).toBeNull();
		// Nothing about payments has loaded yet.
		expect(payments.loads).toBe(0);

		fireEvent.click(radio(`5 €, ${t.amount_suggested_a11y}`));
		fireEvent.click(button(`Plačaj ${eur(500)}`));
		await waitFor(() => expect(payments.redirect).toHaveBeenCalledWith(created.checkout_url));
		expect(payments.loads).toBe(1);
		const [call] = checkouts(api);
		expect(call!.body).toEqual({
			purpose: 'tip',
			amount_cents: 500,
			refs: { report_id: REPORT },
			locale: 'sl',
			return_to: `/r/${CODE}/spet-doma`,
		});
		expect(keyOf(call!)).toMatch(/^[0-9a-f-]{36}$/);
	});

	it('another amount: at least 2 € and at most 500 €, "2,5" reads as 2,50 €, integer cents', async () => {
		const api = show(tip());
		fireEvent.click(await screen.findByRole('radio', { name: t.amount_other }));
		const field = screen.getByLabelText(t.amount_other_label);

		fireEvent.change(field, { target: { value: '1,50' } });
		fireEvent.blur(field);
		expect(screen.getByText(t.amount_min_error)).toBeTruthy();
		expect(field.getAttribute('aria-invalid')).toBe('true');
		expect(button(t.pay_disabled).disabled).toBe(true);

		fireEvent.change(field, { target: { value: '600' } });
		expect(screen.getByText(t.amount_max_error)).toBeTruthy();

		fireEvent.change(field, { target: { value: '2,5' } });
		expect(screen.queryByRole('alert')).toBeNull();
		fireEvent.click(button(`Plačaj ${eur(250)}`));
		await waitFor(() => expect(checkouts(api)).toHaveLength(1));
		expect(checkouts(api)[0]!.body).toMatchObject({ amount_cents: 250 });
	});

	it('only plain decimals with at most two places are amounts', () => {
		expect([toCents('2,5'), toCents('2.55'), toCents(' 10 '), toCents('3,00')]).toEqual([250, 255, 1000, 300]);
		for (const text of ['1e2', '0x10', '1_0', '2,555', '-3', '', ',5']) expect(toCents(text)).toBeUndefined();
	});

	it('a failed attempt shows the error with Poskusi znova in its place; the retry keeps the key, a new amount gets a new one', async () => {
		let fail = true;
		const api = show(tip(), {
			'POST /v1/payments/checkout': () => {
				if (fail) throw new TypeError('Failed to fetch');
				return created;
			},
		});
		fireEvent.click(await screen.findByRole('radio', { name: '10 €' }));
		fireEvent.click(button(`Plačaj ${eur(1000)}`));
		expect((await screen.findByRole('alert')).textContent).toBe(sl.errors.NETWORK);
		// The skip stays open while it fails.
		expect(button(t.skip).disabled).toBe(false);

		fireEvent.click(button(sl.common.try_again));
		await waitFor(() => expect(checkouts(api)).toHaveLength(2));
		const [first, second] = checkouts(api);
		expect(keyOf(second!)).toBe(keyOf(first!));

		fail = false;
		fireEvent.click(radio('3 €'));
		expect(screen.queryByRole('alert')).toBeNull();
		fireEvent.click(button(`Plačaj ${eur(300)}`));
		await waitFor(() => expect(payments.redirect).toHaveBeenCalled());
		expect(keyOf(checkouts(api)[2]!)).not.toBe(keyOf(first!));
	});

	it('Preskoči moves focus to the next stable element before the ask goes (WCAG 2.4.3)', async () => {
		show(
			<>
				<SupportTip reportId={REPORT} code={CODE} testMode={false} skipFocusId="done" />
				<a id="done" href="#top">
					done
				</a>
			</>
		);
		fireEvent.click(await screen.findByRole('button', { name: t.skip }));
		expect(document.activeElement).toBe(document.getElementById('done'));
		expect(screen.queryByRole('heading', { name: t.tip_title })).toBeNull();
	});

	it('Pay stops spinning when Back from Checkout restores the page from the bfcache', async () => {
		show(tip());
		fireEvent.click(await screen.findByRole('radio', { name: '10 €' }));
		fireEvent.click(button(`Plačaj ${eur(1000)}`));
		await waitFor(() => expect(payments.redirect).toHaveBeenCalled());
		const pay = button(`Plačaj ${eur(1000)}`);
		expect(pay.getAttribute('aria-busy')).toBe('true');
		fireEvent(window, new PageTransitionEvent('pageshow', { persisted: false }));
		expect(pay.getAttribute('aria-busy')).toBe('true');
		fireEvent(window, new PageTransitionEvent('pageshow', { persisted: true }));
		await waitFor(() => expect(pay.getAttribute('aria-busy')).toBeNull());
	});

	it('Skip removes the ask and it stays gone for that report; a payment leaves the thank-you line', async () => {
		show(tip());
		fireEvent.click(await screen.findByRole('button', { name: t.skip }));
		expect(screen.queryByRole('heading', { name: t.tip_title })).toBeNull();
		cleanup();
		show(tip());
		expect(screen.queryByRole('heading', { name: t.tip_title })).toBeNull();
		cleanup();

		// Another report asks again; once its checkout succeeded (the return page settles it) it says thanks.
		const api = show(<SupportTip reportId={REPORT} code="Other123" testMode={false} />);
		fireEvent.click(await screen.findByRole('radio', { name: '3 €' }));
		fireEvent.click(button(`Plačaj ${eur(300)}`));
		await waitFor(() => expect(payments.redirect).toHaveBeenCalled());
		expect(checkouts(api)).toHaveLength(1);
		expect(settlePayment(created.payment_id)).toBe(true);
		expect(await screen.findByText(t.already_paid)).toBeTruthy();
		expect(screen.queryByRole('heading', { name: t.tip_title })).toBeNull();
	});

	it('shows the test-payment note outside production, and reads in English', async () => {
		show(tip(true), {}, 'en');
		expect(await screen.findByText(en.support.test_note)).toBeTruthy();
		expect(screen.getByRole('button', { name: en.support.skip })).toBeTruthy();
	});
});

describe('Profile card (purpose support, AC#3)', () => {
	it('"Pomagajte nam izboljšati Najdimo" with the same amounts, no Skip and no monthly option by default', async () => {
		const api = show(<SupportCard testMode={false} />);
		expect(screen.getByRole('heading', { level: 2, name: t.card_title })).toBeTruthy();
		fireEvent.click(await screen.findByRole('radio', { name: '10 €' }));
		expect(screen.queryByRole('button', { name: t.skip })).toBeNull();
		await waitFor(() => expect(api.calls.some((call) => call.path === '/v1/config/public')).toBe(true));
		expect(screen.queryByRole('checkbox')).toBeNull();
		fireEvent.click(button(`Plačaj ${eur(1000)}`));
		await waitFor(() => expect(checkouts(api)).toHaveLength(1));
		expect(checkouts(api)[0]!.body).toEqual({
			purpose: 'support',
			amount_cents: 1000,
			locale: 'sl',
			return_to: '/racun/placila',
		});
	});

	it('the monthly Podpornik option only with flags.supporter_monthly: unticked, then "na mesec"', async () => {
		const api = show(<SupportCard testMode={false} />, {
			'GET /v1/config/public': { 'flags.supporter_monthly': true },
		});
		const monthly = await screen.findByRole('checkbox', { name: t.supporter_monthly_label });
		expect(monthly.getAttribute('aria-checked')).toBe('false');
		fireEvent.click(radio('3 €'));
		fireEvent.click(monthly);
		// C13 forbids an amount for a subscription, so the button does not promise one.
		fireEvent.click(button(t.supporter_monthly_label));
		await waitFor(() => expect(checkouts(api)).toHaveLength(1));
		expect(checkouts(api)[0]!.body).toEqual({ purpose: 'subscription', locale: 'sl', return_to: '/racun/placila' });
	});
});

describe('contribution row at the lost confirmation (AC#2)', () => {
	const row = (reportId?: string) => <ContributionRow reportId={reportId} code={CODE} testMode />;

	it('collapsed by default; open, 2, 3 and 5 € with none chosen, Prispevaj and Skrij side by side', async () => {
		const api = show(row(REPORT));
		const toggle = screen.getByRole('button', { name: `${t.contribution_row}. ${t.contribution_expand_a11y}` });
		expect(toggle.getAttribute('aria-expanded')).toBe('false');
		expect(screen.queryByRole('radiogroup')).toBeNull();

		fireEvent.click(toggle);
		expect(toggle.getAttribute('aria-expanded')).toBe('true');
		expect(screen.getByText(t.contribution_body)).toBeTruthy();
		const group = await screen.findByRole('radiogroup', { name: t.amount_group });
		expect([...group.querySelectorAll('[role=radio]')].map((pill) => pill.textContent)).toEqual([
			'2 €',
			'3 €',
			'5 €',
		]);
		expect(screen.queryByRole('radio', { checked: true })).toBeNull();
		expect(button(t.contribution_pay_disabled).disabled).toBe(true);
		expect(screen.getByText(t.test_note)).toBeTruthy();
		// The tip's monthly option is not offered here (the public config is read for payments.enabled only).
		expect(screen.queryByRole('checkbox')).toBeNull();

		fireEvent.click(radio('3 €'));
		fireEvent.click(button(`Prispevaj ${eur(300)}`));
		await waitFor(() => expect(checkouts(api)).toHaveLength(1));
		expect(checkouts(api)[0]!.body).toEqual({
			purpose: 'report_contribution',
			amount_cents: 300,
			refs: { report_id: REPORT },
			locale: 'sl',
			return_to: `/r/${CODE}`,
		});
	});

	it('Skrij records the skip: the row is not shown again for that report', async () => {
		show(row(REPORT));
		fireEvent.click(screen.getByRole('button', { name: new RegExp(t.contribution_row) }));
		fireEvent.click(await screen.findByRole('button', { name: t.contribution_hide }));
		expect(screen.queryByText(t.contribution_row)).toBeNull();
		cleanup();
		show(row(REPORT));
		expect(screen.queryByText(t.contribution_row)).toBeNull();
	});

	it('Skrij moves focus to the next stable element before the row goes (WCAG 2.4.3)', async () => {
		show(
			<>
				<a id="above" href="#top">
					above
				</a>
				<ContributionRow reportId={REPORT} code={CODE} testMode skipFocusId="above" />
			</>
		);
		fireEvent.click(screen.getByRole('button', { name: new RegExp(t.contribution_row) }));
		fireEvent.click(await screen.findByRole('button', { name: t.contribution_hide }));
		expect(document.activeElement).toBe(document.getElementById('above'));
	});

	it('Pay waits while the report loads', async () => {
		show(row());
		fireEvent.click(screen.getByRole('button', { name: new RegExp(t.contribution_row) }));
		fireEvent.click(await screen.findByRole('radio', { name: '2 €' }));
		expect(button(`Prispevaj ${eur(200)}`).disabled).toBe(true);
	});

	it('a signed-out visitor or an anonymous finder sees no ask (AC#4)', () => {
		session.current = { me: null, isAnonymous: false };
		show(row(REPORT));
		expect(screen.queryByText(t.contribution_row)).toBeNull();
		cleanup();
		session.current = { me: { id: 'anon' }, isAnonymous: true };
		show(row(REPORT));
		expect(screen.queryByText(t.contribution_row)).toBeNull();
	});
});

describe('payments off on the API (payments.enabled false, PAYMENTS_PROVIDER=off, TASK-76.1)', () => {
	it('the tip, the Profile card and the contribution row hide themselves; nothing reaches checkout', async () => {
		const api = show(
			<>
				{tip()}
				<SupportCard testMode={false} />
				<ContributionRow reportId={REPORT} code={CODE} testMode={false} />
			</>,
			{ 'GET /v1/config/public': { 'payments.enabled': false } }
		);
		await waitFor(() => expect(screen.queryByRole('heading', { name: t.tip_title })).toBeNull());
		expect(screen.queryByRole('heading', { name: t.card_title })).toBeNull();
		expect(screen.queryByText(t.contribution_row)).toBeNull();
		expect(checkouts(api)).toEqual([]);
	});
});

describe('checkout analytics (C12b §6, mock adapter)', () => {
	/** What reached the mock adapter (C12): only events sent with analytics consent. */
	const events = () => getMockEvents().map(({ name, params }) => [name, params]);
	const amount = ['flow_step', { flow: 'checkout', step: 'amount' }];
	const refused = (error_code: string) => ['flow_error', { flow: 'checkout', step: 'amount', error_code }];

	it('flow_step amount when the tip shows; begin_checkout with value, currency and purpose right before Checkout', async () => {
		let atRedirect: unknown[] = [];
		payments.redirect.mockImplementationOnce(() => (atRedirect = events()));
		show(tip());
		fireEvent.click(await screen.findByRole('radio', { name: '10 €' }));
		expect(events()).toEqual([amount]);
		fireEvent.click(button(`Plačaj ${eur(1000)}`));
		await waitFor(() => expect(payments.redirect).toHaveBeenCalled());
		// No payment id, transaction_id or items.
		expect(atRedirect).toEqual([amount, ['begin_checkout', { value: 10, currency: 'EUR', purpose: 'tip' }]]);
	});

	it('the contribution row sends flow_step amount only once it opens, then begin_checkout report_contribution', async () => {
		show(<ContributionRow reportId={REPORT} code={CODE} testMode={false} />);
		expect(events()).toEqual([]);
		fireEvent.click(screen.getByRole('button', { name: new RegExp(t.contribution_row) }));
		fireEvent.click(await screen.findByRole('radio', { name: '2 €' }));
		expect(events()).toEqual([amount]);
		fireEvent.click(button(`Prispevaj ${eur(200)}`));
		await waitFor(() => expect(payments.redirect).toHaveBeenCalled());
		expect(events().at(-1)).toEqual([
			'begin_checkout',
			{ value: 2, currency: 'EUR', purpose: 'report_contribution' },
		]);
	});

	it.each<[string, MockHandler]>([
		['MIN_AMOUNT', () => mockError('MIN_AMOUNT')],
		['VALIDATION', () => mockError('VALIDATION')],
		[
			'NETWORK',
			() => {
				throw new TypeError('Failed to fetch');
			},
		],
	])('a refused start sends flow_error amount %s once per attempt, and no begin_checkout', async (code, answer) => {
		show(tip(), { 'POST /v1/payments/checkout': answer });
		fireEvent.click(await screen.findByRole('radio', { name: '3 €' }));
		fireEvent.click(button(`Plačaj ${eur(300)}`));
		await screen.findByRole('alert');
		fireEvent.click(button(sl.common.try_again));
		await waitFor(() => expect(events()).toHaveLength(3));
		expect(events()).toEqual([amount, refused(code), refused(code)]);
	});

	it('the monthly Podpornik: SERVICE_UNAVAILABLE until M4, then begin_checkout subscription with the chosen amount', async () => {
		let fail = true;
		show(<SupportCard testMode={false} />, {
			'GET /v1/config/public': { 'flags.supporter_monthly': true },
			'POST /v1/payments/checkout': () => (fail ? mockError('SERVICE_UNAVAILABLE') : created),
		});
		const monthly = await screen.findByRole('checkbox', { name: t.supporter_monthly_label });
		fireEvent.click(radio('3 €'));
		fireEvent.click(monthly);
		fireEvent.click(button(t.supporter_monthly_label));
		expect(await screen.findByText(sl.payments.premium_unavailable)).toBeTruthy();
		fail = false;
		fireEvent.click(button(sl.common.try_again));
		await waitFor(() => expect(payments.redirect).toHaveBeenCalled());
		expect(events()).toEqual([
			amount,
			refused('SERVICE_UNAVAILABLE'),
			['begin_checkout', { value: 3, currency: 'EUR', purpose: 'subscription' }],
		]);
	});

	it('sends nothing without analytics consent', async () => {
		setConsent({ analytics: false });
		let fail = true;
		show(tip(), { 'POST /v1/payments/checkout': () => (fail ? mockError('MIN_AMOUNT') : created) });
		fireEvent.click(await screen.findByRole('radio', { name: '3 €' }));
		fireEvent.click(button(`Plačaj ${eur(300)}`));
		await screen.findByRole('alert');
		fail = false;
		fireEvent.click(button(sl.common.try_again));
		await waitFor(() => expect(payments.redirect).toHaveBeenCalled());
		expect(getMockEvents()).toEqual([]);
	});
});
