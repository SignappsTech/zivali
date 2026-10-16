// Loads the jest.setup Reanimated mock (with useReducedMotion) before expo-router's testing mocks register their own.
import 'react-native-reanimated';

import { PortalHost } from '@rn-primitives/portal';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Stack } from 'expo-router';
import { renderRouter } from 'expo-router/testing-library';
import * as React from 'react';
import { Share, Text } from 'react-native';
import { Provider } from 'react-redux';
import { IntlProvider } from 'use-intl';

import { getMockEvents, initAnalytics, resetMockEvents, setConsent } from '@zivali/analytics';
import { ad } from '@zivali/api/__fixtures__/ads';
import * as fx from '@zivali/api/__fixtures__/reports';
import { createMockApi, type MockRequest, mockError } from '@zivali/api/mock';
import { api, createApiStore } from '@zivali/api/rtk';
import sl from '@zivali/i18n/dist/sl.json';
import type { Ad, ReportOwnerView } from '@zivali/types';
import EditReportScreen from '@/app/r/[code]/edit';
import ReportScreen from '@/app/r/[code]/index';
import ReunitedScreen from '@/app/r/[code]/reunited';
import MyReportsSettings from '@/app/settings/reports';
import { toast } from '@/components/ui/sonner';
import { useMyReports, useReport } from '@/lib/data/reports';

jest.mock('@/lib/data/reports', () => ({ useReport: jest.fn(), useMyReports: jest.fn() }));
jest.mock('@/lib/env', () => ({ env: { EXPO_PUBLIC_APP_URL: 'https://najdimo.test' } }));
// Online for the ad slots (ad-slot.test.tsx); they collapse unless a test serves an ad.
jest.mock('expo-network', () => ({ useNetworkState: () => ({ isConnected: true, isInternetReachable: true }) }));
jest.mock('@/components/ui/sonner', () => ({
	toast: Object.assign(jest.fn(), { success: jest.fn(), error: jest.fn() }),
}));
// The anonymous session before a report-abuse request has its own tests (manage.test.tsx).
jest.mock('@/lib/anonymous', () => ({ ensureSession: jest.fn(async () => ({})) }));
// The sign-in helpers behind the shared error text load the Supabase client; nothing here signs in.
jest.mock('@/lib/auth', () => ({ providers: [], signInWithProvider: jest.fn() }));
// The contact gate and the device queue have their own tests (auth, outbox-ui).
jest.mock('@/components/auth/gate', () => ({ AuthGate: () => null }));
jest.mock('@/components/outbox/queue', () => {
	const { Text: MockText } = jest.requireActual<typeof import('react-native')>('react-native');
	return { OutboxList: () => <MockText>device queue</MockText> };
});
let mockSession = { session: {} as object | null, me: null as object | null, isAnonymous: false, loading: false };
jest.mock('@zivali/api/auth', () => ({
	useSession: () => mockSession,
	useRequireAuth: () => ({ ...mockSession, gate: mockSession.session ? 'ok' : 'signin' }),
}));

const NOW = new Date('2026-10-16T12:00:00Z');
const DAY = 86_400_000;
const daysAgo = (days: number) => new Date(NOW.getTime() - days * DAY).toISOString();
const r = sl.report;
const l = sl.lifecycle;

const owner: ReportOwnerView = {
	...fx.ownerReport,
	short_code: 'Rex2Lost',
	type: 'lost',
	name: 'Rex',
	manager_role: 'owner',
	event_at: '2026-10-12T08:00:00Z',
	circumstances: 'Ustrašil se je ognjemeta.',
	location: { lat: 46.0672, lng: 14.4921 },
};
const reunited: ReportOwnerView = { ...owner, status: 'reunited', reunited_at: daysAgo(0) };

// The report every screen reads (useReport), changed by the transitions below as the API would.
let current: ReportOwnerView | null;
let transition: (request: MockRequest) => unknown;
let patch: (request: MockRequest) => unknown;
let served: Ad | null = null;
const mockApi = createMockApi({
	'POST /v1/geo/reverse': { place: { label: 'Šiška, Ljubljana', lat: 46.066, lng: 14.493, kind: 'district' } },
	'POST /v1/reports/:code/transitions': (request) => transition(request),
	'PATCH /v1/reports/:code': (request) => patch(request),
	// No ad unless a test serves one (the ad slot has its own tests, ad-slot.test.tsx).
	'GET /v1/ads/slot/:slot': () => served,
	'POST /v1/ads/:id/impressions': () => undefined,
});
const sent = (method: 'POST' | 'PATCH') =>
	mockApi.calls
		.filter((call) => call.method === method && call.path.startsWith('/v1/reports/'))
		.map((call) => call.body);

