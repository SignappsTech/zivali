// Loads the jest.setup Reanimated mock (with useReducedMotion) before expo-router's testing mocks register their own.
import 'react-native-reanimated';

import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Stack } from 'expo-router';
import { renderRouter } from 'expo-router/testing-library';
import type { ReactNode } from 'react';
import { Provider } from 'react-redux';
import { IntlProvider } from 'use-intl';

import { getMockEvents, initAnalytics, resetMockEvents, setConsent } from '@zivali/analytics';
import { checkout, payment } from '@zivali/api/__fixtures__/payments';
import { createMockApi, type MockRequest, type MockRoutes, mockError } from '@zivali/api/mock';
import { type ApiStore, createApiStore, api as rtk } from '@zivali/api/rtk';
import sl from '@zivali/i18n/dist/sl.json';
import type { Payment } from '@zivali/types';
import { redirectSystemPath } from '@/app/+native-intent';
import PaymentReturn from '@/app/payments/return';
import PaymentsSettings from '@/app/settings/payments';
import { type Checkout, CheckoutSheet } from '@/components/payments/checkout';
import { payInBrowser } from '@/lib/checkout';

// The in-app browser: each test says how the checkout comes back. No Stripe or network call leaves the test.
const mockOpenAuthSession = jest.fn();
jest.mock('expo-web-browser', () => ({
	openAuthSessionAsync: (...args: unknown[]) => mockOpenAuthSession(...args),
}));
jest.mock('@/lib/env', () => ({ env: { EXPO_PUBLIC_APP_URL: 'https://najdimo.test', EXPO_PUBLIC_APP_ENV: 'local' } }));
jest.mock('@/lib/supabase', () => ({ supabase: { auth: {} } }));
const mockSession = { isVerified: true, gate: 'ok' };
jest.mock('@zivali/api/auth', () => ({
	useSession: () => mockSession,
	useRequireAuth: () => mockSession,
}));

jest.setTimeout(30_000);

const RETURN = 'zivali://payments/return';
const tip: Checkout = {
	purpose: 'tip',
	amountCents: 500,
	refs: { report_id: '7c1e4b2a-0000-4000-8000-000000000001' },
	returnTo: '/r/Hk3vT9qP/reunited',
};

/** The API as C13 builds it: checkout answers the fixture session, GET /v1/payments/:id the status given. */
function payments(status: () => Payment['status'] | Response, routes: MockRoutes = {}) {
	return createMockApi({
		'POST /v1/payments/checkout': checkout,
		'GET /v1/payments/:id': () => {
			const next = status();
			return next instanceof Response ? next : { ...payment, status: next };
		},
		...routes,
	});
}

// One store per client; reset after each test so RTK's cache timers do not keep Jest running.
const stores = new Map<ReturnType<typeof createMockApi>, ApiStore>();
afterEach(() => {
	for (const store of stores.values()) store.dispatch(rtk.util.resetApiState());
	stores.clear();
});

function Providers({ api, children }: { api: ReturnType<typeof createMockApi>; children: ReactNode }) {
	if (!stores.has(api)) stores.set(api, createApiStore(api));
	return (
		<Provider store={stores.get(api)!}>
			<IntlProvider locale="sl" messages={sl} timeZone="Europe/Ljubljana">
				{children}
			</IntlProvider>
		</Provider>
	);
}

async function openSheet(api: ReturnType<typeof createMockApi>) {
	const onOpenChange = jest.fn();
	await render(
		<Providers api={api}>
			<CheckoutSheet open onOpenChange={onOpenChange} checkout={tip} />
		</Providers>
	);
	return onOpenChange;
}

const checkoutCalls = (api: ReturnType<typeof createMockApi>): MockRequest[] =>
	api.calls.filter((call) => call.path === '/v1/payments/checkout');
const pressContinue = () => fireEvent.press(screen.getByRole('button', { name: sl.payments.handoff_continue }));

