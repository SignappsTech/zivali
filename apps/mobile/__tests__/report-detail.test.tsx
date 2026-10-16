// Loads the jest.setup Reanimated mock (with useReducedMotion) before expo-router's testing mocks register their own.
import 'react-native-reanimated';

import { PortalHost } from '@rn-primitives/portal';
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import { Stack } from 'expo-router';
import { renderRouter } from 'expo-router/testing-library';
import * as WebBrowser from 'expo-web-browser';
import * as React from 'react';
import { Share, Text } from 'react-native';
import { Provider } from 'react-redux';
import { IntlProvider } from 'use-intl';

import { abuseCreated } from '@zivali/api/__fixtures__/abuse';
import * as fx from '@zivali/api/__fixtures__/reports';
import type { CachedReport } from '@zivali/api/sync';
import sl from '@zivali/i18n/dist/sl.json';
import { formatDayMonth } from '@zivali/i18n/format';
import { createMockApi } from '@zivali/api/mock';
import { api, createApiStore } from '@zivali/api/rtk';
import type { PublicReport, ReportOwnerView } from '@zivali/types';
import ReportScreen from '@/app/r/[code]/index';
import { ensureSession } from '@/lib/anonymous';
import { useReport } from '@/lib/data/reports';
import { toAppPath } from '@/lib/deep-link';

jest.mock('@/lib/data/reports', () => ({ useReport: jest.fn() }));
jest.mock('@/lib/env', () => ({ env: { EXPO_PUBLIC_APP_URL: 'https://najdimo.test' } }));
jest.mock('expo-web-browser', () => ({ openBrowserAsync: jest.fn(async () => ({})) }));
// The owner actions share the auth error text, whose module loads the Supabase client; nothing here signs in.
jest.mock('@/lib/auth', () => ({ providers: [], signInWithProvider: jest.fn() }));
// The anonymous session before a report-abuse request has its own tests (manage.test.tsx).
jest.mock('@/lib/anonymous', () => ({ ensureSession: jest.fn(async () => ({})) }));
// The P16 gate has its own tests (auth.test.tsx); here it only shows whether contact opened it.
jest.mock('@/components/auth/gate', () => {
	const { Text: MockText } = jest.requireActual<typeof import('react-native')>('react-native');
	return {
		AuthGate: ({ open, reason }: { open: boolean; reason: string }) =>
			open ? <MockText>{`gate:${reason}`}</MockText> : null,
	};
});

const NOW = new Date('2026-10-16T12:00:00Z');
const r = sl.report;

const photo = (n: number, alt: string) => ({
	url: `https://media.zivali.test/r/rex/${n}/display.webp`,
	thumb_url: `https://media.zivali.test/r/rex/${n}/thumb.webp`,
	alt,
	width: 1600,
	height: 1200,
});
const lost: PublicReport = {
	...fx.publicReport,
	short_code: 'Rex2Lost',
	type: 'lost',
	name: 'Rex',
	breed_codes: ['dog.mixed'],
	colours: ['brown', 'white'],
	pattern: 'bicolour',
	size: 'm',
	sex: 'male',
	has_chip: true,
	event_at: '2026-10-12T08:00:00Z',
	circumstances: 'Ustrašil se je ognjemeta in zbežal z vrta.',
	area: { lat: 46.066, lng: 14.493, radius_m: 500 },
	photos: [
		photo(1, 'Rex: pes rjave in bele barve, fotografija 1 od 2'),
		photo(2, 'Rex: pes rjave in bele barve, fotografija 2 od 2'),
	],
};
const found: PublicReport = { ...fx.publicReport, circumstances: 'Tekel je po kolesarski stezi.' };
const sighted: PublicReport = { ...fx.publicReport, type: 'sighted', short_code: 'Seen1234' };
const owner: ReportOwnerView = {
	...fx.ownerReport,
	...lost,
	is_mine: true,
	manager_role: 'owner',
	chip_number: '705000000123456',
	collar: 'rdeča z zvončkom',
	location: { lat: 46.0672, lng: 14.4921 },
};

