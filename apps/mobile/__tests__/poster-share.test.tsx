// Loads the jest.setup Reanimated mock (with useReducedMotion) before expo-router's testing mocks register their own.
import 'react-native-reanimated';

import { PortalHost } from '@rn-primitives/portal';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import * as Clipboard from 'expo-clipboard';
import { File } from 'expo-file-system';
import { Stack } from 'expo-router';
import { renderRouter } from 'expo-router/testing-library';
import * as Sharing from 'expo-sharing';
import * as React from 'react';
import { Linking, Share, Text } from 'react-native';
import { Provider } from 'react-redux';
import { IntlProvider } from 'use-intl';

import { getMockEvents, initAnalytics, resetMockEvents, setConsent } from '@zivali/analytics';
import * as fx from '@zivali/api/__fixtures__/reports';
import { geocodeApi } from '@zivali/api/geocode';
import { createMockApi } from '@zivali/api/mock';
import { api, createApiStore } from '@zivali/api/rtk';
import sl from '@zivali/i18n/dist/sl.json';
import { formatDayMonth } from '@zivali/i18n/format';
import type { PublicReport, ReportOwnerView } from '@zivali/types';
import PosterScreen from '@/app/r/[code]/poster';
import { toast } from '@/components/ui/sonner';
import { useReport } from '@/lib/data/reports';

jest.mock('@/lib/data/reports', () => ({ useReport: jest.fn() }));
jest.mock('@/lib/env', () => ({ env: { EXPO_PUBLIC_APP_URL: 'https://najdimo.test' } }));
jest.mock('@/components/ui/sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
// The detail screen's slot A (imported for the back button) brings the auth gate and its session store.
jest.mock('@/components/auth/gate', () => ({ AuthGate: () => null }));
jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn(async () => true) }));
jest.mock('expo-sharing', () => ({ shareAsync: jest.fn(async () => undefined) }));
jest.mock('expo-file-system', () => {
	class MockFile {
		uri: string;
		constructor(dir: { uri: string }, name: string) {
			this.uri = `${dir.uri}/${name}`;
		}
		static downloadFileAsync = jest.fn(async (_url: string, destination: MockFile) => destination);
	}
	return { File: MockFile, Paths: { cache: { uri: 'file:///cache' } } };
});

const p = sl.poster;
const s = sl.share;
const URL = 'https://najdimo.test/r/Rex2Lost';
const NOW = new Date('2026-10-16T12:00:00Z');

const lost: PublicReport = {
	...fx.publicReport,
	short_code: 'Rex2Lost',
	type: 'lost',
	name: 'Rex',
	event_at: '2026-10-12T08:00:00Z',
	area: { lat: 46.066, lng: 14.493, radius_m: 500 },
};
const owner: ReportOwnerView = {
	...fx.ownerReport,
	...lost,
	is_mine: true,
	manager_role: 'owner',
	chip_number: '705000000123456',
	location: { lat: 46.0672, lng: 14.4921 },
};
const date = formatDayMonth(lost.event_at, 'sl');
const shareText = `Pomagajte najti psa: Rex. Nazadnje viden ${date}, območje Šiška, Ljubljana. Ste ga videli? ${URL}`;

const download = jest.mocked(File.downloadFileAsync);
const shareFile = jest.mocked(Sharing.shareAsync);
const clipboard = jest.mocked(Clipboard.setStringAsync);
const mockUseReport = jest.mocked(useReport);
type Result = ReturnType<typeof useReport>;

const consent = new Map<string, string>();
const storage = { get: () => consent.get('zz_consent') ?? null, set: (v: string) => void consent.set('zz_consent', v) };

const stores: ReturnType<typeof createApiStore>[] = [];
const mockApi = createMockApi({
	'POST /v1/geo/reverse': {
		place: {
			label: 'Šiška, Ljubljana',
			lat: 46.066,
			lng: 14.493,
			kind: 'district',
			municipality_slug: 'ljubljana',
		},
	},
	'GET /v1/config/public': {
		'vet_partner.enabled': false,
		'share.facebook_groups': [
			{
				name: 'Izgubljene živali – Gorenjska',
				url: 'https://www.facebook.com/groups/gor',
				regions: ['gorenjska'],
			},
			{ name: 'Brez varne povezave', url: 'http://insecure.example/group' },
			{
				name: 'Izgubljene živali – Osrednja Slovenija',
				url: 'https://www.facebook.com/groups/osr',
				regions: ['osrednjeslovenska'],
			},
		],
		'share.radio_form_url': 'https://radio.example/obvestila',
	},
});

