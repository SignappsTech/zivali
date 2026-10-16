// Loads the jest.setup Reanimated mock (with useReducedMotion) before expo-router's testing mocks register their own.
import 'react-native-reanimated';

import { PortalHost } from '@rn-primitives/portal';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Stack } from 'expo-router';
import { renderRouter } from 'expo-router/testing-library';
import * as React from 'react';
import { Text } from 'react-native';
import { Provider } from 'react-redux';
import { IntlProvider } from 'use-intl';

import { getMockEvents, initAnalytics, resetMockEvents, setConsent } from '@zivali/analytics';
import { abuseCreated } from '@zivali/api/__fixtures__/abuse';
import * as fx from '@zivali/api/__fixtures__/reports';
import { matchesApi } from '@zivali/api/matches';
import { createMockApi, mockError, type MockRequest } from '@zivali/api/mock';
import { api, createApiStore } from '@zivali/api/rtk';
import sl from '@zivali/i18n/dist/sl.json';
import type { MatchSuggestion, ReportOwnerView } from '@zivali/types';
import MatchReviewScreen from '@/app/r/[code]/matches/[id]';
import MatchesScreen from '@/app/r/[code]/matches/index';
import { MatchesNote } from '@/components/report/slots/matches-note';
import { toast } from '@/components/ui/sonner';
import { useReport } from '@/lib/data/reports';

jest.mock('@/lib/data/reports', () => ({ useReport: jest.fn() }));
jest.mock('@/lib/env', () => ({ env: { EXPO_PUBLIC_APP_URL: 'https://najdimo.test' } }));
jest.mock('@/lib/anonymous', () => ({ ensureSession: jest.fn(async () => ({})) }));
jest.mock('@/lib/auth', () => ({ providers: [], signInWithProvider: jest.fn() }));
jest.mock('@/components/ui/sonner', () => ({ toast: Object.assign(jest.fn(), { error: jest.fn() }) }));
const mockNetwork = { isConnected: true, isInternetReachable: true };
jest.mock('@/lib/net', () => ({
	isOnline: (s: { isConnected?: boolean }) => s.isConnected !== false,
	useNetworkState: () => mockNetwork,
}));

const m = sl.matches;
const NOW = new Date('2026-10-16T12:00:00Z');
const SISKA = { lat: 46.07, lng: 14.49, radius_m: 300 };
const BEZIGRAD = { lat: 46.08, lng: 14.51, radius_m: 300 };

const owner: ReportOwnerView = {
	...fx.ownerReport,
	short_code: 'Luna2Lst',
	type: 'lost',
	name: 'Luna',
	species: 'dog',
	colours: ['golden'],
	size: 'l',
	sex: 'female',
	area: SISKA,
	event_at: '2026-10-12T16:30:00Z',
	region_slug: 'osrednjeslovenska',
	manager_role: 'owner',
	is_mine: true,
	chip_number: '705000000123456',
	location: { lat: 46.0712, lng: 14.4893 },
	photos: [
		{ url: 'https://m.test/luna/1.webp', thumb_url: 'https://m.test/luna/1t.webp', alt: 'Luna, zlata psička' },
		{ url: 'https://m.test/luna/2.webp', thumb_url: 'https://m.test/luna/2t.webp', alt: 'Luna od strani' },
	].map((p) => ({ ...p, width: 1600, height: 1200 })),
};
const other = (patch: Partial<MatchSuggestion['other']>): MatchSuggestion['other'] => ({
	id: 'bbbbbbbb-0000-4000-8000-000000000001',
	short_code: 'Cand0001',
	type: 'found',
	species: 'dog',
	breed_codes: [],
	colours: ['golden'],
	size: 'l',
	sex: 'female',
	photos: [{ ...fx.publicReport.photos[0]!, alt: 'zlat pes, najden v Šiški' }],
	event_at: '2026-10-12T19:40:00Z',
	area: SISKA,
	...patch,
});
const chip: MatchSuggestion = {
	id: 'aaaaaaaa-0000-4000-8000-000000000001',
	score: 1,
	strength: 'strong',
	chip_match: true,
	state: 'suggested',
	reasons: [
		{ code: 'chip' },
		{ code: 'distance', band: 'lt1' },
		{ code: 'time', hours_band: 'lt24' },
		{ code: 'size', match: 'equal' },
		{ code: 'colour', overlap: 1 },
		{ code: 'sex', match: 'equal' },
	],
	other: other({}),
};
const confirmed: MatchSuggestion = {
	id: 'aaaaaaaa-0000-4000-8000-000000000002',
	score: 0.7,
	strength: 'good',
	chip_match: false,
	state: 'confirmed',
	reasons: [
		{ code: 'distance', band: '1to3' },
		{ code: 'time', hours_band: '24to72' },
	],
	other: other({ short_code: 'Cand0002', type: 'sighted', area: BEZIGRAD }),
};
const possible: MatchSuggestion = {
	id: 'aaaaaaaa-0000-4000-8000-000000000003',
	score: 0.55,
	strength: 'possible',
	chip_match: false,
	state: 'suggested',
	reasons: [
		{ code: 'distance', band: '3to10' },
		{ code: 'time', hours_band: 'gt72' },
		{ code: 'size', match: 'adjacent' },
		{ code: 'colour', overlap: 0.5 },
	],
	other: other({
		short_code: 'Cand0003',
		type: 'sighted',
		colours: ['golden', 'white'],
		size: 'm',
		sex: 'unknown',
		area: BEZIGRAD,
		event_at: '2026-10-13T05:15:00Z',
	}),
};

