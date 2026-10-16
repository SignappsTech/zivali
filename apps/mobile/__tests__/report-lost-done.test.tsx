import { PortalHost } from '@rn-primitives/portal';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Linking, Share } from 'react-native';
import { Provider } from 'react-redux';
import { IntlProvider } from 'use-intl';

import * as dir from '@zivali/api/__fixtures__/directory';
import { ownerReport } from '@zivali/api/__fixtures__/reports';
import { createMockApi, type MockRequest } from '@zivali/api/mock';
import { createApiStore } from '@zivali/api/rtk';
import sl from '@zivali/i18n/dist/sl.json';
import ReportLostDoneScreen from '@/app/report/lost/done';

const t = sl.report_lost;
const ts = sl.shelter_row;
const tp = sl.support;
const CODE = ownerReport.short_code;

const mockRouter = { replace: jest.fn() };
const mockParams: { code: string; name?: string } = { code: CODE };
jest.mock('expo-router', () => ({ useRouter: () => mockRouter, useLocalSearchParams: () => mockParams }));
const mockSession = { me: {} as object | null, isVerified: true };
jest.mock('@zivali/api/auth', () => ({ useSession: () => mockSession }));
jest.mock('@/lib/env', () => ({ env: { EXPO_PUBLIC_APP_URL: 'https://najdimo.test', EXPO_PUBLIC_APP_ENV: 'local' } }));
// The hand-off sheet (TASK-32.3) as a marker of what it would pay for.
jest.mock('@/components/payments/checkout', () => {
	const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
	const { createElement } = jest.requireActual<typeof import('react')>('react');
	return {
		CheckoutSheet: ({ open, checkout }: { open: boolean; checkout: object }) =>
			open ? createElement(Text, { testID: 'checkout' }, JSON.stringify(checkout)) : null,
	};
});

let calls: MockRequest[] = [];
async function renderDone(responsible: object, report: object = ownerReport) {
	const client = createMockApi({
		'GET /v1/reports/:code': report,
		'GET /v1/shelters/responsible': responsible,
	});
	calls = client.calls;
	await render(
		<Provider store={createApiStore(client)}>
			<IntlProvider locale="sl" messages={sl} timeZone="Europe/Ljubljana">
				<ReportLostDoneScreen />
				<PortalHost />
			</IntlProvider>
		</Provider>
	);
}
const press = (name: string | RegExp) => fireEvent.press(screen.getByRole('button', { name }));

beforeEach(() => {
	jest.clearAllMocks();
	jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
	jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' });
	Object.assign(mockParams, { code: CODE, name: 'Medo' });
	Object.assign(mockSession, { me: {}, isVerified: true });
});

test('next steps, the responsible shelter with a one-tap call and the reporting duty it does not replace; no ad', async () => {
	await renderDone(dir.responsibleConfirmed);

	expect(screen.getByRole('heading', { name: t.done_title })).toBeOnTheScreen();
	expect(screen.getByText(t.done_lede_named.replace('{name}', 'Medo'))).toBeOnTheScreen();
	expect(screen.getByRole('heading', { name: t.next_title })).toBeOnTheScreen();
	for (const line of [t.next_1, t.next_2, t.next_3]) expect(screen.getByText(line)).toBeOnTheScreen();

	const duty = `${ts.lost_body.replace('{municipality}', 'Ljubljana')} ${ts.not_replace}`;
	expect(await screen.findByText(duty)).toBeOnTheScreen();
	// The municipality the API derived for the report, not a point rounded across a border.
	expect(calls.find((c) => c.path === '/v1/shelters/responsible')!.query).toEqual({ municipality: 'ljubljana' });
	expect(screen.getByText('Zavetišče Ljubljana')).toBeOnTheScreen();
	expect(screen.getByText('01 234 56 78')).toBeOnTheScreen();
	expect(screen.queryByText(ts.unconfirmed_note)).toBeNull();
	await press('Pokliči Zavetišče Ljubljana');
	expect(Linking.openURL).toHaveBeenCalledWith('tel:+38612345678');
	await press(ts.details_link);
	expect(Linking.openURL).toHaveBeenLastCalledWith('https://najdimo.test/zavetisca/zavetisce-ljubljana');

	expect(screen.queryByTestId(/ad-slot/i)).toBeNull();
	expect(screen.queryByText(t.unverified_note)).toBeNull();
});