beforeEach(() => {
	mockOpenAuthSession.mockReset();
	mockSession.isVerified = true;
	mockSession.gate = 'ok';
});

describe('checkout hand-off', () => {
	test('explains the browser, creates the session for the app and opens it with openAuthSessionAsync', async () => {
		mockOpenAuthSession.mockResolvedValue({ type: 'success', url: `${RETURN}?payment_id=${checkout.payment_id}` });
		const api = payments(() => 'succeeded');
		const onOpenChange = await openSheet(api);

		expect(screen.getByRole('heading', { name: sl.payments.handoff_title })).toBeOnTheScreen();
		expect(screen.getByText(sl.payments.handoff_body)).toBeOnTheScreen();
		await pressContinue();

		expect(await screen.findByRole('heading', { name: sl.payments.success_title })).toBeOnTheScreen();
		expect(screen.getByText(sl.payments.success_body)).toBeOnTheScreen();
		const [call] = checkoutCalls(api);
		expect(call.body).toEqual({
			purpose: 'tip',
			amount_cents: 500,
			refs: tip.refs,
			locale: 'sl',
			return_to: tip.returnTo,
			return_scheme: true,
		});
		expect(call.headers['Idempotency-Key']).toEqual(expect.any(String));
		expect(mockOpenAuthSession).toHaveBeenCalledWith(checkout.checkout_url, RETURN);
		expect(api.calls.at(-1)?.path).toBe(`/v1/payments/${checkout.payment_id}`);

		await fireEvent.press(screen.getByRole('button', { name: sl.payments.success_back }));
		expect(onOpenChange).toHaveBeenCalledWith(false);
	});

	test('a succeeded contribution fires `donation` (value, currency, amount_bucket, purpose) with consent only', async () => {
		let record: string | null = null;
		initAnalytics({ provider: 'mock', storage: { get: () => record, set: (value) => void (record = value) } });
		resetMockEvents();
		mockOpenAuthSession.mockResolvedValue({ type: 'success', url: `${RETURN}?payment_id=${checkout.payment_id}` });
		const onPaid = jest.fn();
		const sheet = async (paid: Partial<Payment>) => {
			const view = await render(
				<Providers api={payments(() => 'succeeded', { 'GET /v1/payments/:id': { ...payment, ...paid } })}>
					<CheckoutSheet open onOpenChange={jest.fn()} checkout={tip} onPaid={onPaid} />
				</Providers>
			);
			await pressContinue();
			await screen.findByRole('heading', { name: sl.payments.success_title });
			return view;
		};

		await (await sheet({})).unmount();
		expect(onPaid).toHaveBeenCalledTimes(1);
		expect(getMockEvents()).toEqual([]);

		setConsent({ analytics: true });
		await sheet({ purpose: 'report_contribution', amount_cents: 250 });
		expect(onPaid).toHaveBeenCalledTimes(2);
		expect(getMockEvents()).toEqual([
			{
				name: 'donation',
				params: { value: 2.5, currency: 'EUR', amount_bucket: '2-4', purpose: 'report_contribution' },
			},
		]);
		setConsent({ analytics: false });
	});

	test('Prekliči closes the sheet without creating a session', async () => {
		const api = payments(() => 'pending');
		const onOpenChange = await openSheet(api);
		await fireEvent.press(screen.getByRole('button', { name: sl.payments.handoff_cancel }));
		expect(onOpenChange).toHaveBeenCalledWith(false);
		expect(api.calls).toHaveLength(0);
	});

	test('the cancel URL shows "nothing was charged"; Poskusi znova is a new attempt with a new key', async () => {
		mockOpenAuthSession.mockResolvedValue({
			type: 'success',
			url: `${RETURN}?payment_id=${checkout.payment_id}&canceled=1`,
		});
		const api = payments(() => 'pending');
		await openSheet(api);
		await pressContinue();

		expect(await screen.findByRole('heading', { name: sl.payments.cancel_title })).toBeOnTheScreen();
		expect(screen.getByText(sl.payments.cancel_body)).toBeOnTheScreen();
		await fireEvent.press(screen.getByRole('button', { name: sl.payments.cancel_retry }));
		expect(screen.getByRole('heading', { name: sl.payments.handoff_title })).toBeOnTheScreen();

		await pressContinue();
		await screen.findByRole('heading', { name: sl.payments.cancel_title });
		const [first, second] = checkoutCalls(api);
		expect(second.headers['Idempotency-Key']).not.toBe(first.headers['Idempotency-Key']);
	});

	test('a browser closed right after paying still shows the thanks (the status is read once)', async () => {
		mockOpenAuthSession.mockResolvedValue({ type: 'dismiss' });
		await openSheet(payments(() => 'succeeded'));
		await pressContinue();
		expect(await screen.findByRole('heading', { name: sl.payments.success_title })).toBeOnTheScreen();
	});

	test('pending waits for the webhook and turns into the thanks by itself', async () => {
		mockOpenAuthSession.mockResolvedValue({ type: 'success', url: `${RETURN}?payment_id=${checkout.payment_id}` });
		let reads = 0;
		await openSheet(payments(() => (++reads < 2 ? 'pending' : 'succeeded')));
		await pressContinue();

		expect(await screen.findByRole('heading', { name: sl.payments.pending_title })).toBeOnTheScreen();
		expect(screen.getByText(sl.payments.pending_body)).toBeOnTheScreen();
		expect(screen.getByRole('button', { name: sl.payments.pending_back })).toBeOnTheScreen();
		expect(
			await screen.findByRole('heading', { name: sl.payments.success_title }, { timeout: 5000 })
		).toBeOnTheScreen();
	});

	test('a declined payment explains it calmly and offers another card or Preskoči', async () => {
		mockOpenAuthSession.mockResolvedValue({ type: 'success', url: `${RETURN}?payment_id=${checkout.payment_id}` });
		const onOpenChange = await openSheet(payments(() => 'failed'));
		await pressContinue();

		expect(await screen.findByRole('heading', { name: sl.payments.failed_title })).toBeOnTheScreen();
		expect(screen.getByText(sl.payments.failed_body)).toBeOnTheScreen();
		await fireEvent.press(screen.getByRole('button', { name: sl.payments.failed_skip }));
		expect(onOpenChange).toHaveBeenCalledWith(false);
		await fireEvent.press(screen.getByRole('button', { name: sl.payments.failed_retry }));
		expect(screen.getByRole('heading', { name: sl.payments.handoff_title })).toBeOnTheScreen();
	});

	test('an unconfirmed email gets the receipt note instead of the receipt sentence', async () => {
		mockSession.isVerified = false;
		mockOpenAuthSession.mockResolvedValue({ type: 'success', url: `${RETURN}?payment_id=${checkout.payment_id}` });
		await openSheet(payments(() => 'succeeded'));
		await pressContinue();

		await screen.findByRole('heading', { name: sl.payments.success_title });
		expect(screen.getByText(sl.support.unverified)).toBeOnTheScreen();
		expect(screen.queryByText(sl.payments.success_body)).toBeNull();
	});

	test('a dropped connection shows the error; Nadaljuj retries with the same key', async () => {
		mockOpenAuthSession.mockResolvedValue({ type: 'success', url: `${RETURN}?payment_id=${checkout.payment_id}` });
		let attempts = 0;
		const api = payments(() => 'succeeded', {
			'POST /v1/payments/checkout': () => {
				if (++attempts === 1) throw new TypeError('Network request failed');
				return checkout;
			},
		});
		await openSheet(api);
		await pressContinue();

		expect(await screen.findByText(sl.errors.NETWORK)).toBeOnTheScreen();
		expect(mockOpenAuthSession).not.toHaveBeenCalled();
		await pressContinue();
		await screen.findByRole('heading', { name: sl.payments.success_title });
		const [first, second] = checkoutCalls(api);
		expect(second.headers['Idempotency-Key']).toBe(first.headers['Idempotency-Key']);
	});

	test('the API minimum shows its own sentence', async () => {
		await openSheet(
			payments(() => 'pending', {
				'POST /v1/payments/checkout': () => mockError('MIN_AMOUNT', 'Minimum card amount is EUR 2.00'),
			})
		);
		await pressContinue();
		expect(await screen.findByText(sl.errors.MIN_AMOUNT)).toBeOnTheScreen();
	});

	test('a 503 on the subscription checkout shows the premium_unavailable copy', async () => {
		const api = payments(() => 'pending', {
			'POST /v1/payments/checkout': () => mockError('SERVICE_UNAVAILABLE'),
		});
		await render(
			<Providers api={api}>
				<CheckoutSheet
					open
					onOpenChange={jest.fn()}
					checkout={{ purpose: 'subscription', returnTo: '/account/payments' }}
				/>
			</Providers>
		);
		await pressContinue();
		expect(await screen.findByText(sl.payments.premium_unavailable)).toBeOnTheScreen();
	});

	test('a 503 on a non-subscription checkout keeps the generic copy', async () => {
		await openSheet(
			payments(() => 'pending', { 'POST /v1/payments/checkout': () => mockError('SERVICE_UNAVAILABLE') })
		);
		await pressContinue();
		expect(await screen.findByText(sl.errors.SERVICE_UNAVAILABLE)).toBeOnTheScreen();
		expect(screen.queryByText(sl.payments.premium_unavailable)).toBeNull();
	});
});

