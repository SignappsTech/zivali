/// <reference types="node" />
import * as fs from 'node:fs';
import * as path from 'node:path';

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as WebBrowser from 'expo-web-browser';
import * as React from 'react';
import { Provider } from 'react-redux';
import { IntlProvider } from 'use-intl';

import { getMockEvents, initAnalytics, resetMockEvents, setConsent } from '@zivali/analytics';
import { ad as fixture } from '@zivali/api/__fixtures__/ads';
import * as fx from '@zivali/api/__fixtures__/reports';
import { createMockApi, mockError, type MockRoutes } from '@zivali/api/mock';
import { api, createApiStore } from '@zivali/api/rtk';
import en from '@zivali/i18n/dist/en.json';
import sl from '@zivali/i18n/dist/sl.json';
import type { Ad } from '@zivali/types';
import { AdSlot, isSafeClickUrl } from '@/components/ads/ad-slot';
import { ReunitedAd } from '@/components/report/reunited-slots';
import { Ad as DetailAd } from '@/components/report/slots/ad';
import type { DetailReport } from '@/components/report/slots/types';

jest.mock('@/lib/env', () => ({
	env: { EXPO_PUBLIC_API_URL: 'https://api.najdimo.test', EXPO_PUBLIC_APP_ENV: 'staging' },
}));
jest.mock('expo-web-browser', () => ({ openBrowserAsync: jest.fn(async () => ({})) }));
const ONLINE = { isConnected: true, isInternetReachable: true };
let mockNetwork: { isConnected: boolean; isInternetReachable: boolean } = ONLINE;
jest.mock('expo-network', () => ({
	NetworkStateType: { WIFI: 'WIFI', ETHERNET: 'ETHERNET' },
	addNetworkStateListener: jest.fn(() => ({ remove: () => {} })),
	getNetworkStateAsync: jest.fn(async () => ({ isConnected: true, isInternetReachable: true })),
	useNetworkState: () => mockNetwork,
}));
// No tip ask on the reunited screen, so its ad may show (the gating on the ask is tested in lifecycle.test.tsx).
jest.mock('@/components/payments/support', () => ({ useSupportTipState: () => 'none' }));

const served: Ad = {
	...fixture,
	click_url: `https://api.najdimo.test/v1/ads/${fixture.id}/click?s=detail&r=8`,
};
const report = fx.publicReport as DetailReport;
const name = (ad: Ad, label = sl.ads.label) => `${label}: ${ad.title}. ${ad.body}`;

let stores: ReturnType<typeof createApiStore>[] = [];
async function renderSlot(ui: React.ReactElement, routes: MockRoutes = {}, locale: 'sl' | 'en' = 'sl') {
	const client = createMockApi({
		'GET /v1/ads/slot/:slot': served,
		'POST /v1/ads/:id/impressions': () => undefined,
		...routes,
	});
	const store = createApiStore(client);
	stores.push(store);
	await render(
		<Provider store={store}>
			<IntlProvider locale={locale} messages={locale === 'sl' ? sl : en} timeZone="Europe/Ljubljana">
				{ui}
			</IntlProvider>
		</Provider>
	);
	return client;
}
const adCalls = (client: Awaited<ReturnType<typeof renderSlot>>, method: string) =>
	client.calls.filter((c) => c.method === method && c.path.startsWith('/v1/ads/'));
const gaEvents = () => getMockEvents().filter((e) => e.name.startsWith('ad_'));

beforeEach(() => {
	jest.clearAllMocks();
	mockNetwork = ONLINE;
	resetMockEvents();
	const consent = new Map<string, string>();
	initAnalytics({
		provider: 'mock',
		storage: { get: () => consent.get('c') ?? null, set: (value) => void consent.set('c', value) },
	});
});
afterEach(async () => {
	await cleanup();
	// RTK Query batches the unsubscribes on a 500 ms timer: let it run before Jest tears down (as in map-tab).
	await new Promise((resolve) => setTimeout(resolve, 600));
	for (const store of stores) store.dispatch(api.util.resetApiState());
	stores = [];
});