jest.mocked(useReport).mockImplementation(() => ({
	data: current,
	source: 'network',
	lastSyncAt: null,
	isLoading: false,
	refetch: jest.fn(),
}));
type MyReports = ReturnType<typeof useMyReports>;
const myReports = (patch: Partial<MyReports>) =>
	jest.mocked(useMyReports).mockReturnValue({
		data: undefined,
		error: undefined,
		isLoading: false,
		isFetching: false,
		isUninitialized: false,
		hasNextPage: false,
		fetchNextPage: jest.fn(),
		refetch: jest.fn(),
		...patch,
	} as unknown as MyReports);

const stores: ReturnType<typeof createApiStore>[] = [];
let unmount: (() => Promise<void>) | undefined;
async function open(url: string, report: ReportOwnerView | null = owner) {
	// One router at a time: a second open in a test replaces the first.
	await unmount?.();
	current = report;
	const store = createApiStore(mockApi);
	stores.push(store);
	const Providers = ({ children }: { children: React.ReactNode }) => (
		<Provider store={store}>
			<IntlProvider locale="sl" messages={sl} timeZone="Europe/Ljubljana" now={NOW}>
				{children}
				<PortalHost />
			</IntlProvider>
		</Provider>
	);
	// The methods (getPathname, …) sit on the returned promise, so it is wrapped: awaiting it would drop them.
	const page = renderRouter(
		{
			_layout: () => <Stack screenOptions={{ headerShown: false }} />,
			index: () => <Text>map tab</Text>,
			'r/[code]/index': ReportScreen,
			'r/[code]/reunited': ReunitedScreen,
			'r/[code]/edit': EditReportScreen,
			'settings/reports': MyReportsSettings,
			'auth/sign-up': () => <Text>sign up</Text>,
		},
		{ initialUrl: url, wrapper: Providers }
	);
	unmount = (await page).unmount;
	return { getPathname: () => page.getPathname() };
}

let consentRecord: string | null = null;
beforeEach(() => {
	consentRecord = null;
	initAnalytics({
		provider: 'mock',
		storage: { get: () => consentRecord, set: (value) => void (consentRecord = value) },
	});
	resetMockEvents();
	mockApi.calls.length = 0;
	served = null;
	mockSession = { session: {}, me: null, isAnonymous: false, loading: false };
	transition = ({ body }) => {
		const { action } = body as { action: string };
		current = action === 'mark_reunited' ? reunited : action === 'reopen' ? { ...owner } : current;
		return current;
	};
	patch = ({ body }) => ({ ...current, ...(body as object) });
	jest.mocked(toast).mockClear();
	jest.mocked(toast.error).mockClear();
});
// renderRouter runs on fake timers.
afterEach(() => {
	unmount = undefined;
	jest.useRealTimers();
	for (const store of stores) store.dispatch(api.util.resetApiState());
	stores.length = 0;
});