const CONVERSATION = 'c0e1d2f3-4a5b-4c6d-8e7f-9a0b1c2d3e00';
let items: MatchSuggestion[] = [];
let listOverride: (() => unknown) | null = null;
let confirmFailure: Response | null = null;
const mockApi = createMockApi({
	'GET /v1/reports/:code/matches': () => (listOverride ? listOverride() : { items }),
	'POST /v1/matches/:id/confirm': () => confirmFailure ?? { conversation_id: CONVERSATION },
	'POST /v1/abuse-reports': abuseCreated,
	'POST /v1/matches/:id/reject': ({ params }: MockRequest) => {
		items = items.filter((match) => match.id !== params.id);
		return undefined;
	},
	'POST /v1/geo/reverse': ({ body }: MockRequest) => ({
		place: {
			label: (body as { lat: number }).lat === SISKA.lat ? 'Šiška, Ljubljana' : 'Bežigrad, Ljubljana',
			lat: 0,
			lng: 0,
			kind: 'district',
		},
	}),
});

let consent: string | null = null;
initAnalytics({ provider: 'mock', storage: { get: () => consent, set: (v) => void (consent = v) } });

const stores: ReturnType<typeof createApiStore>[] = [];
// The withdrawn check remembers lists per report code for the app session, so each test opens its own code.
let n = 0;
const nextCode = () => `Luna${++n}`;

async function open(path: string) {
	jest.mocked(useReport).mockReturnValue({
		data: owner,
		source: 'network',
		lastSyncAt: null,
		isLoading: false,
		refetch: jest.fn(),
	});
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
	const page = renderRouter(
		{
			_layout: () => <Stack screenOptions={{ headerShown: false }} />,
			'r/[code]/index': () => <Text>report screen</Text>,
			'r/[code]/matches/index': MatchesScreen,
			'r/[code]/matches/[id]': MatchReviewScreen,
			'inbox/[id]': () => <Text>chat screen</Text>,
			'auth/check-email': () => <Text>check email screen</Text>,
		},
		{ initialUrl: path, wrapper: Providers }
	);
	await page;
	return { page, store };
}

const calls = (path: string) => mockApi.calls.filter((call) => call.method === 'POST' && call.path.startsWith(path));

beforeEach(() => {
	items = [possible, chip, confirmed];
	confirmFailure = null;
	listOverride = null;
	mockApi.calls.length = 0;
	mockNetwork.isConnected = true;
	setConsent({ analytics: false });
	resetMockEvents();
	jest.mocked(toast).mockClear();
	jest.mocked(toast.error).mockClear();
});
afterEach(() => {
	jest.useRealTimers();
	for (const store of stores) store.dispatch(api.util.resetApiState());
	stores.length = 0;
});