describe('the return link', () => {
	test('while the browser is open the router leaves it to the sheet; otherwise it opens /payments/return', async () => {
		let finish!: (result: object) => void;
		mockOpenAuthSession.mockReturnValue(new Promise((resolve) => (finish = resolve)));
		const link = `${RETURN}?payment_id=p1`;
		const done = payInBrowser('https://checkout.stripe.test/c/pay/cs_test');

		expect(redirectSystemPath({ path: link, initial: false })).toBeNull();
		expect(
			redirectSystemPath({ path: 'https://najdimo.si/payments/return?payment_id=p1', initial: false })
		).toBeNull();
		expect(redirectSystemPath({ path: link, initial: true })).toBe('/payments/return?payment_id=p1');
		expect(redirectSystemPath({ path: 'https://najdimo.si/r/abc', initial: false })).toBe('/r/abc');

		finish({ type: 'success', url: `${link}&canceled=1` });
		await expect(done).resolves.toEqual({ canceled: true });
		expect(redirectSystemPath({ path: link, initial: false })).toBe('/payments/return?payment_id=p1');
	});

	test('opened without a waiting sheet, the screen shows the state and Nazaj leaves', async () => {
		const api = payments(() => 'pending');
		const result = renderRouter(
			{
				_layout: () => <Stack screenOptions={{ headerShown: false }} />,
				index: () => null,
				'payments/return': PaymentReturn,
			},
			{
				initialUrl: `/payments/return?payment_id=${checkout.payment_id}&canceled=1`,
				wrapper: ({ children }) => <Providers api={api}>{children}</Providers>,
			}
		);
		await result;

		expect(await screen.findByRole('heading', { name: sl.payments.cancel_title })).toBeOnTheScreen();
		// No amount here to try again with.
		expect(screen.queryByRole('button', { name: sl.payments.cancel_retry })).toBeNull();
		await fireEvent.press(screen.getByRole('button', { name: sl.payments.cancel_back }));
		expect(result.getPathname()).toBe('/');
	});
});