describe('owner actions on the report page (P9 slot A, P14)', () => {
	test('"Žival je spet doma": the confirm sheet, mark_reunited, `reunited` with consent, then the reunited screen', async () => {
		setConsent({ analytics: true });
		const page = await open('/r/Rex2Lost');
		expect(screen.getByRole('button', { name: r.owner_edit })).toBeOnTheScreen();
		expect(screen.getByRole('button', { name: r.owner_poster })).toBeOnTheScreen();

		await fireEvent.press(screen.getByRole('button', { name: r.owner_home }));
		expect(screen.getByRole('heading', { name: 'Je Rex res spet doma?' })).toBeOnTheScreen();
		expect(screen.getByText(l.confirm_body)).toBeOnTheScreen();
		await fireEvent.press(screen.getByRole('button', { name: l.confirm_yes }));

		expect(await screen.findByRole('heading', { name: 'Rex je spet doma' })).toBeOnTheScreen();
		expect(page.getPathname()).toBe('/r/Rex2Lost/reunited');
		expect(sent('POST')).toContainEqual({ action: 'mark_reunited' });
		// Species, region and municipality only (C12): no name, code or place.
		expect(getMockEvents()).toEqual([
			{ name: 'reunited', params: { species: 'dog', region: 'osrednjeslovenska', municipality: 'ljubljana' } },
		]);
	});

	test('without analytics consent nothing is tracked', async () => {
		await open('/r/Rex2Lost');
		await fireEvent.press(screen.getByRole('button', { name: r.owner_home }));
		await fireEvent.press(screen.getByRole('button', { name: l.confirm_yes }));
		expect(await screen.findByRole('heading', { name: 'Rex je spet doma' })).toBeOnTheScreen();
		expect(getMockEvents()).toEqual([]);
	});

	test('a failed save keeps the report open with a retry; closed meanwhile, only "Zapri" is left', async () => {
		transition = () => mockError('INTERNAL');
		const page = await open('/r/Rex2Lost');
		await fireEvent.press(screen.getByRole('button', { name: r.owner_home }));
		await fireEvent.press(screen.getByRole('button', { name: l.confirm_yes }));
		expect(await screen.findByRole('alert')).toHaveTextContent(sl.errors.INTERNAL);
		expect(screen.queryByText(l.confirm_body)).toBeNull();

		transition = () => mockError('CONFLICT');
		await fireEvent.press(screen.getByRole('button', { name: sl.common.try_again }));
		expect(await screen.findByText(l.already_closed)).toBeOnTheScreen();
		expect(screen.queryByRole('button', { name: l.confirm_yes })).toBeNull();
		// The grabber is also "Zapri"; the sheet's own button is the last one.
		await fireEvent.press(screen.getAllByRole('button', { name: sl.common.close }).at(-1)!);
		expect(page.getPathname()).toBe('/r/Rex2Lost');
		expect(getMockEvents()).toEqual([]);
	});

	test('a finder confirms in the dialog and gets the short thank-you, with the account offer when anonymous', async () => {
		mockSession = { ...mockSession, isAnonymous: true };
		const finder: ReportOwnerView = { ...fx.ownerReport, manager_role: 'finder' };
		transition = () => (current = { ...finder, status: 'reunited', reunited_at: daysAgo(0) });
		const page = await open(`/r/${finder.short_code}`, finder);
		await fireEvent.press(screen.getByRole('button', { name: r.owner_home }));
		expect(screen.getByText(l.finder_confirm_body)).toBeOnTheScreen();
		await fireEvent.press(screen.getByRole('button', { name: l.finder_confirm_yes }));

		expect(await screen.findByRole('heading', { name: l.finder_thanks_title })).toBeOnTheScreen();
		expect(page.getPathname()).toBe(`/r/${finder.short_code}/reunited`);
		expect(screen.getByText(l.finder_thanks_body)).toBeOnTheScreen();
		// No story consent, tip or ad on the finder's side (M7).
		expect(screen.queryByRole('switch')).toBeNull();
		expect(screen.queryByRole('heading', { name: sl.support.tip_title })).toBeNull();
		await fireEvent.press(screen.getByRole('button', { name: l.finder_thanks_account }));
		expect(page.getPathname()).toBe('/auth/sign-up');
	});

	test('"Zaključi iskanje": a reason first; "Prijava je bila pomota" closes with `other`, then a toast', async () => {
		await open('/r/Rex2Lost');
		await fireEvent.press(screen.getByRole('button', { name: r.more }));
		await fireEvent.press(screen.getByRole('menuitem', { name: r.owner_close }));

		expect(screen.getByRole('heading', { name: l.close_title })).toBeOnTheScreen();
		expect(screen.getByText(l.close_body)).toBeOnTheScreen();
		const confirm = screen.getByRole('button', { name: l.close_confirm });
		expect(confirm).toBeDisabled();
		for (const key of ['home', 'stopped', 'mistake', 'other'] as const)
			expect(screen.getByRole('radio', { name: l[`close_reason_${key}`] })).toBeOnTheScreen();
		await fireEvent.press(screen.getByRole('radio', { name: l.close_reason_mistake }));
		await fireEvent.press(confirm);

		await waitFor(() => expect(toast).toHaveBeenCalledWith(l.closed_toast));
		expect(sent('POST')).toEqual([{ action: 'close', reason: 'other' }]);
		// "Pusti odprto" keeps it open without a request.
		mockApi.calls.length = 0;
		await fireEvent.press(screen.getByRole('button', { name: r.more }));
		await fireEvent.press(screen.getByRole('menuitem', { name: r.owner_close }));
		await fireEvent.press(screen.getByRole('radio', { name: l.close_reason_home }));
		await fireEvent.press(screen.getByRole('button', { name: l.close_keep }));
		expect(sent('POST')).toEqual([]);
	});

	test('closed within 7 days: "Ponovno odpri" reopens with a toast', async () => {
		await open('/r/Rex2Lost', { ...owner, status: 'closed', close_reason: 'gave_up', closed_at: daysAgo(2) });
		expect(screen.getByText('Zaključeno')).toBeOnTheScreen();
		expect(screen.queryByRole('button', { name: r.owner_home })).toBeNull();
		await fireEvent.press(screen.getByRole('button', { name: l.reopen }));
		await waitFor(() => expect(toast).toHaveBeenCalledWith(l.reopened_toast));
		expect(sent('POST')).toEqual([{ action: 'reopen' }]);
	});

	test('no actions after the 7 days or for other people; a reunited report keeps a quiet "Ponovno odpri"', async () => {
		await open('/r/Rex2Lost', { ...owner, status: 'closed', close_reason: 'gave_up', closed_at: daysAgo(8) });
		expect(screen.queryByRole('button', { name: l.reopen })).toBeNull();
		await open('/r/Rex2Lost', { ...owner, status: 'closed', close_reason: 'removed', closed_at: daysAgo(1) });
		expect(screen.queryByRole('button', { name: l.reopen })).toBeNull();
		await open('/r/Rex2Lost', { ...reunited, is_mine: false });
		expect(screen.queryByRole('button', { name: l.reopen })).toBeNull();
		await open('/r/Rex2Lost', reunited);
		expect(screen.getByRole('button', { name: l.reopen })).toBeOnTheScreen();
	});

	test('a lost search closed by the 90-day expiry: the note and "Nadaljuj iskanje"; past the window, GONE', async () => {
		transition = () => mockError('GONE');
		await open('/r/Rex2Lost', { ...owner, status: 'closed', close_reason: 'expired', closed_at: daysAgo(1) });
		expect(screen.getByRole('status')).toHaveTextContent(l.expired_lost);
		await fireEvent.press(screen.getByRole('button', { name: l.expired_lost_action }));
		await waitFor(() => expect(toast.error).toHaveBeenCalledWith(sl.errors.GONE));
	});
});