type Result = ReturnType<typeof useReport>;
const mockUseReport = jest.mocked(useReport);
const mockEnsureSession = jest.mocked(ensureSession);
const refetch = jest.fn();
const result = (patch: Partial<Result>): Result => ({
	data: undefined,
	source: 'network',
	lastSyncAt: null,
	isLoading: false,
	refetch,
	...patch,
});
const queryError = (code: 'GONE' | 'NOT_FOUND' | 'INTERNAL', status: number) => ({
	status,
	data: { code, message: code },
});

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
	'POST /v1/abuse-reports': abuseCreated,
});

async function open(report: Partial<Result>, code = 'Rex2Lost') {
	mockUseReport.mockReturnValue(result(report));
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
			'r/[code]/poster': () => <Text>poster screen</Text>,
			'report/found': () => <Text>sighted flow</Text>,
		},
		{ initialUrl: `/r/${code}`, wrapper: Providers }
	);
	await page;
	return { page };
}

/** What a screen reader reads, in order: grouped elements by label, other text as is; hidden subtrees skipped. */
function readingOrder(): string[] {
	type Node = { type: string; props: Record<string, unknown>; children: (Node | string)[] | null };
	const out: string[] = [];
	const text = (node: Node | string): string =>
		typeof node === 'string' ? node : (node.children ?? []).map(text).join('');
	const walk = (node: Node | string | null) => {
		if (!node) return;
		if (typeof node === 'string') return void out.push(node);
		const { props } = node;
		if (props['aria-hidden'] || props.importantForAccessibility === 'no-hide-descendants') return;
		const label = (props['aria-label'] ?? props.accessibilityLabel) as string | undefined;
		if (props.accessible) return void out.push(label ?? text(node));
		if (node.type === 'Text') return void out.push(text(node));
		for (const child of node.children ?? []) walk(child);
	};
	const tree = screen.toJSON() as Node | Node[] | null;
	for (const node of Array.isArray(tree) ? tree : [tree]) walk(node);
	return out.map((s) => s.trim()).filter(Boolean);
}
/** A labelled container (menu, dialog): not one screen-reader element, so not a getByRole target. */
const container = (role: string, name: string) => {
	const found = screen.queryAllByLabelText(name).find((el) => el.props.role === role);
	if (!found) throw new Error(`no ${role} "${name}"`);
	return found;
};
const expectInOrder = (labels: string[]) => {
	const order = readingOrder();
	const find = (label: string) => {
		const exact = order.indexOf(label);
		return exact >= 0 ? exact : order.findIndex((item) => item.startsWith(label));
	};
	const at = labels.map(find);
	expect(at).not.toContain(-1);
	expect(at).toEqual([...at].sort((a, b) => a - b));
};

beforeEach(() => {
	refetch.mockReset();
	mockApi.calls.length = 0;
});
// renderRouter runs on fake timers.
afterEach(() => {
	jest.useRealTimers();
	for (const store of stores) store.dispatch(api.util.resetApiState());
	stores.length = 0;
});

