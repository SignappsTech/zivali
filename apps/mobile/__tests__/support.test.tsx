import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { Provider } from 'react-redux';
import { IntlProvider } from 'use-intl';

import { createMockApi, type MockRoutes } from '@zivali/api/mock';
import { type ApiStore, createApiStore, api as rtk } from '@zivali/api/rtk';
import { formatEur } from '@zivali/i18n/format';
import sl from '@zivali/i18n/dist/sl.json';
import { ContributionRow, SupportCard, SupportTip } from '@/components/payments/support';

const tp = sl.support;
const REPORT_ID = '7c1e4b2a-0000-4000-8000-000000000001';

const mockSession = { me: {} as object | null, isAnonymous: false };
jest.mock('@zivali/api/auth', () => ({ useSession: () => mockSession }));
jest.mock('@/lib/env', () => ({ env: { EXPO_PUBLIC_APP_URL: 'https://najdimo.test', EXPO_PUBLIC_APP_ENV: 'local' } }));
// The hand-off sheet (TASK-32.3, payments.test) as a marker of what it would pay for; "paid" plays a successful return.
jest.mock('@/components/payments/checkout', () => {
	const { Pressable, Text, View } = jest.requireActual<typeof import('react-native')>('react-native');
	const { createElement: h } = jest.requireActual<typeof import('react')>('react');
	return {
		CheckoutSheet: ({
			open,
			checkout,
			onPaid,
			onOpenChange,
		}: {
			open: boolean;
			checkout: object;
			onPaid: () => void;
			onOpenChange: (open: boolean) => void;
		}) =>
			open
				? h(
						View,
						null,
						h(Text, { testID: 'checkout' }, JSON.stringify(checkout)),
						h(Pressable, {
							testID: 'paid',
							onPress: () => {
								onPaid();
								onOpenChange(false);
							},
						})
					)
				: null,
	};
});

const stores: ApiStore[] = [];
afterEach(() => {
	for (const store of stores) store.dispatch(rtk.util.resetApiState());
	stores.length = 0;
});

function show(ui: ReactNode, routes: MockRoutes = {}) {
	const store = createApiStore(createMockApi(routes));
	stores.push(store);
	return render(
		<Provider store={store}>
			<IntlProvider locale="sl" messages={sl} timeZone="Europe/Ljubljana">
				{ui}
			</IntlProvider>
		</Provider>
	);
}
const button = (name: string) => screen.getByRole('button', { name });
const press = (name: string) => fireEvent.press(button(name));
const paying = () => JSON.parse(screen.getByTestId('checkout').props.children);
const eur = (cents: number) => formatEur(cents, 'sl');

beforeEach(() => Object.assign(mockSession, { me: {}, isAnonymous: false }));

describe('reunited tip (P15)', () => {
	test('3, 5 (suggested, not chosen), 10 € or another amount; Pay waits for an amount, Skip as visible; web checkout', async () => {
		await show(<SupportTip reportId={REPORT_ID} code="Tip1" />);
		expect(screen.getByRole('heading', { name: tp.tip_title })).toBeOnTheScreen();
		expect(screen.getByText(tp.tip_body)).toBeOnTheScreen();
		const pills = screen.getAllByRole('radio');
		expect(pills).toHaveLength(4);
		for (const pill of pills) expect(pill).not.toBeChecked();
		// The suggested amount is read as such and drawn as a line, never as chosen.
		expect(screen.getByRole('radio', { name: `${tp.amount_5}, ${tp.amount_suggested_a11y}` })).not.toBeChecked();

		expect(button(tp.pay_disabled)).toBeDisabled();
		expect(button(tp.pay_disabled)).toHaveProp('accessibilityHint', tp.pay_disabled_help);
		expect(button(tp.skip)).toBeEnabled();
		expect(screen.getByText(tp.not_donation_note)).toBeOnTheScreen();
		expect(screen.getByText(tp.test_note)).toBeOnTheScreen();
		// Support and contribution, never a charitable donation.
		expect(screen.queryByText(/donacij|dobrodel|napitnin/i)).toBeNull();

		await fireEvent.press(screen.getByRole('radio', { name: tp.amount_10 }));
		expect(screen.getByRole('radio', { name: tp.amount_10 })).toBeChecked();
		await press(`Plačaj ${eur(1000)}`);
		expect(paying()).toEqual({
			purpose: 'tip',
			amountCents: 1000,
			refs: { report_id: REPORT_ID },
			returnTo: '/r/Tip1/reunited',
		});
	});

	test('another amount: at least 2 € and at most 500 €, "2,5" reads as 2,50 €, integer cents', async () => {
		await show(<SupportTip reportId={REPORT_ID} code="Tip2" />);
		await fireEvent.press(screen.getByRole('radio', { name: tp.amount_other }));
		const field = screen.getByLabelText(tp.amount_other_label);

		await fireEvent.changeText(field, '1,50');
		await fireEvent(field, 'blur');
		expect(screen.getByText(tp.amount_min_error)).toBeOnTheScreen();
		expect(button(tp.pay_disabled)).toBeDisabled();

		await fireEvent.changeText(field, '600');
		expect(screen.getByText(tp.amount_max_error)).toBeOnTheScreen();

		await fireEvent.changeText(field, '2,5');
		expect(screen.queryByText(tp.amount_min_error)).toBeNull();
		await press(`Plačaj ${eur(250)}`);
		expect(paying()).toMatchObject({ purpose: 'tip', amountCents: 250 });
	});

	test('Skip removes the ask and it is not shown again for that report; a payment leaves a thank-you line', async () => {
		const first = await show(<SupportTip reportId={REPORT_ID} code="Tip3" />);
		await press(tp.skip);
		expect(screen.queryByRole('heading', { name: tp.tip_title })).toBeNull();
		await first.unmount();
		await show(<SupportTip reportId={REPORT_ID} code="Tip3" />);
		expect(screen.queryByRole('heading', { name: tp.tip_title })).toBeNull();

		await show(<SupportTip reportId={REPORT_ID} code="Tip4" />);
		await fireEvent.press(screen.getByRole('radio', { name: tp.amount_3 }));
		await press(`Plačaj ${eur(300)}`);
		await fireEvent.press(screen.getByTestId('paid'));
		expect(screen.getByText(tp.already_paid)).toBeOnTheScreen();
		expect(screen.queryByRole('radio')).toBeNull();
	});

	test('an anonymous finder or a signed-out visitor sees no ask', async () => {
		Object.assign(mockSession, { isAnonymous: true });
		const view = await show(<SupportTip reportId={REPORT_ID} code="Tip5" />);
		expect(view.toJSON()).toBeNull();
		await view.unmount();
		Object.assign(mockSession, { me: null, isAnonymous: false });
		expect((await show(<SupportTip reportId={REPORT_ID} code="Tip5" />)).toJSON()).toBeNull();
	});
});