async function open(patch: Partial<Result>) {
	mockUseReport.mockReturnValue({
		data: undefined,
		source: 'network',
		lastSyncAt: null,
		isLoading: false,
		refetch: jest.fn(),
		...patch,
	} as Result);
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
			index: () => <Text>map tab</Text>,
			'r/[code]/index': () => <Text>detail</Text>,
			'r/[code]/poster': PosterScreen,
		},
		{ initialUrl: '/r/Rex2Lost/poster', wrapper: Providers }
	);
	await page;
	return store;
}
/** The texts name the area once the reverse lookup of the public point is back. */
async function areaReady(store: ReturnType<typeof createApiStore>) {
	const place = geocodeApi.endpoints.reversePlace.select({ lat: lost.area.lat, lng: lost.area.lng });
	await waitFor(() => expect(place(store.getState()).data?.label).toBe('Šiška, Ljubljana'));
	// Then the screen has rendered with it.
	await act(async () => {});
}
const events = () => getMockEvents().filter((e) => e.name !== 'screen_view');

beforeEach(() => {
	jest.clearAllMocks();
	mockApi.calls.length = 0;
	consent.clear();
	initAnalytics({ provider: 'mock', storage });
	setConsent({ analytics: true });
	resetMockEvents();
});
// renderRouter runs on fake timers.
afterEach(() => {
	jest.useRealTimers();
	for (const store of stores) store.dispatch(api.util.resetApiState());
	stores.length = 0;
});