describe('matches list (P11 mobile)', () => {
	test('ranked rows: the chip match first under its line, then by score; strength as words and confirmed rows', async () => {
		await open(`/r/${nextCode()}/matches`);

		expect(screen.getByRole('heading', { name: m.title })).toBeOnTheScreen();
		expect(await screen.findByText('3 možna ujemanja')).toBeOnTheScreen();
		expect(screen.getByText('Luna')).toBeOnTheScreen();
		const rows = await waitFor(() => {
			const links = screen.getAllByRole('link');
			expect(links[0]).toHaveAccessibleName(
				'Številka čipa se ujema, Šiška · manj kot 1 km, Najdena, Moč ujemanja: Zelo verjetno, Prijavljena manj kot 24 ur po izgubi'
			);
			return links;
		});
		expect(rows.map((row) => row.props.accessibilityLabel)).toEqual([
			expect.stringContaining('Zelo verjetno'),
			'Bežigrad · 3–10 km, Opažena, Moč ujemanja: Mogoče, Prijavljena več kot 3 dni po izgubi',
			'Bežigrad · 1–3 km, Opažena, Ujemanje potrjeno, Prijavljena 1–3 dni po izgubi',
		]);
		// No numbers: the strength is a word with bars, the bars carry the label.
		expect(screen.getAllByRole('img', { name: 'Moč ujemanja: Mogoče' })).toHaveLength(1);
		expect(screen.queryByText(/0[.,]\d/)).toBeNull();
		expect(screen.getByText(m.chip_row, { includeHiddenElements: true })).toBeOnTheScreen();
	});

	test('a row opens its review', async () => {
		const code = nextCode();
		const { page } = await open(`/r/${code}/matches`);
		await fireEvent.press((await screen.findAllByRole('link'))[0]!);
		expect(await screen.findByRole('heading', { name: m.review_title })).toBeOnTheScreen();
		expect(page.getPathname()).toBe(`/r/${code}/matches/${chip.id}`);
		expect(await screen.findByLabelText(/^Kraj: Moja žival Šiška/)).toBeOnTheScreen();
	});

	test('empty: the search keeps running, with "Deli iskanje"', async () => {
		items = [];
		await open(`/r/${nextCode()}/matches`);
		expect(await screen.findByRole('heading', { name: m.empty_title })).toBeOnTheScreen();
		expect(screen.getByText(m.empty_body)).toBeOnTheScreen();
		expect(screen.getByRole('button', { name: m.empty_share })).toBeOnTheScreen();
		expect(screen.getByText('0 možnih ujemanj')).toBeOnTheScreen();
	});

	test('a match the server withdrew disappears with the note', async () => {
		const { store } = await open(`/r/${nextCode()}/matches`);
		await screen.findByText('3 možna ujemanja');
		expect(screen.queryByText(m.withdrawn)).toBeNull();

		items = [chip, confirmed];
		await act(async () => void store.dispatch(matchesApi.util.invalidateTags(['Matches'])));
		expect(await screen.findByText(m.withdrawn)).toBeOnTheScreen();
		expect(screen.getAllByRole('link')).toHaveLength(2);
	});

	test('not the owner: the permission sentence and a way back, no retry', async () => {
		listOverride = () => mockError('FORBIDDEN');
		await open(`/r/${nextCode()}/matches`);
		expect(await screen.findByText(sl.errors.FORBIDDEN)).toBeOnTheScreen();
		expect(screen.queryByRole('button', { name: sl.common.try_again })).toBeNull();
		expect(screen.getAllByRole('button', { name: sl.common.back })).toHaveLength(2);
	});

	test('loading shows one "Nalaganje …"; a failure the error sentence with retry', async () => {
		listOverride = () => new Promise(() => undefined);
		await open(`/r/${nextCode()}/matches`);
		expect(screen.getByText(sl.common.loading)).toBeOnTheScreen();

		listOverride = () => mockError('NOT_FOUND');
		await open(`/r/${nextCode()}/matches`);
		expect(await screen.findByText(sl.common.inline_error)).toBeOnTheScreen();
		listOverride = null;
		await fireEvent.press(screen.getByRole('button', { name: sl.common.try_again }));
		expect(await screen.findByText('3 možna ujemanja')).toBeOnTheScreen();
	});
});