describe('AdSlot (P21 mobile)', () => {
	test('feed: the labelled row with alt text opens the click URL in the in-app browser; one impression, no GA without consent', async () => {
		const client = await renderSlot(<AdSlot slot="feed" />);

		const unit = await screen.findByRole('link', { name: name(served) });
		// The label once, as text; the title and one text line; the image carries the admin's alt text.
		expect(screen.getAllByText(sl.ads.label)).toHaveLength(1);
		expect(screen.getByText(served.title)).toBeOnTheScreen();
		expect(screen.getByText(served.body).props.numberOfLines).toBe(1);
		expect(screen.getByLabelText(served.image_alt).props.accessible).toBe(false);
		expect(adCalls(client, 'GET')[0]).toMatchObject({ path: '/v1/ads/slot/feed', query: { locale: 'sl' } });

		await waitFor(() => expect(adCalls(client, 'POST')).toHaveLength(1));
		expect(adCalls(client, 'POST')[0]).toMatchObject({
			path: `/v1/ads/${served.id}/impressions`,
			body: { slot: 'feed' },
		});

		await fireEvent.press(unit);
		expect(WebBrowser.openBrowserAsync).toHaveBeenCalledWith(served.click_url);
		// Our aggregate count is not analytics: it goes out without consent, GA does not.
		expect(gaEvents()).toEqual([]);
		expect(adCalls(client, 'POST')).toHaveLength(1);
	});

	test('with consent, ad_impression and ad_click reach GA with slot, ad id, region and species (reunited)', async () => {
		setConsent({ analytics: true });
		const client = await renderSlot(<ReunitedAd report={report} />);

		await fireEvent.press(await screen.findByRole('link', { name: name(served) }));
		expect(adCalls(client, 'GET')[0]).toMatchObject({
			path: '/v1/ads/slot/reunited',
			query: { locale: 'sl', species: 'dog' },
		});
		const params = { ad_slot: 'reunited', ad_id: served.id, region: 'osrednjeslovenska', species: 'dog' };
		expect(gaEvents()).toEqual([
			{ name: 'ad_impression', params },
			{ name: 'ad_click', params },
		]);
	});

	test('detail: two lines and the ad\'s button text, else "Več o tem"; text-only without an image; EN label "Ad"', async () => {
		await renderSlot(<DetailAd report={report} offline={false} />);
		await screen.findByRole('link', { name: name(served) });
		expect(screen.getByText(served.title).props.numberOfLines).toBe(2);
		expect(screen.getByText(served.body).props.numberOfLines).toBe(2);
		expect(screen.getByText(served.cta)).toBeOnTheScreen();
		await cleanup();

		const plain = { ...served, cta: '', image_url: null };
		await renderSlot(<DetailAd report={report} offline={false} />, { 'GET /v1/ads/slot/:slot': plain }, 'en');
		await screen.findByRole('link', { name: name(plain, en.ads.label) });
		expect(screen.getByText(en.ads.label)).toBeOnTheScreen();
		expect(screen.getByText(en.ads.learn_more)).toBeOnTheScreen();
		expect(screen.queryByLabelText(plain.image_alt)).toBeNull();
	});

	test('loading keeps the empty reserved box, hidden from screen readers', async () => {
		await renderSlot(<AdSlot slot="detail" />, { 'GET /v1/ads/slot/:slot': () => new Promise(() => {}) });
		const box = screen.toJSON() as { props: Record<string, unknown>; children: unknown } | null;
		expect(box?.props['aria-hidden']).toBe(true);
		expect(box?.children ?? []).toEqual([]);
	});

	test.each([
		['no ad for the slot', { 'GET /v1/ads/slot/:slot': () => null }],
		['a failed request', { 'GET /v1/ads/slot/:slot': () => mockError('INTERNAL') }],
		['a refused slot', { 'GET /v1/ads/slot/:slot': () => mockError('VALIDATION') }],
	])('%s collapses the slots silently (feed and reunited): nothing rendered or counted', async (_case, routes) => {
		const client = await renderSlot(
			<>
				<AdSlot slot="feed" />
				<ReunitedAd report={report} />
			</>,
			routes
		);
		await waitFor(() => expect(adCalls(client, 'GET').length).toBeGreaterThanOrEqual(2));
		// A 5xx is retried twice first (C1), with the reserved box meanwhile.
		await waitFor(() => expect(screen.toJSON()).toBeNull(), { timeout: 4000 });
		expect(adCalls(client, 'POST')).toEqual([]);
	});

	test('offline hides the ad, even one already loaded, and counts nothing; the saved report copy has no ad', async () => {
		const client = await renderSlot(<AdSlot slot="feed" />);
		await screen.findByRole('link', { name: name(served) });
		await waitFor(() => expect(adCalls(client, 'POST')).toHaveLength(1));

		mockNetwork = { isConnected: true, isInternetReachable: false };
		await screen.rerender(
			<Provider store={stores[0]!}>
				<IntlProvider locale="sl" messages={sl} timeZone="Europe/Ljubljana">
					<AdSlot slot="feed" />
				</IntlProvider>
			</Provider>
		);
		expect(screen.toJSON()).toBeNull();
		expect(adCalls(client, 'POST')).toHaveLength(1);
		await cleanup();

		mockNetwork = ONLINE;
		const cached = await renderSlot(<DetailAd report={report} offline />);
		expect(screen.toJSON()).toBeNull();
		expect(adCalls(cached, 'GET')).toEqual([]);
	});

	test('online, offline, online with the same ad records one impression (advertisers are billed per impression)', async () => {
		const client = await renderSlot(<AdSlot slot="feed" />);
		await screen.findByRole('link', { name: name(served) });
		await waitFor(() => expect(adCalls(client, 'POST')).toHaveLength(1));

		const again = () =>
			screen.rerender(
				<Provider store={stores[0]!}>
					<IntlProvider locale="sl" messages={sl} timeZone="Europe/Ljubljana">
						<AdSlot slot="feed" />
					</IntlProvider>
				</Provider>
			);
		mockNetwork = { isConnected: true, isInternetReachable: false };
		await again();
		expect(screen.toJSON()).toBeNull();
		mockNetwork = ONLINE;
		await again();
		await screen.findByRole('link', { name: name(served) });
		await new Promise((resolve) => setTimeout(resolve, 50));
		expect(adCalls(client, 'POST')).toHaveLength(1);
	});

	test('only our https click counter opens: any other URL is dropped, not opened or tracked', async () => {
		expect(isSafeClickUrl(served.click_url)).toBe(true);
		for (const url of [
			`http://api.najdimo.test/v1/ads/${served.id}/click`,
			'https://api.najdimo.test.evil.test/v1/ads/x/click',
			'https://evil.test/v1/ads/x/click',
			'https://api.najdimo.test/v1/reports',
			'javascript:alert(1)',
		])
			expect(isSafeClickUrl(url)).toBe(false);
		// Plain http only for the local API.
		const { env } = jest.requireMock<{ env: Record<string, string> }>('@/lib/env');
		Object.assign(env, { EXPO_PUBLIC_API_URL: 'http://localhost:4000', EXPO_PUBLIC_APP_ENV: 'local' });
		expect(isSafeClickUrl(fixture.click_url)).toBe(true);
		Object.assign(env, { EXPO_PUBLIC_API_URL: 'https://api.najdimo.test', EXPO_PUBLIC_APP_ENV: 'staging' });

		setConsent({ analytics: true });
		const evil = { ...served, click_url: 'https://evil.test/landing' };
		await renderSlot(<AdSlot slot="feed" />, { 'GET /v1/ads/slot/:slot': evil });
		await fireEvent.press(await screen.findByRole('link', { name: name(evil) }));
		expect(WebBrowser.openBrowserAsync).not.toHaveBeenCalled();
		expect(gaEvents().map((e) => e.name)).toEqual(['ad_impression']);
	});

	test('our ad copy never claims "nearest" (paid placements, content P21 §2)', () => {
		const copy = JSON.stringify([sl.ads, en.ads]);
		expect(copy).not.toMatch(/bližin|najbližj|nearest|near you|nearby/i);
	});
});