describe('P18 poster and sharing (mobile)', () => {
	test('the screen: poster language, the A4 preview, "Prenesi PDF" with its file name, share rows, QR note', async () => {
		await open({ data: owner });
		expect(screen.getByRole('heading', { name: p.screen_title })).toBeOnTheScreen();
		expect(screen.getByRole('radio', { name: p.language_sl, checked: true })).toBeOnTheScreen();
		expect(screen.getByRole('radio', { name: p.language_en, checked: false })).toBeOnTheScreen();
		expect(
			screen.getByRole('img', { name: 'Predogled plakata: Pogrešan pes Rex, s fotografijo in kodo QR' })
		).toBeOnTheScreen();
		expect(screen.getByRole('button', { name: p.download })).toBeEnabled();
		expect(screen.getByText('Datoteka: najdimo-Rex2Lost.pdf')).toBeOnTheScreen();
		expect(screen.getByRole('heading', { name: s.title })).toBeOnTheScreen();
		for (const name of [s.whatsapp, s.facebook, s.copy, s.more])
			expect(screen.getByRole('button', { name })).toBeOnTheScreen();
		expect(screen.getByText(p.qr_note)).toBeOnTheScreen();
	});

	test('"Prenesi PDF" downloads the web poster in the poster language and offers it through the share sheet (AC 2, 3)', async () => {
		await open({ data: owner });
		await fireEvent.press(screen.getByRole('button', { name: p.download }));
		expect(download).toHaveBeenCalledWith(
			`${URL}/poster.pdf?lang=sl`,
			expect.objectContaining({ uri: 'file:///cache/najdimo-Rex2Lost.pdf' }),
			{ idempotent: true }
		);
		expect(shareFile).toHaveBeenCalledWith('file:///cache/najdimo-Rex2Lost.pdf', {
			mimeType: 'application/pdf',
			UTI: 'com.adobe.pdf',
		});
		expect(events()).toEqual([
			{ name: 'poster_download', params: { species: 'dog', region: 'osrednjeslovenska' } },
		]);

		// English: the preview, the PDF and the texts switch with the pill.
		await fireEvent.press(screen.getByRole('radio', { name: p.language_en }));
		expect(screen.getByRole('img', { name: 'Predogled plakata: Missing dog Rex, s fotografijo in kodo QR' }));
		await fireEvent.press(screen.getByRole('button', { name: p.download }));
		expect(download).toHaveBeenLastCalledWith(`${URL}/poster.pdf?lang=en`, expect.anything(), { idempotent: true });

		// Without consent the download still works and nothing is counted.
		setConsent({ analytics: false });
		resetMockEvents();
		await fireEvent.press(screen.getByRole('button', { name: p.download }));
		expect(download).toHaveBeenCalledTimes(3);
		expect(events()).toEqual([]);
	});

	test('while preparing the primary is busy ("Pripravljamo …"); a failed download shows the error with retry', async () => {
		let fail!: (error: Error) => void;
		download.mockImplementationOnce(() => new Promise((_, reject) => (fail = reject)));
		await open({ data: owner });
		await fireEvent.press(screen.getByRole('button', { name: p.download }));
		expect(screen.getByRole('button', { name: p.preparing, busy: true })).toBeOnTheScreen();
		await act(async () => fail(new Error('HTTP 503')));

		expect(screen.getByText(p.failed)).toBeOnTheScreen();
		expect(screen.getByRole('button', { name: p.download })).toBeDisabled();
		expect(shareFile).not.toHaveBeenCalled();
		expect(events()).toEqual([]);
		await fireEvent.press(screen.getByRole('button', { name: sl.common.try_again }));
		expect(shareFile).toHaveBeenCalledTimes(1);
		expect(screen.queryByText(p.failed)).toBeNull();
		expect(screen.getByRole('button', { name: p.download })).toBeEnabled();
	});

	test('offline (the saved copy): the download waits for the network, the short link still shares', async () => {
		const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' });
		await open({ data: owner, source: 'cache', lastSyncAt: NOW.getTime() });
		expect(screen.getByText(sl.report.action_offline)).toBeOnTheScreen();
		expect(screen.getByRole('button', { name: p.download })).toBeDisabled();
		await fireEvent.press(screen.getByRole('button', { name: s.more }));
		expect(share).toHaveBeenCalledWith({ message: URL });
		expect(mockApi.calls).toEqual([]);
		// Without the area name there are no ready kit texts.
		expect(screen.queryByRole('heading', { name: s.kit_title })).toBeNull();
	});

	test('without a usable photo the poster is blocked with the note', async () => {
		await open({ data: { ...owner, photos: [] } });
		expect(screen.getByText(p.no_photo)).toBeOnTheScreen();
		expect(screen.queryByRole('button', { name: p.download })).toBeNull();
	});

	test('a closed report has no poster and no sharing', async () => {
		await open({ data: { ...owner, status: 'closed' } });
		expect(screen.getByRole('status')).toHaveTextContent(p.unavailable_closed);
		expect(screen.queryByRole('button', { name: p.download })).toBeNull();
		expect(screen.queryByRole('button', { name: s.more })).toBeNull();
	});

	test('share rows: WhatsApp, Facebook, copy link and the system sheet, counted by method with consent only (AC 1, 3)', async () => {
		const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' });
		const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
		await open({ data: owner });
		// The owner's kit shows once the area name is back, and with it the texts.
		await screen.findByRole('heading', { name: s.kit_title });

		await fireEvent.press(screen.getByRole('button', { name: s.whatsapp }));
		expect(openURL).toHaveBeenLastCalledWith(`https://wa.me/?text=${encodeURIComponent(shareText)}`);
		await fireEvent.press(screen.getByRole('button', { name: s.facebook }));
		expect(openURL).toHaveBeenLastCalledWith(
			`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(URL)}`
		);
		await fireEvent.press(screen.getByRole('button', { name: s.copy }));
		expect(clipboard).toHaveBeenLastCalledWith(URL);
		expect(toast.success).toHaveBeenCalledWith(s.copied);
		await fireEvent.press(screen.getByRole('button', { name: s.more }));
		expect(share).toHaveBeenLastCalledWith({ message: shareText });
		// No contact data or exact location in what leaves the app.
		for (const text of [shareText, URL]) {
			expect(text).not.toContain(owner.chip_number);
			expect(text).not.toContain(String(owner.location.lat));
		}
		expect(events()).toEqual(
			['whatsapp', 'facebook', 'copy_link', 'native'].map((method) => ({
				name: 'share',
				params: { method, report_type: 'lost', species: 'dog' },
			}))
		);

		setConsent({ analytics: false });
		resetMockEvents();
		await fireEvent.press(screen.getByRole('button', { name: s.more }));
		expect(share).toHaveBeenCalledTimes(2);
		expect(events()).toEqual([]);
	});

	test('the system sheet dismissed without a target is not counted', async () => {
		jest.spyOn(Share, 'share').mockResolvedValue({ action: 'dismissedAction' });
		await open({ data: owner });
		await fireEvent.press(screen.getByRole('button', { name: s.more }));
		expect(events()).toEqual([]);
	});

	test('the owner Facebook kit: ready SL text to copy, the square image, groups (own region first), radio form (AC 4)', async () => {
		const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
		await open({ data: owner });
		expect(await screen.findByRole('heading', { name: s.kit_title })).toBeOnTheScreen();
		const post = `Pogrešamo psa: Rex. Nazadnje viden ${date}, območje Šiška, Ljubljana. Če ste ga videli, nam prosim sporočite prek povezave. Hvala, da delite. ${URL}`;
		const media = `Pogrešan je pes Rex, nazadnje viden ${date} v okolici: Šiška, Ljubljana. Če ga vidite, prosimo, sporočite prek povezave: ${URL}`;
		expect(screen.getByText(post)).toBeOnTheScreen();
		expect(screen.getByText(media)).toBeOnTheScreen();

		const [copyPost, copyMedia] = screen.getAllByRole('button', { name: s.kit_copy });
		await fireEvent.press(copyPost!);
		expect(clipboard).toHaveBeenLastCalledWith(post);
		expect(toast.success).toHaveBeenLastCalledWith(s.kit_copied);
		await fireEvent.press(copyMedia!);
		expect(clipboard).toHaveBeenLastCalledWith(media);
		// Copying the Facebook post counts as a Facebook share; the radio text has no share method.
		expect(events()).toEqual([
			{ name: 'share', params: { method: 'facebook', report_type: 'lost', species: 'dog' } },
		]);

		// The report's region first; an http link is left out; the radio form after the media text.
		const links = await screen.findAllByRole('link');
		const names = ['Izgubljene živali – Osrednja Slovenija', 'Izgubljene živali – Gorenjska', s.kit_media_form];
		expect(names.map((name) => screen.getByRole('link', { name }))).toEqual(links);
		expect(screen.queryByText('Brez varne povezave')).toBeNull();
		await fireEvent.press(links[0]!);
		expect(openURL).toHaveBeenLastCalledWith('https://www.facebook.com/groups/osr');
		await fireEvent.press(links[2]!);
		expect(openURL).toHaveBeenLastCalledWith('https://radio.example/obvestila');

		expect(screen.getByRole('img', { name: 'Kvadratna slika za objavo: Pogrešan pes Rex' })).toBeOnTheScreen();
		await fireEvent.press(screen.getByRole('button', { name: s.kit_image_save }));
		expect(download).toHaveBeenLastCalledWith(
			`${URL}/square.png?lang=sl`,
			expect.objectContaining({ uri: 'file:///cache/najdimo-Rex2Lost.png' }),
			{ idempotent: true }
		);
		expect(shareFile).toHaveBeenLastCalledWith('file:///cache/najdimo-Rex2Lost.png', {
			mimeType: 'image/png',
			UTI: 'public.png',
		});
	});

	test('visitors get no kit', async () => {
		await areaReady(await open({ data: lost }));
		expect(screen.getByRole('button', { name: s.more })).toBeOnTheScreen();
		expect(screen.queryByRole('heading', { name: s.kit_title })).toBeNull();
	});

	test('a found report gets no kit', async () => {
		await areaReady(await open({ data: { ...owner, type: 'found', name: undefined } }));
		expect(screen.getByRole('img', { name: 'Predogled plakata: Najden pes, s fotografijo in kodo QR' }));
		expect(screen.queryByRole('heading', { name: s.kit_title })).toBeNull();
	});
});