describe('report detail (P9 mobile)', () => {
	test('a lost report shows the public fields in the P9 order, with the fuzzed area and screen-reader labels', async () => {
		await open({ data: lost });

		expect(screen.getByRole('heading', { name: 'Rex' })).toBeOnTheScreen();
		expect(screen.getByText('Izgubljena')).toBeOnTheScreen();
		expect(screen.getByText('Pogrešana od 12. oktobra')).toBeOnTheScreen();
		expect(screen.getByText('Pes · Mešanec · samec')).toBeOnTheScreen();
		expect(screen.getByLabelText('Barva: rjava, bela, dvobarvna')).toBeOnTheScreen();
		expect(screen.getByLabelText('Velikost: srednja')).toBeOnTheScreen();
		expect(screen.getByLabelText('Čip: Čip vpisan')).toBeOnTheScreen();
		expect(screen.getByRole('heading', { name: r.about_lost })).toBeOnTheScreen();
		expect(screen.getByText(lost.circumstances!)).toBeOnTheScreen();
		// Photos carry their alt text; the area is named from the reverse lookup of the public point.
		expect(screen.getByRole('img', { name: lost.photos[0]!.alt })).toBeOnTheScreen();
		const map = await screen.findByRole('button', {
			name: 'Odpri zemljevid. Območje: Šiška, Ljubljana, približno 500 m. Prikazano območje je približno.',
		});
		expect(mockApi.calls.map((call) => [call.path, call.body])).toEqual([
			['/v1/geo/reverse', { lat: lost.area.lat, lng: lost.area.lng }],
		]);
		expect(map).toBeOnTheScreen();

		expectInOrder([
			r.mobile_back,
			r.mobile_share,
			lost.photos[0]!.alt,
			r.photo_prev,
			'1 / 2',
			r.photo_next,
			'Izgubljena',
			'Rex',
			'Pes · Mešanec · samec',
			'Barva',
			'Čip',
			'Območje: Šiška, Ljubljana, približno 500 m',
			'Odpri zemljevid',
			r.safety_note,
			r.about_lost,
			r.action_sighting,
			r.more,
			r.action_message,
		]);
	});

	test('the public view never shows the chip number, the stored point or a collar the owner typed', async () => {
		const stray = { chip_number: '705000000123456', collar: 'rdeča z zvončkom', location: owner.location };
		await open({ data: { ...lost, ...stray } as PublicReport });
		await screen.findByRole('button', { name: /^Odpri zemljevid/ });
		// Only `is_mine` reports are manager views; a public payload with stray fields still shows public facts only.
		const json = JSON.stringify(screen.toJSON());
		expect(json).not.toContain('705000000123456');
		expect(json).not.toContain('zvončkom');
		expect(screen.queryByText(sl.location.exact_own)).toBeNull();
		const { features } = screen.getAllByTestId('GeoJSONSource:me', { includeHiddenElements: true })[0]!.props
			.data as { features: unknown[] };
		expect(features).toEqual([]);
	});

	test('a lost report with a reward shows "Nagrada" with the reward scam warning (AC 5)', async () => {
		await open({ data: { ...lost, reward: { eur: 50, note: 'tudi za podatek' } } });
		// The amount in the page language ("50 €"); the owner's note follows as typed.
		expect(screen.getByText(/^Nagrada: 50\s€ · tudi za podatek$/)).toBeOnTheScreen();
		expect(screen.getByText(new RegExp(`^${r.safety_note_reward}`))).toBeOnTheScreen();
		expect(screen.queryByText(new RegExp(`^${r.safety_note}`))).toBeNull();
	});

	test('a reward without an amount is the plain "Nagrada" line, still with the reward warning', async () => {
		await open({ data: { ...lost, reward: { eur: null, note: null } } });
		expect(screen.getByText('Nagrada')).toBeOnTheScreen();
		expect(screen.getByText(new RegExp(`^${r.safety_note_reward}`))).toBeOnTheScreen();
	});

	test('without a reward the plain safety note stays, with its tips link', async () => {
		await open({ data: lost });
		expect(screen.queryByText(/^Nagrada/)).toBeNull();
		await fireEvent.press(screen.getByRole('link', { name: r.safety_link }));
		expect(WebBrowser.openBrowserAsync).toHaveBeenCalledWith('https://najdimo.test/varnost');
	});

	test('the carousel pages with named buttons and a live position; a failed photo shows the tile', async () => {
		await open({ data: lost });
		expect(screen.getByRole('button', { name: r.photo_prev })).toBeDisabled();
		await fireEvent.press(screen.getByRole('button', { name: r.photo_next }));
		expect(screen.getByText('2 / 2')).toBeOnTheScreen();
		expect(screen.getByRole('button', { name: r.photo_next })).toBeDisabled();

		await fireEvent(screen.getByRole('img', { name: lost.photos[0]!.alt }), 'error');
		expect(screen.getByText(r.photo_failed)).toBeOnTheScreen();
	});

	test('the map thumbnail opens the full map sheet with the area as text, and Zapri closes it', async () => {
		await open({ data: lost });
		// Once the area name has loaded.
		await fireEvent.press(await screen.findByRole('button', { name: /^Odpri zemljevid\. Območje: Šiška/ }));
		expect(screen.getByRole('heading', { name: r.where_title })).toBeOnTheScreen();
		const sheet = container('dialog', r.where_title);
		expect(within(sheet).getByText('Območje: Šiška, Ljubljana, približno 500 m')).toBeOnTheScreen();
		await fireEvent.press(within(sheet).getByRole('button', { name: sl.common.close }));
		expect(screen.queryByRole('heading', { name: r.where_title })).toBeNull();
	});

	test('slot A per type: found and sighted visitor actions; contact opens the gate, a sighting the linked flow', async () => {
		const { page } = await open({ data: found }, found.short_code);
		expect(screen.getByRole('heading', { name: 'Najden pes' })).toBeOnTheScreen();
		expect(screen.getByRole('heading', { name: r.about_other })).toBeOnTheScreen();
		await fireEvent.press(screen.getByRole('button', { name: r.action_mine }));
		expect(screen.getByText('gate:contact')).toBeOnTheScreen();
		await fireEvent.press(screen.getByRole('button', { name: r.action_sighting }));
		expect(await screen.findByText('sighted flow')).toBeOnTheScreen();
		expect(page.getPathname()).toBe('/report/found');
		expect(page.getSearchParams()).toEqual({ type: 'sighted', linked_report_id: found.id });
	});

	test('slot A for a sighted report: message first, "To je moja žival" as the text button', async () => {
		await open({ data: sighted }, sighted.short_code);
		expectInOrder([r.action_message, r.more, r.action_mine]);
	});

	test('share opens the system sheet with the localised P18 text and the short link (slot B)', async () => {
		const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' });
		await open({ data: lost });
		// The text names the area once the page's reverse lookup has it.
		await screen.findByRole('button', { name: /^Odpri zemljevid\. Območje: Šiška, Ljubljana/ });
		await fireEvent.press(screen.getByRole('button', { name: r.mobile_share }));
		const date = formatDayMonth(lost.event_at, 'sl');
		expect(share).toHaveBeenCalledWith({
			message: `Pomagajte najti psa: Rex. Nazadnje viden ${date}, območje Šiška, Ljubljana. Ste ga videli? https://najdimo.test/r/Rex2Lost`,
		});
	});

	test('a reunited report shares the thank-you text', async () => {
		const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' });
		await open({ data: { ...lost, status: 'reunited' } });
		await fireEvent.press(screen.getByRole('button', { name: r.mobile_share }));
		expect(share).toHaveBeenLastCalledWith({
			message: 'Rex je spet doma. Hvala vsem, ki ste delili in pomagali. https://najdimo.test/r/Rex2Lost',
		});
	});

	test('offline there is no area name, so the share is the short link alone', async () => {
		const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' });
		await open({ data: lost, source: 'cache', lastSyncAt: NOW.getTime() });
		await fireEvent.press(screen.getByRole('button', { name: r.mobile_share }));
		expect(share).toHaveBeenLastCalledWith({ message: 'https://najdimo.test/r/Rex2Lost' });
		expect(mockApi.calls.some((call) => call.path === '/v1/geo/reverse')).toBe(false);
	});

	test('visitors get "Prijavi zlorabo" in Več možnosti (slot C)', async () => {
		await open({ data: lost });
		await fireEvent.press(screen.getByRole('button', { name: r.more }));
		const menu = container('menu', r.more);
		expect(within(menu).getByRole('menuitem', { name: r.more_abuse })).toBeOnTheScreen();
		expect(within(menu).queryByRole('menuitem', { name: r.owner_close })).toBeNull();

		// The same sheet turns into the P10 form for this report (TASK-25.4).
		await fireEvent.press(within(menu).getByRole('menuitem', { name: r.more_abuse }));
		expect(screen.getByRole('heading', { name: sl.abuse.title })).toBeOnTheScreen();
		expect(screen.getByText('Glede objave: Rex')).toBeOnTheScreen();
		expect(screen.queryByRole('menuitem', { name: r.more_abuse })).toBeNull();
		await fireEvent.press(screen.getByRole('radio', { name: sl.abuse.reason_scam }));
		await fireEvent.press(screen.getByRole('button', { name: sl.abuse.send }));
		expect(await screen.findByRole('heading', { name: sl.abuse.done_title })).toBeOnTheScreen();
		expect(mockEnsureSession).toHaveBeenCalled();
		expect(mockApi.calls.find((call) => call.path === '/v1/abuse-reports')?.body).toEqual({
			target_type: 'report',
			target_id: lost.id,
			reason: 'scam',
		});
		// "Končano" closes the sheet; it opens on the menu again.
		await fireEvent.press(screen.getByRole('button', { name: sl.abuse.done_close }));
		expect(screen.getByRole('menuitem', { name: r.more_abuse })).toBeOnTheScreen();
	});

	test('the owner view: owner actions, the held note, the own point labelled, the owner reward note', async () => {
		const held: ReportOwnerView = { ...owner, moderation_state: 'held', reward: { eur: 100, note: null } };
		await open({ data: held });
		expect(screen.getByRole('status')).toHaveTextContent(r.owner_held);
		expect(screen.getByLabelText('Ovratnica: rdeča z zvončkom')).toBeOnTheScreen();
		expect(JSON.stringify(screen.toJSON())).not.toContain(owner.chip_number);
		expect(screen.getByText(sl.location.exact_own)).toBeOnTheScreen();
		const me = screen.getAllByTestId('GeoJSONSource:me', { includeHiddenElements: true })[0]!.props.data as {
			features: { geometry: { coordinates: number[] } }[];
		};
		expect(me.features.map((f) => f.geometry.coordinates)).toEqual([[owner.location.lng, owner.location.lat]]);
		expect(screen.getByText(r.owner_reward_note)).toBeOnTheScreen();
		expect(screen.queryByText(new RegExp(`^${r.safety_note_reward}`))).toBeNull();
		expect(screen.queryByRole('button', { name: r.action_sighting })).toBeNull();
		expect(screen.getByRole('button', { name: r.owner_edit })).toBeOnTheScreen();
		expect(screen.getByRole('button', { name: r.owner_poster })).toBeOnTheScreen();
		await fireEvent.press(screen.getByRole('button', { name: r.more }));
		const menu = container('menu', r.more);
		expect(within(menu).getByRole('menuitem', { name: r.owner_close })).toBeOnTheScreen();
		expect(within(menu).queryByRole('menuitem', { name: r.more_abuse })).toBeNull();
		// The menu sheet is modal; closing it gives the screen back.
		await fireEvent.press(screen.getByRole('button', { name: sl.common.cancel }));

		await fireEvent.press(screen.getByRole('button', { name: r.owner_home }));
		expect(screen.getByRole('heading', { name: 'Je Rex res spet doma?' })).toBeOnTheScreen();
	});

	test('the owner "Plakat" opens the P18 poster and sharing screen (TASK-24.3)', async () => {
		const { page } = await open({ data: owner });
		await fireEvent.press(screen.getByRole('button', { name: r.owner_poster }));
		expect(await screen.findByText('poster screen')).toBeOnTheScreen();
		expect(page.getPathname()).toBe('/r/Rex2Lost/poster');
	});

	test('reunited: thank-you line, share stays, no actions, area or safety note', async () => {
		await open({ data: { ...lost, status: 'reunited' } });
		expect(screen.getByText('Spet doma')).toBeOnTheScreen();
		expect(screen.getByText(r.reunited_named.replace('{name}', 'Rex'))).toBeOnTheScreen();
		expect(screen.getByRole('button', { name: r.mobile_share })).toBeOnTheScreen();
		for (const name of [r.action_sighting, r.action_message, r.more, /^Odpri zemljevid/])
			expect(screen.queryByRole('button', { name })).toBeNull();
		expect(screen.queryByText(new RegExp(`^${r.safety_note}`))).toBeNull();
	});

	test('closed: muted "Zaključeno", no share and no actions', async () => {
		await open({ data: { ...lost, status: 'closed' } });
		expect(screen.getByText('Zaključeno')).toBeOnTheScreen();
		expect(screen.getByText(r.closed)).toBeOnTheScreen();
		for (const name of [r.mobile_share, r.action_sighting, r.more])
			expect(screen.queryByRole('button', { name })).toBeNull();
	});
});