describe('match review (P11 mobile)', () => {
	test('compares photos, strength, reasons and details, without contact data or numbers', async () => {
		await open(`/r/${nextCode()}/matches/${chip.id}`);

		expect(screen.getByRole('heading', { name: m.review_title })).toBeOnTheScreen();
		// The candidate first; the toggle switches to my pet, whose two photos get thumbnails.
		expect(
			await screen.findByRole('img', { name: 'Prijavljena žival: zlat pes, najden v Šiški' })
		).toBeOnTheScreen();
		await fireEvent.press(screen.getByRole('tab', { name: m.toggle_mine }));
		expect(screen.getByRole('img', { name: 'Vaša žival: Luna, zlata psička' })).toBeOnTheScreen();
		await fireEvent.press(screen.getByRole('button', { name: 'Fotografija 2 od 2' }));
		expect(screen.getByRole('img', { name: 'Vaša žival: Luna od strani' })).toBeOnTheScreen();
		expect(screen.getByRole('tab', { name: m.toggle_found })).toBeOnTheScreen();

		expect(screen.getByLabelText('Ujemanje: Zelo verjetno')).toBeOnTheScreen();
		expect(screen.getByText(m.chip_banner)).toBeOnTheScreen();
		for (const line of [
			'Številka čipa je enaka.',
			'Kraja sta manj kot 1 km narazen.',
			'Prijavljena manj kot 24 ur po izgubi.',
			'Velikost se ujema.',
			'Barva se ujema.',
			'Spol se ujema.',
		])
			expect(screen.getByText(line)).toBeOnTheScreen();

		expect(screen.getByRole('heading', { name: m.table_caption })).toBeOnTheScreen();
		expect(screen.getByLabelText('Vrsta: Moja žival Pes, Prijavljena žival Pes. Ujema se')).toBeOnTheScreen();
		expect(
			screen.getByLabelText('Velikost: Moja žival Velika, Prijavljena žival Velika. Ujema se')
		).toBeOnTheScreen();
		expect(
			await screen.findByLabelText(
				'Kraj: Moja žival Šiška, Ljubljana, Prijavljena žival Šiška, Ljubljana. Ujema se'
			)
		).toBeOnTheScreen();
		expect(
			screen.getByLabelText('Kdaj: Moja žival 12. 10., 18:30, Prijavljena žival 12. 10., 21:40. Ni primerjano')
		).toBeOnTheScreen();

		expect(screen.getByText(m.confirm_note)).toBeOnTheScreen();
		expect(screen.getByRole('button', { name: m.confirm })).toBeOnTheScreen();
		expect(screen.getByRole('button', { name: m.reject })).toBeOnTheScreen();
		// Never the chip number, the exact point or a score.
		expect(screen.queryByText(new RegExp(owner.chip_number!))).toBeNull();
		expect(screen.queryByText(/46[.,]07/)).toBeNull();
		expect(screen.queryByText(/%/)).toBeNull();
	});

	test('a sighting carries the caveat; differing and unknown details say so in words', async () => {
		await open(`/r/${nextCode()}/matches/${possible.id}`);
		expect(await screen.findByText(m.caveat_sighting)).toBeOnTheScreen();
		expect(screen.getByRole('tab', { name: m.toggle_sighted })).toBeOnTheScreen();
		expect(screen.getByLabelText('Ujemanje: Mogoče')).toBeOnTheScreen();
		expect(screen.getByText('Barva se delno ujema.')).toBeOnTheScreen();
		// An adjacent size has no reason line.
		expect(screen.queryByText('Velikost se ujema.')).toBeNull();
		expect(
			screen.getByLabelText('Velikost: Moja žival Velika, Prijavljena žival Srednja. Razlikuje se')
		).toBeOnTheScreen();
		expect(
			screen.getByLabelText('Barva: Moja žival Zlata, Prijavljena žival Zlata, bela. Razlikuje se')
		).toBeOnTheScreen();
		expect(
			screen.getByLabelText('Spol: Moja žival Samica, Prijavljena žival Ni podatka. Ni podatka')
		).toBeOnTheScreen();
		expect(screen.queryByText(m.chip_banner)).toBeNull();
	});

	test('confirm opens the conversation and fires match_confirmed only with consent', async () => {
		setConsent({ analytics: true });
		const { page } = await open(`/r/${nextCode()}/matches/${chip.id}`);
		await screen.findByRole('button', { name: m.confirm });
		await waitFor(() =>
			expect(getMockEvents()).toEqual([
				expect.objectContaining({
					name: 'match_suggested',
					params: { species: 'dog', region: 'osrednjeslovenska', match_source: 'chip' },
				}),
			])
		);

		await fireEvent.press(screen.getByRole('button', { name: m.confirm }));
		expect(await screen.findByText('chat screen')).toBeOnTheScreen();
		expect(page.getPathname()).toBe(`/inbox/${CONVERSATION}`);
		expect(calls('/v1/matches/')).toEqual([expect.objectContaining({ path: `/v1/matches/${chip.id}/confirm` })]);
		expect(getMockEvents().map((e) => [e.name, e.params])).toEqual([
			['match_suggested', { species: 'dog', region: 'osrednjeslovenska', match_source: 'chip' }],
			['match_confirmed', { species: 'dog', region: 'osrednjeslovenska', match_source: 'chip' }],
		]);
	});

	test('without consent no event fires', async () => {
		await open(`/r/${nextCode()}/matches/${chip.id}`);
		await fireEvent.press(await screen.findByRole('button', { name: m.confirm }));
		expect(await screen.findByText('chat screen')).toBeOnTheScreen();
		expect(getMockEvents()).toEqual([]);
	});

	test('a failed confirm stays on the review with the error sentence', async () => {
		confirmFailure = mockError('UNVERIFIED_EMAIL');
		await open(`/r/${nextCode()}/matches/${chip.id}`);
		await fireEvent.press(await screen.findByRole('button', { name: m.confirm }));
		expect(await screen.findByText(sl.errors.UNVERIFIED_EMAIL)).toBeOnTheScreen();
		expect(screen.queryByText('chat screen')).toBeNull();
		await fireEvent.press(screen.getByRole('button', { name: sl.auth.gate_unverified_title }));
		expect(await screen.findByText('check email screen')).toBeOnTheScreen();
	});

	test('reject asks once, sends the optional reason and hides the match for good', async () => {
		const code = nextCode();
		const { page } = await open(`/r/${code}/matches`);
		await fireEvent.press((await screen.findAllByRole('link'))[1]!);
		await fireEvent.press(await screen.findByRole('button', { name: m.reject }));

		expect(await screen.findByRole('heading', { name: m.reject_title })).toBeOnTheScreen();
		expect(screen.getByText(m.reject_body)).toBeOnTheScreen();
		await fireEvent.changeText(screen.getByLabelText(m.reject_reason), '  Druga barva ovratnice  ');
		await fireEvent.press(screen.getByRole('button', { name: m.reject_confirm }));

		await waitFor(() => expect(toast).toHaveBeenCalledWith(m.rejected_toast));
		expect(calls('/v1/matches/')).toEqual([
			expect.objectContaining({
				path: `/v1/matches/${possible.id}/reject`,
				body: { reason: 'Druga barva ovratnice' },
			}),
		]);
		await waitFor(() => expect(page.getPathname()).toBe(`/r/${code}/matches`));
		await waitFor(() => expect(screen.getAllByRole('link')).toHaveLength(2));
		// The owner hid it: no "withdrawn" note.
		expect(screen.queryByText(m.withdrawn)).toBeNull();
	});

	test('reject without a reason sends an empty body; cancel sends nothing', async () => {
		await open(`/r/${nextCode()}/matches/${possible.id}`);
		await fireEvent.press(await screen.findByRole('button', { name: m.reject }));
		await fireEvent.press(await screen.findByRole('button', { name: m.reject_cancel }));
		await waitFor(() => expect(screen.queryByRole('heading', { name: m.reject_title })).toBeNull());
		expect(calls('/v1/matches/')).toEqual([]);

		await fireEvent.press(screen.getByRole('button', { name: m.reject }));
		await fireEvent.press(await screen.findByRole('button', { name: m.reject_confirm }));
		await waitFor(() => expect(calls('/v1/matches/')).toHaveLength(1));
		expect(calls('/v1/matches/')[0]!.body).toEqual({});
	});

	test('already confirmed: the status and "Odpri pogovor", no second event', async () => {
		setConsent({ analytics: true });
		const { page } = await open(`/r/${nextCode()}/matches/${confirmed.id}`);
		expect(await screen.findByText(m.confirmed)).toBeOnTheScreen();
		expect(screen.getByText(m.already_confirmed)).toBeOnTheScreen();
		expect(screen.queryByRole('button', { name: m.confirm })).toBeNull();
		await fireEvent.press(screen.getByRole('button', { name: m.open_chat }));
		expect(await screen.findByText('chat screen')).toBeOnTheScreen();
		expect(page.getPathname()).toBe(`/inbox/${CONVERSATION}`);
		expect(getMockEvents()).toEqual([]);
	});

	test('offline: readable, both actions disabled with the reason', async () => {
		// The list loaded before the connection dropped stays in memory (never on the device).
		mockNetwork.isConnected = false;
		await open(`/r/${nextCode()}/matches/${chip.id}`);
		expect(await screen.findByText(m.offline)).toBeOnTheScreen();
		expect(screen.getByRole('button', { name: m.confirm })).toBeDisabled();
		expect(screen.getByRole('button', { name: m.reject })).toBeDisabled();
		expect(screen.getByRole('button', { name: m.confirm }).props.accessibilityHint).toBe(m.offline);
		expect(screen.getByText(m.chip_banner)).toBeOnTheScreen();
	});

	test('a match that is no longer there says so', async () => {
		await open(`/r/${nextCode()}/matches/aaaaaaaa-0000-4000-8000-00000000dead`);
		expect(await screen.findByRole('heading', { name: m.unavailable_title })).toBeOnTheScreen();
	});
});