describe('Uredi (r/[code]/edit)', () => {
	test('opens from the owner actions; saves what happened and the reward, then goes back', async () => {
		const page = await open('/r/Rex2Lost', { ...owner, reward_eur: 100, reward_note: null });
		await fireEvent.press(screen.getByRole('button', { name: r.owner_edit }));
		expect(page.getPathname()).toBe('/r/Rex2Lost/edit');
		expect(screen.getByRole('heading', { name: r.owner_edit })).toBeOnTheScreen();

		const about = screen.getByLabelText(sl.report_lost.circumstances_label);
		expect(about.props.value).toBe(owner.circumstances);
		await fireEvent.changeText(about, 'Ustrašil se je ognjemeta. Videli so ga pri Koseškem bajerju.');
		const amount = screen.getByLabelText(sl.report_lost.reward_amount_label);
		expect(amount.props.value).toBe('100');
		await fireEvent.changeText(amount, '50');
		await fireEvent.changeText(
			screen.getByLabelText(sl.report_lost.reward_note_label),
			'tudi za podatek, ki pomaga pri iskanju'
		);
		expect(screen.getByText(sl.report_lost.reward_warning)).toBeOnTheScreen();
		await fireEvent.press(screen.getByRole('button', { name: sl.common.save }));

		await waitFor(() => expect(toast).toHaveBeenCalledWith(sl.common.saved));
		expect(sent('PATCH')).toEqual([
			{
				circumstances: 'Ustrašil se je ognjemeta. Videli so ga pri Koseškem bajerju.',
				reward_eur: 50,
				reward_note: 'tudi za podatek, ki pomaga pri iskanju',
			},
		]);
		expect(page.getPathname()).toBe('/r/Rex2Lost');
	});

	test('turning the reward off removes it', async () => {
		await open('/r/Rex2Lost/edit', { ...owner, reward_eur: 100, reward_note: 'tudi za podatek' });
		await fireEvent.press(screen.getByRole('switch', { name: sl.report_lost.reward_toggle }));
		expect(screen.queryByLabelText(sl.report_lost.reward_amount_label)).toBeNull();
		await fireEvent.press(screen.getByRole('button', { name: sl.common.save }));
		await waitFor(() =>
			expect(sent('PATCH')).toEqual([{ circumstances: owner.circumstances, reward_eur: null, reward_note: null }])
		);
	});

	test('reward errors: nothing entered, not whole euros, contact data (on the client and from the API)', async () => {
		await open('/r/Rex2Lost/edit');
		await fireEvent.press(screen.getByRole('switch', { name: sl.report_lost.reward_toggle }));
		await fireEvent.press(screen.getByRole('button', { name: sl.common.save }));
		expect(await screen.findByText(sl.report_lost.reward_empty)).toBeOnTheScreen();

		await fireEvent.changeText(screen.getByLabelText(sl.report_lost.reward_amount_label), '12,5');
		await fireEvent.changeText(screen.getByLabelText(sl.report_lost.reward_note_label), 'Pokličite 041 123 456');
		await fireEvent.press(screen.getByRole('button', { name: sl.common.save }));
		expect(await screen.findByText(sl.report_lost.reward_amount_invalid)).toBeOnTheScreen();
		expect(screen.getByText(sl.report_lost.reward_note_contact_data)).toBeOnTheScreen();
		expect(sent('PATCH')).toEqual([]);

		patch = () =>
			new Response(
				JSON.stringify({
					error: {
						code: 'VALIDATION',
						message: 'invalid',
						issues: [{ path: 'reward_note', message: 'CONTACT_DATA' }],
					},
				}),
				{ status: 422, headers: { 'Content-Type': 'application/json' } }
			);
		await fireEvent.changeText(screen.getByLabelText(sl.report_lost.reward_amount_label), '20');
		await fireEvent.changeText(screen.getByLabelText(sl.report_lost.reward_note_label), 'za namig');
		await fireEvent.press(screen.getByRole('button', { name: sl.common.save }));
		expect(await screen.findByText(sl.report_lost.reward_note_contact_data)).toBeOnTheScreen();
		expect(screen.queryByRole('alert', { name: sl.errors.VALIDATION })).toBeNull();
	});

	test('a found report edits what happened only; other people go back to the report', async () => {
		const found: ReportOwnerView = { ...fx.ownerReport };
		await open(`/r/${found.short_code}/edit`, found);
		expect(screen.getByLabelText(sl.report_lost.circumstances_label)).toBeOnTheScreen();
		expect(screen.queryByRole('switch')).toBeNull();
		const page = await open(`/r/${found.short_code}/edit`, { ...found, is_mine: false });
		expect(page.getPathname()).toBe(`/r/${found.short_code}`);
	});
});