describe('Profile card (purpose support)', () => {
	test('"Pomagajte nam izboljšati Najdimo" with the same amounts, no Skip and no monthly option by default', async () => {
		await show(<SupportCard />);
		expect(screen.getByRole('heading', { name: tp.card_title })).toBeOnTheScreen();
		expect(screen.getAllByRole('radio')).toHaveLength(4);
		for (const pill of screen.getAllByRole('radio')) expect(pill).not.toBeChecked();
		expect(screen.queryByRole('button', { name: tp.skip })).toBeNull();
		expect(screen.queryByRole('checkbox')).toBeNull();

		await fireEvent.press(screen.getByRole('radio', { name: `${tp.amount_5}, ${tp.amount_suggested_a11y}` }));
		await press(`Plačaj ${eur(500)}`);
		expect(paying()).toEqual({ purpose: 'support', amountCents: 500, returnTo: '/account/payments' });
	});

	test('the monthly Podpornik option only with flags.supporter_monthly: unticked, then "na mesec"', async () => {
		await show(<SupportCard />, { 'GET /v1/config/public': { 'flags.supporter_monthly': true } });
		const monthly = await screen.findByRole('checkbox', { name: tp.supporter_monthly_label });
		expect(monthly).not.toBeChecked();
		await fireEvent.press(screen.getByRole('radio', { name: tp.amount_3 }));
		expect(button(`Plačaj ${eur(300)}`)).toBeEnabled();
		await fireEvent.press(monthly);
		await waitFor(() => expect(button(`Plačaj ${eur(300)} na mesec`)).toBeEnabled());
		await press(`Plačaj ${eur(300)} na mesec`);
		expect(paying()).toEqual({ purpose: 'subscription', returnTo: '/account/payments' });
	});
});

describe('contribution row at the lost confirmation', () => {
	const open = () =>
		fireEvent.press(screen.getByRole('button', { name: `${tp.contribution_row}. ${tp.contribution_expand_a11y}` }));

	test('Skrij records the skip: the row is not shown again for that report', async () => {
		const first = await show(<ContributionRow reportId={REPORT_ID} code="Row1" />);
		await open();
		await press(tp.contribution_hide);
		expect(screen.queryByRole('button', { name: new RegExp(tp.contribution_row) })).toBeNull();
		await first.unmount();
		expect((await show(<ContributionRow reportId={REPORT_ID} code="Row1" />)).toJSON()).toBeNull();
	});

	test('paid: the row turns into the thank-you line; Pay waits while the report loads', async () => {
		const view = await show(<ContributionRow code="Row2" />);
		await open();
		await fireEvent.press(screen.getByRole('radio', { name: tp.contribution_2 }));
		expect(button(`Prispevaj ${eur(200)}`)).toBeDisabled();
		await view.rerender(
			<Provider store={stores[0]}>
				<IntlProvider locale="sl" messages={sl} timeZone="Europe/Ljubljana">
					<ContributionRow reportId={REPORT_ID} code="Row2" />
				</IntlProvider>
			</Provider>
		);
		await press(`Prispevaj ${eur(200)}`);
		expect(paying()).toEqual({
			purpose: 'report_contribution',
			amountCents: 200,
			refs: { report_id: REPORT_ID },
			returnTo: '/r/Row2',
		});
		await fireEvent.press(screen.getByTestId('paid'));
		expect(screen.getByText(tp.already_paid)).toBeOnTheScreen();
	});
});