describe('match review abuse entry (TASK-20.6)', () => {
	test('"Prijavi zlorabo" reports the other report: the submit sends target_id = other.id', async () => {
		await open(`/r/${nextCode()}/matches/${chip.id}`);
		await fireEvent.press(await screen.findByRole('button', { name: sl.report.more }));
		await fireEvent.press(screen.getByRole('menuitem', { name: sl.report.more_abuse }));
		expect(screen.getByRole('heading', { name: sl.abuse.title })).toBeOnTheScreen();
		await fireEvent.press(screen.getByRole('radio', { name: sl.abuse.reason_scam }));
		await fireEvent.press(screen.getByRole('button', { name: sl.abuse.send }));
		expect(await screen.findByRole('heading', { name: sl.abuse.done_title })).toBeOnTheScreen();
		expect(mockApi.calls.find((call) => call.path === '/v1/abuse-reports')?.body).toEqual({
			target_type: 'report',
			target_id: chip.other.id,
			reason: 'scam',
		});
	});
});

describe('matches note slot (P9)', () => {
	const renderNote = async (report: Partial<ReportOwnerView>, offline = false) => {
		const store = createApiStore(mockApi);
		stores.push(store);
		const page = renderRouter(
			{
				_layout: () => <Stack screenOptions={{ headerShown: false }} />,
				index: () => <MatchesNote report={{ ...owner, ...report }} offline={offline} />,
				'r/[code]/matches/index': () => <Text>matches list</Text>,
			},
			{
				initialUrl: '/',
				wrapper: ({ children }) => (
					<Provider store={store}>
						<IntlProvider locale="sl" messages={sl} timeZone="Europe/Ljubljana" now={NOW}>
							{children}
						</IntlProvider>
					</Provider>
				),
			}
		);
		await page;
		return { page };
	};

	test('the owner of an open lost report sees the suggested count and "Poglej" opens the list', async () => {
		const { page } = await renderNote({});
		// Two suggested (the confirmed one is not new).
		expect(await screen.findByText('2 možni ujemanji')).toBeOnTheScreen();
		await fireEvent.press(screen.getByRole('button', { name: sl.report.owner_matches_link }));
		expect(await screen.findByText('matches list')).toBeOnTheScreen();
		expect(page.getPathname()).toBe('/r/Luna2Lst/matches');
	});

	test.each([
		['a visitor', { is_mine: false }, false],
		['offline', {}, true],
	])('nothing and no request for %s', async (_, report, offline) => {
		await renderNote(report, offline);
		await act(async () => undefined);
		expect(screen.queryByText(/ujemanj/)).toBeNull();
		expect(mockApi.calls).toEqual([]);
	});

	test('nothing when the matches are all confirmed', async () => {
		items = [confirmed];
		await renderNote({});
		await waitFor(() => expect(mockApi.calls).toHaveLength(1));
		expect(screen.queryByText(/ujemanj/)).toBeNull();
	});

	test('a held report still says why first', async () => {
		await renderNote({ moderation_state: 'held' });
		expect(await screen.findByText(sl.report.owner_held)).toBeOnTheScreen();
		expect(screen.queryByText(/ujemanj/)).toBeNull();
	});
});