test('share, the report, the first-24-hours tips and close', async () => {
	await renderDone(dir.responsibleConfirmed);
	await press(t.share);
	expect(Share.share).toHaveBeenCalledWith({ message: `https://najdimo.test/r/${CODE}` });
	await press(t.open_report);
	expect(mockRouter.replace).toHaveBeenCalledWith({ pathname: '/r/[code]', params: { code: CODE } });
	await press(t.first_24h);
	expect(Linking.openURL).toHaveBeenCalledWith('https://najdimo.test/varnost#prvih-24-ur');
	await press(sl.common.close);
	expect(mockRouter.replace).toHaveBeenLastCalledWith('/');
});

test('the contribution row is collapsed, nothing is pre-selected, Prispevaj needs an amount and Skrij removes it', async () => {
	await renderDone(dir.responsibleConfirmed);
	const row = screen.getByRole('button', { name: `${tp.contribution_row}. ${tp.contribution_expand_a11y}` });
	expect(row).toBeCollapsed();
	expect(screen.queryByRole('radio')).toBeNull();
	expect(screen.queryByText(tp.contribution_body)).toBeNull();

	await fireEvent.press(row);
	expect(screen.getByRole('button', { name: tp.contribution_row })).toBeExpanded();
	const pills = screen.getAllByRole('radio');
	expect(pills).toHaveLength(3);
	for (const pill of pills) expect(pill).not.toBeChecked();
	const pay = screen.getByRole('button', { name: tp.contribution_pay_disabled });
	expect(pay).toBeDisabled();
	// Read with the button; the visible line under it is not read twice.
	expect(pay).toHaveProp('accessibilityHint', tp.pay_disabled_help);
	expect(screen.getByText(tp.pay_disabled_help, { includeHiddenElements: true })).toBeTruthy();
	expect(screen.getByText(tp.test_note)).toBeOnTheScreen();

	await fireEvent.press(screen.getByRole('radio', { name: tp.contribution_3 }));
	expect(screen.getByRole('radio', { name: tp.contribution_3 })).toBeChecked();
	await waitFor(() => expect(screen.getByRole('button', { name: 'Prispevaj 3,00 €' })).toBeEnabled());
	await press('Prispevaj 3,00 €');
	expect(JSON.parse(screen.getByTestId('checkout').props.children)).toEqual({
		purpose: 'report_contribution',
		amountCents: 300,
		refs: { report_id: ownerReport.id },
		returnTo: `/r/${CODE}`,
	});

	await press(tp.contribution_hide);
	expect(screen.queryByRole('button', { name: new RegExp(tp.contribution_row) })).toBeNull();
	// The rest of the confirmation stays.
	expect(screen.getByRole('heading', { name: t.done_title })).toBeOnTheScreen();
});

test('a likely shelter is never shown as the certain one: "Morda pristojno zavetišče", "Ni potrjeno", still callable', async () => {
	await renderDone(dir.responsibleLikely);
	expect(await screen.findByText(ts.suggested_label)).toBeOnTheScreen();
	expect(screen.getByText(ts.unconfirmed_note)).toBeOnTheScreen();
	expect(screen.getByText(ts.unconfirmed_note_hint)).toBeOnTheScreen();
	expect(screen.getByText(new RegExp(ts.not_replace))).toBeOnTheScreen();
	await press('Pokliči Zavetišče Ljubljana');
	expect(Linking.openURL).toHaveBeenCalledWith('tel:+38612345678');
});

test('an unconfirmed municipality shows the generic notice and the directory, never a guessed number', async () => {
	await renderDone(dir.responsibleUnconfirmed);
	expect(await screen.findByText(ts.unconfirmed.replace('{municipality}', 'Osilnica'))).toBeOnTheScreen();
	expect(screen.queryByRole('button', { name: /^Pokliči/ })).toBeNull();
	await press(ts.directory_link);
	expect(Linking.openURL).toHaveBeenCalledWith('https://najdimo.test/zavetisca');
});

test('outside Slovenia or no municipality: the unknown-municipality notice; by point when the API derived none', async () => {
	const { municipality_slug: _, ...report } = ownerReport;
	await renderDone(dir.responsibleOutside, report);
	expect(await screen.findByText(ts.unknown_municipality)).toBeOnTheScreen();
	expect(calls.find((c) => c.path === '/v1/shelters/responsible')!.query).toEqual({ lat: '46.05', lng: '14.51' });
	expect(screen.queryByRole('button', { name: /^Pokliči/ })).toBeNull();
});

test('an unverified account: the search is live, the note asks to confirm the email for alerts and messages', async () => {
	Object.assign(mockSession, { me: {}, isVerified: false });
	mockParams.name = undefined;
	await renderDone(dir.responsibleConfirmed);
	expect(screen.getByText(t.unverified_note)).toBeOnTheScreen();
	expect(screen.getByText(t.done_lede)).toBeOnTheScreen();
});