describe('reunited screen (P14 M3)', () => {
	test('the calm celebration: story consent off by default, its toast, Končano to the map, share the news', async () => {
		const shared = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' });
		served = ad;
		const page = await open('/r/Rex2Lost/reunited', reunited);
		expect(screen.getByRole('heading', { name: 'Rex je spet doma' })).toBeOnTheScreen();
		expect(screen.getByText(l.home_body)).toBeOnTheScreen();
		expect(screen.getByRole('img', { name: 'Rex' })).toBeOnTheScreen();

		const story = screen.getByRole('switch', { name: l.story_label });
		expect(story).not.toBeChecked();
		// The help text is shown under the switch and read with it, once.
		expect(screen.getByText(l.story_help, { includeHiddenElements: true })).toBeOnTheScreen();
		expect(story.props.accessibilityHint).toBe(l.story_help);
		await fireEvent.press(story);
		expect(story).toBeChecked();
		// The consent has no API field yet, so turning it on claims nothing: no toast. Off again needs no dialog.
		await fireEvent.press(story);
		expect(story).not.toBeChecked();
		expect(toast).not.toHaveBeenCalled();

		// No tip ask without an account, so the one ad (P21) shows in its slot, before "Končano".
		const unit = await screen.findByRole('link', { name: `Oglas: ${ad.title}. ${ad.body}` });
		const tree = JSON.stringify(screen.toJSON());
		expect(tree.indexOf(l.story_label)).toBeLessThan(tree.indexOf(unit.props.accessibilityLabel));
		expect(tree.indexOf(unit.props.accessibilityLabel)).toBeLessThan(tree.indexOf(l.done));

		await fireEvent.press(screen.getByRole('button', { name: l.share_news }));
		expect(shared).toHaveBeenCalledWith({
			message: 'Rex je spet doma. Hvala vsem, ki ste delili in pomagali. https://najdimo.test/r/Rex2Lost',
		});
		await fireEvent.press(screen.getByRole('button', { name: l.done }));
		expect(await screen.findByText('map tab')).toBeOnTheScreen();
		expect(page.getPathname()).toBe('/');
	});

	test('the owner gets the optional tip after the reunion, between the story switch and Končano (P15)', async () => {
		mockSession = { ...mockSession, me: {} };
		await open('/r/Rex2Lost/reunited', reunited);
		expect(screen.getByRole('heading', { name: sl.support.tip_title })).toBeOnTheScreen();
		for (const pill of screen.getAllByRole('radio')) expect(pill).not.toBeChecked();
		expect(screen.getByRole('button', { name: sl.support.pay_disabled })).toBeDisabled();
		await fireEvent.press(screen.getByRole('button', { name: sl.support.skip }));
		expect(screen.queryByRole('heading', { name: sl.support.tip_title })).toBeNull();
		// Skipping changes nothing else on the screen.
		expect(screen.getByRole('button', { name: l.done })).toBeOnTheScreen();
	});

	test('no ad beside the tip ask: hidden (not even asked for) while it asks, shown once skipped (P15, P21)', async () => {
		mockSession = { ...mockSession, me: {} };
		served = ad;
		// Another report: the ask for Rex2Lost was answered above (in-memory per app session).
		await open('/r/Mica1234/reunited', { ...reunited, id: 'b2', short_code: 'Mica1234' });
		expect(screen.getByRole('heading', { name: sl.support.tip_title })).toBeOnTheScreen();
		expect(screen.queryByRole('link', { name: /^Oglas: / })).toBeNull();
		expect(mockApi.calls.some((call) => call.path.startsWith('/v1/ads/'))).toBe(false);

		await fireEvent.press(screen.getByRole('button', { name: sl.support.skip }));
		expect(await screen.findByRole('link', { name: `Oglas: ${ad.title}. ${ad.body}` })).toBeOnTheScreen();
	});

	test('only for a manager of a reunited report; anyone else gets the report page', async () => {
		let page = await open('/r/Rex2Lost/reunited', { ...reunited, is_mine: false });
		expect(page.getPathname()).toBe('/r/Rex2Lost');
		page = await open('/r/Rex2Lost/reunited', owner);
		expect(page.getPathname()).toBe('/r/Rex2Lost');
	});
});