describe('Settings → Plačila', () => {
	const at = (id: string, fields: Partial<Payment>): Payment => ({ ...payment, id, ...fields });
	const list = (items: Payment[] | (() => Response)) =>
		payments(() => 'succeeded', {
			'GET /v1/me/payments': typeof items === 'function' ? items : { items, next_cursor: null },
		});

	const settings = async (api: ReturnType<typeof createMockApi>) => {
		const result = renderRouter(
			{ _layout: () => <Stack />, profile: () => null, 'settings/payments': PaymentsSettings },
			{ initialUrl: '/settings/payments', wrapper: ({ children }) => <Providers api={api}>{children}</Providers> }
		);
		await result;
		// Not the result itself: it is a promise, and awaiting it again would drop the router getters.
		return { getPathname: result.getPathname };
	};

	test("lists the user's settled payments with date, purpose, amount, status and the test label", async () => {
		await settings(
			list([
				at('p1', {
					purpose: 'tip',
					amount_cents: 500,
					status: 'succeeded',
					created_at: '2026-10-15T10:00:00Z',
				}),
				at('p2', {
					purpose: 'report_contribution',
					amount_cents: 300,
					status: 'failed',
					created_at: '2026-10-02T10:00:00Z',
				}),
				at('p3', {
					purpose: 'support',
					amount_cents: 1000,
					status: 'refunded',
					created_at: '2026-09-18T10:00:00Z',
				}),
				at('p4', { purpose: 'tip', amount_cents: 700, status: 'pending' }),
				at('p5', { purpose: 'tip', amount_cents: 900, status: 'canceled' }),
			])
		);

		expect(await screen.findByText('15. 10. 2026 · Prispevek v zahvalo · 5,00 €')).toBeOnTheScreen();
		expect(screen.getByText('2. 10. 2026 · Prispevek ob prijavi · 3,00 €')).toBeOnTheScreen();
		expect(screen.getByText(`18. 9. 2026 · ${sl.payments.purpose_support} · 10,00 €`)).toBeOnTheScreen();
		expect(screen.getAllByRole('listitem')).toHaveLength(3);
		expect(screen.getByText(sl.payments.status_paid)).toBeOnTheScreen();
		expect(screen.getByText(sl.payments.status_failed)).toBeOnTheScreen();
		expect(screen.getByText(sl.payments.status_refunded)).toBeOnTheScreen();
		expect(screen.getAllByText(sl.payments.test_label)).toHaveLength(3);
		expect(screen.queryByText(/7,00 €|9,00 €/)).toBeNull();
	});

	test('a partly refunded payment stays paid and says how much came back (TASK-92.4)', async () => {
		await settings(
			list([
				at('p1', {
					purpose: 'tip',
					amount_cents: 1000,
					refunded_cents: 300,
					status: 'succeeded',
					created_at: '2026-10-15T10:00:00Z',
				}),
			])
		);
		expect(await screen.findByText('15. 10. 2026 · Prispevek v zahvalo · 10,00 €')).toBeOnTheScreen();
		expect(screen.getByText(sl.payments.status_paid)).toBeOnTheScreen();
		expect(screen.getByText('Delno vrnjeno: 3,00 €')).toBeOnTheScreen();
	});

	test('no payments: one sentence, no prompt to pay', async () => {
		await settings(list([]));
		expect(await screen.findByText(sl.payments.empty)).toBeOnTheScreen();
		expect(screen.queryByRole('button')).toBeNull();
	});

	test('a failed load says why and tries again', async () => {
		let fail = true;
		await settings(
			list(() =>
				fail
					? mockError('FORBIDDEN')
					: new Response(JSON.stringify({ items: [], next_cursor: null }), { status: 200 })
			)
		);

		expect(await screen.findByText(sl.errors.FORBIDDEN)).toBeOnTheScreen();
		fail = false;
		await fireEvent.press(screen.getByRole('button', { name: sl.common.try_again }));
		await waitFor(() => expect(screen.getByText(sl.payments.empty)).toBeOnTheScreen());
	});

	test('signed out goes back to Profile', async () => {
		mockSession.gate = 'signin';
		const result = await settings(list([]));
		expect(result.getPathname()).toBe('/profile');
	});
});