describe('states (AC 3)', () => {
	test('loading is announced once', async () => {
		await open({ isLoading: true });
		expect(screen.getByLabelText(sl.common.loading)).toBeOnTheScreen();
	});

	test('a removed, expired or hidden report is the 410 page with a way to the map', async () => {
		await open({ error: queryError('GONE', 410) });
		expect(screen.getByRole('heading', { name: sl.errors.page_410_title })).toBeOnTheScreen();
		await fireEvent.press(screen.getByRole('button', { name: sl.common.go_to_map }));
		expect(await screen.findByText('map tab')).toBeOnTheScreen();
	});

	test('an unknown code is the 404 page', async () => {
		await open({ error: queryError('NOT_FOUND', 404) });
		expect(screen.getByRole('heading', { name: sl.errors.page_404_title })).toBeOnTheScreen();
	});

	test('another failure shows the error note with retry', async () => {
		await open({ error: queryError('INTERNAL', 500) });
		expect(screen.getByText(sl.common.inline_error)).toBeOnTheScreen();
		await fireEvent.press(screen.getByRole('button', { name: sl.common.try_again }));
		expect(refetch).toHaveBeenCalled();
	});

	test('offline with a saved copy: the note with its time, the area as text only, no lookup', async () => {
		const cached: CachedReport = { ...fx.syncSnapshot.upserts[0]!, short_code: 'Rex2Lost' };
		await open({ data: cached, source: 'cache', lastSyncAt: Date.parse('2026-10-16T12:05:00Z') });
		expect(screen.getByText('Brez povezave. Prikazujemo shranjeno različico (14:05).')).toBeOnTheScreen();
		expect(screen.getByRole('heading', { name: 'Maks' })).toBeOnTheScreen();
		expect(screen.getByText(r.area_note)).toBeOnTheScreen();
		expect(screen.queryByRole('button', { name: /^Odpri zemljevid/ })).toBeNull();
		// The actions need the network: disabled, with the reason, and the gate never opens.
		const sighting = screen.getByRole('button', { name: r.action_sighting });
		expect(sighting).toBeDisabled();
		expect(screen.getByText(r.action_offline)).toBeOnTheScreen();
		await fireEvent.press(screen.getByRole('button', { name: r.action_message }));
		expect(screen.queryByText('gate:contact')).toBeNull();
		// Report abuse keeps the choice but cannot send until the network is back.
		await fireEvent.press(screen.getByRole('button', { name: r.more }));
		await fireEvent.press(screen.getByRole('menuitem', { name: r.more_abuse }));
		await fireEvent.press(screen.getByRole('radio', { name: sl.abuse.reason_fake }));
		expect(screen.getByRole('button', { name: sl.abuse.send })).toBeDisabled();
		await act(async () => {});
		expect(mockApi.calls).toEqual([]);
	});

	test('offline without a saved copy says so', async () => {
		await open({ data: null, source: 'cache' });
		expect(screen.getByRole('heading', { name: sl.errors.offline_title })).toBeOnTheScreen();
	});

	test('universal links and zivali:// open this screen with the code (C15)', async () => {
		const { page } = await open(
			{ error: queryError('GONE', 410) },
			toAppPath('https://najdimo.si/en/r/Hk3vT9qP').slice(3)
		);
		await waitFor(() => expect(mockUseReport).toHaveBeenLastCalledWith('Hk3vT9qP'));
		expect(page.getPathname()).toBe('/r/Hk3vT9qP');
		expect(toAppPath('zivali://r/Hk3vT9qP')).toBe('/r/Hk3vT9qP');
	});
});