describe('My reports (settings/reports)', () => {
	test('the device queue, then the account reports with status words; a row opens the report', async () => {
		const mica: ReportOwnerView = { ...reunited, id: 'b2', short_code: 'Mica1234', name: 'Mica', species: 'cat' };
		myReports({ data: { pages: [{ items: [owner, mica], next_cursor: null }], pageParams: [null] } });
		const page = await open('/settings/reports');
		expect(screen.getByText('device queue')).toBeOnTheScreen();
		expect(screen.getByRole('link', { name: 'Mica, Pogrešana od 12. oktobra, Spet doma' })).toBeOnTheScreen();
		await fireEvent.press(screen.getByRole('link', { name: 'Rex, Pogrešana od 12. oktobra, Izgubljena' }));
		expect(page.getPathname()).toBe('/r/Rex2Lost');
	});

	test('empty, offline and failed', async () => {
		myReports({ data: { pages: [{ items: [], next_cursor: null }], pageParams: [null] } });
		await open('/settings/reports');
		expect(screen.getByText(sl.pets.my_reports_empty)).toBeOnTheScreen();

		myReports({ isUninitialized: true });
		await open('/settings/reports');
		expect(screen.getByRole('status')).toHaveTextContent(sl.errors.offline_body);

		const refetch = jest.fn();
		myReports({ error: { status: 500, data: { code: 'INTERNAL', message: 'x' } } as MyReports['error'], refetch });
		await open('/settings/reports');
		expect(screen.getByText(sl.errors.INTERNAL)).toBeOnTheScreen();
		await fireEvent.press(screen.getByRole('button', { name: sl.common.try_again }));
		expect(refetch).toHaveBeenCalled();
	});
});