// FR-030, C15: the ad slot renders only on the Map tab (feed), the report detail and the reunited screen. Every other
// route, among them the report flows, manage (/m), chat (inbox), sign-in and payments, never even imports it, so
// none of their states can show one.
describe('no AdSlot in protected flows', () => {
	const ROOT = path.join(__dirname, '..');
	const AD_SLOT = path.join(ROOT, 'components/ads/ad-slot.tsx');
	const WITH_ADS = ['app/(tabs)/index.tsx', 'app/r/[code]/index.tsx', 'app/r/[code]/reunited.tsx'];
	const PROTECTED = [
		'app/(tabs)/report.tsx',
		'app/report/lost/index.tsx',
		'app/report/lost/done.tsx',
		'app/report/found/index.tsx',
		'app/m.tsx',
		'app/settings/reports.tsx',
		'app/(tabs)/inbox.tsx',
		'app/inbox/[id].tsx',
		'app/auth/sign-in.tsx',
		'app/auth/sign-up.tsx',
		'app/auth/forgot-password.tsx',
		'app/payments/return.tsx',
		'app/settings/payments.tsx',
		'app/settings/consent.tsx',
	];
	// Value imports and re-exports, including side-effect imports; `import type` brings no code.
	// NOTE: this regex does not follow dynamic `import()` or `require()`: a lazy AdSlot import must be added to the guard by hand.
	const IMPORT = /^\s*(?:import|export)\s+(?!type\s)(?:[^'";]*?\sfrom\s+)?['"]([^'"]+)['"]/gm;

	const resolve = (from: string, spec: string): string | null => {
		const base = spec.startsWith('@/')
			? path.join(ROOT, spec.slice(2))
			: spec.startsWith('.')
				? path.join(path.dirname(from), spec)
				: null;
		if (!base) return null;
		const file = ['', '.tsx', '.ts', '/index.tsx', '/index.ts']
			.map((ext) => base + ext)
			.find((f) => fs.existsSync(f) && fs.statSync(f).isFile());
		return file ?? null;
	};
	const APP = path.join(ROOT, 'app');
	// A screen's own components only: a helper taken from another route (the poster's BackButton from the detail
	// screen) does not render that route.
	const reaches = (file: string, seen = new Set<string>()): boolean => {
		if (file === AD_SLOT) return true;
		if (seen.has(file) || (seen.size > 0 && file.startsWith(APP))) return false;
		seen.add(file);
		const source = fs.readFileSync(file, 'utf8');
		return [...source.matchAll(IMPORT)].some(([, spec]) => {
			const dep = resolve(file, spec!);
			return dep !== null && reaches(dep, seen);
		});
	};
	const routes = (dir: string): string[] =>
		fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }).flatMap((entry) => {
			const rel = `${dir}/${entry.name}`;
			return entry.isDirectory() ? routes(rel) : rel.endsWith('.tsx') ? [rel] : [];
		});

	test('only the map, report detail and reunited screens can render an ad', () => {
		const all = routes('app');
		expect(PROTECTED.filter((route) => !all.includes(route))).toEqual([]);
		expect(PROTECTED.filter((route) => reaches(path.join(ROOT, route)))).toEqual([]);
		expect(all.filter((route) => reaches(path.join(ROOT, route))).sort()).toEqual([...WITH_ADS].sort());
	});
});
