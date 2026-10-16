import * as fs from 'node:fs';
import * as path from 'node:path';

import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type * as React from 'react';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getMockEvents, initAnalytics, resetMockEvents, setConsent } from '@zivali/analytics';
import { ad as fixture } from '@zivali/api/__fixtures__/ads';
import { publicReport } from '@zivali/api/__fixtures__/reports';
import en from '@zivali/i18n/dist/en.json';
import sl from '@zivali/i18n/dist/sl.json';
import type { Ad } from '@zivali/types';
import { ReunitedAd } from '@/components/report/reunited-slots';
import { Ad as DetailAd } from '@/components/report/slots/ad';
import type { DetailReport } from '@/components/report/slots/types';

import { AdSlot } from './ad-slot';

// The fixture's click URL is our counter at the default local API URL (no NEXT_PUBLIC_API_URL in the unit tests).
const API = 'http://localhost:4000';
const served: Ad = fixture;
const report = publicReport as DetailReport;
const catalogues = { sl, en };
const name = (ad: Ad, locale: 'sl' | 'en' = 'sl') =>
	`${catalogues[locale].ads.label}: ${ad.title}. ${ad.body} ${catalogues[locale].ads.opens_new_tab}`;

type Answer = Ad | null | Error | number;
const fetchMock = vi.fn<typeof fetch>();
/** The slot request answers `answer` (an ad, null, a status, or a network error); impressions answer 204. */
function answer(value: Answer) {
	fetchMock.mockImplementation(async (_url, init) => {
		if (init?.method === 'POST') return new Response(null, { status: 204 });
		if (value instanceof Error) throw value;
		if (typeof value === 'number')
			return new Response('{"error":{"code":"INTERNAL","message":"x"}}', { status: value });
		return new Response(JSON.stringify(value), { status: 200 });
	});
}
const calls = (method: 'GET' | 'POST') =>
	fetchMock.mock.calls.filter(([, init]) => (init?.method ?? 'GET') === method).map(([url, init]) => ({ url, init }));

/** IntersectionObserver stand-in: `show(ratio)` reports how much of the unit is in view. */
class FakeObserver {
	static all: FakeObserver[] = [];
	disconnected = false;
	constructor(
		private callback: IntersectionObserverCallback,
		readonly options?: IntersectionObserverInit
	) {
		FakeObserver.all.push(this);
	}
	observe() {}
	unobserve() {}
	disconnect() {
		this.disconnected = true;
	}
	show(ratio: number) {
		if (this.disconnected) return;
		const entry = { isIntersecting: ratio > 0, intersectionRatio: ratio } as IntersectionObserverEntry;
		this.callback([entry], this as unknown as IntersectionObserver);
	}
}
const observer = () => FakeObserver.all.at(-1)!;

function show(ui: React.ReactElement, locale: 'sl' | 'en' = 'sl') {
	return render(
		<NextIntlClientProvider locale={locale} messages={catalogues[locale]} timeZone="Europe/Ljubljana">
			{ui}
		</NextIntlClientProvider>
	);
}
/** Half or more of the unit in view for `ms`, under fake timers. */
async function view(ratio: number, ms: number) {
	await act(async () => {
		observer().show(ratio);
		vi.advanceTimersByTime(ms);
	});
}
const gaEvents = () => getMockEvents().filter((event) => event.name.startsWith('ad_'));

beforeEach(() => {
	vi.stubGlobal('fetch', fetchMock);
	vi.stubGlobal('IntersectionObserver', FakeObserver);
	FakeObserver.all = [];
	answer(served);
	initAnalytics();
	setConsent({ analytics: false });
	resetMockEvents();
});
afterEach(() => {
	cleanup();
	vi.useRealTimers();
	vi.unstubAllGlobals();
	fetchMock.mockReset();
	Reflect.deleteProperty(window, 'matchMedia');
});

describe('AdSlot (P21 web)', () => {
	it('detail: one labelled link to our click counter, sponsored, in a new tab, with alt text and the reserved size', async () => {
		const { container } = show(<DetailAd report={report} />);
		// Loading: the empty reserved box, hidden from screen readers.
		const reserved = container.querySelector('[data-ad-slot="detail"]');
		expect(reserved?.getAttribute('aria-hidden')).toBe('true');
		expect(reserved?.textContent).toBe('');
		expect(reserved?.className).toContain('min-h-[200px]');

		const unit = await screen.findByRole('link', { name: name(served) });
		expect(unit.getAttribute('href')).toBe(`${API}/v1/ads/${served.id}/click?s=detail&r=8`);
		expect(unit.getAttribute('rel')).toBe('sponsored noopener');
		expect(unit.getAttribute('target')).toBe('_blank');
		expect(unit.getAttribute('data-ad-slot')).toBe('detail');
		expect(unit.className).toContain('min-h-[200px]');
		expect(unit.className).toContain('lg:min-h-[176px]');
		// The label as text, once; the admin's alt text on the image; the ad's own button text.
		expect(screen.getAllByText(sl.ads.label)).toHaveLength(1);
		expect(screen.getByRole('img', { name: served.image_alt }).getAttribute('src')).toBe(served.image_url);
		expect(screen.getByText(served.cta)).toBeTruthy();

		// The page's context only: the report's region (id 8) and species, the locale; no token, device id or cookie.
		const [get] = calls('GET');
		expect(get?.url).toBe(`${API}/v1/ads/slot/detail?region_id=8&species=dog&locale=sl`);
		expect(Object.keys(get?.init?.headers ?? {})).toEqual(['Accept-Language']);
		expect(get?.init?.credentials).toBeUndefined();
	});

	it.each([
		['no ad', null],
		['an error', 500],
		['a blocked request', new TypeError('Failed to fetch')],
		['a link that is not our click counter', { ...served, click_url: 'https://example.com/landing' }],
	] as [string, Answer][])('collapses silently on %s', async (_, value) => {
		answer(value);
		const { container } = show(<AdSlot slot="feed" />);
		expect(container.querySelector('[data-ad-slot="feed"]')).not.toBeNull();
		await waitFor(() => expect(container.innerHTML).toBe(''));
		expect(screen.queryByText(sl.ads.label)).toBeNull();
	});

	it('counts one impression once half the unit has been in view for a second; GA gets nothing without consent', async () => {
		show(<AdSlot slot="feed" region="osrednjeslovenska" />);
		const unit = await screen.findByRole('link', { name: name(served) });
		expect(observer().options).toEqual({ threshold: 0.5 });
		vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });

		await view(0.3, 5000); // under half: never
		await view(0.6, 900);
		await view(0.2, 500); // out again before the second is up
		expect(calls('POST')).toEqual([]);
		await view(0.6, 1000);
		await view(0.6, 5000);
		expect(calls('POST').map(({ url, init }) => [url, init?.body])).toEqual([
			[`${API}/v1/ads/${served.id}/impressions`, JSON.stringify({ slot: 'feed', region_id: 8 })],
		]);
		expect(observer().disconnected).toBe(true);

		unit.addEventListener('click', (event) => event.preventDefault());
		fireEvent.click(unit);
		// Our aggregate count is not analytics: it goes out without consent, GA does not.
		expect(gaEvents()).toEqual([]);
	});

	it('with consent, ad_impression and ad_click reach GA with the slot, ad id, region and species (reunited)', async () => {
		setConsent({ analytics: true });
		show(<ReunitedAd report={report} />);
		const unit = await screen.findByRole('link', { name: name(served) });
		expect(calls('GET')[0]?.url).toBe(`${API}/v1/ads/slot/reunited?region_id=8&species=dog&locale=sl`);
		vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
		await view(1, 1000);
		unit.addEventListener('click', (event) => event.preventDefault());
		fireEvent.click(unit);

		const params = { ad_slot: 'reunited', ad_id: served.id, region: 'osrednjeslovenska', species: 'dog' };
		expect(gaEvents()).toEqual([
			{ name: 'ad_impression', params },
			{ name: 'ad_click', params },
		]);
	});

	it('feed: a row with the label, one-line title and text and a chevron; EN label "Ad"', async () => {
		show(<AdSlot slot="feed" />, 'en');
		const unit = await screen.findByRole('link', { name: name(served, 'en') });
		expect(unit.className).toContain('min-h-[88px]');
		expect(screen.getByText(en.ads.label)).toBeTruthy();
		expect(screen.getByText(served.title).className).toContain('truncate');
		expect(screen.getByText(served.body).className).toContain('truncate');
		expect(unit.querySelector('svg')).not.toBeNull();
		// No button text in the feed row.
		expect(screen.queryByText(served.cta)).toBeNull();
	});

	it('a sponsor without an image is text-only; a house ad shows the decorative illustration; no button text → "Več o tem"', async () => {
		answer({ ...served, image_url: null, cta: '' });
		show(<AdSlot slot="detail" />);
		const unit = await screen.findByRole('link', { name: name(served) });
		expect(screen.queryByRole('img')).toBeNull();
		expect(unit.querySelector('svg')).toBeNull();
		expect(screen.getByText(sl.ads.learn_more)).toBeTruthy();
		cleanup();

		const house = { ...served, image_url: null, is_house: true };
		answer(house);
		show(<AdSlot slot="detail" />);
		const houseUnit = await screen.findByRole('link', { name: name(house) });
		expect(screen.queryByRole('img')).toBeNull();
		expect(houseUnit.querySelector('[aria-hidden="true"] > svg')).not.toBeNull();
	});

	it('sidebar: the 320 by 452 unit with the 4:3 image on top, and no request below lg', async () => {
		window.matchMedia = ((query: string) => ({ matches: query === '(min-width: 64rem)' })) as typeof matchMedia;
		show(<AdSlot slot="sidebar" region="gorenjska" species="cat" />);
		const unit = await screen.findByRole('link', { name: name(served) });
		expect(unit.className).toContain('min-h-[452px]');
		expect(unit.className).toContain('max-w-[320px]');
		expect(screen.getByRole('img', { name: served.image_alt }).className).toContain('aspect-[4/3]');
		expect(calls('GET')[0]?.url).toBe(`${API}/v1/ads/slot/sidebar?region_id=9&species=cat&locale=sl`);
		cleanup();
		fetchMock.mockClear();

		window.matchMedia = (() => ({ matches: false })) as unknown as typeof matchMedia;
		const { container } = show(<AdSlot slot="sidebar" />);
		await act(async () => {
			await import('./ad-unit');
		});
		expect(container.querySelector('[data-ad-slot="sidebar"]')?.getAttribute('aria-hidden')).toBe('true');
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('the server renders only the reserved box: no request and no impression before the browser has it', () => {
		const html = renderToString(
			<NextIntlClientProvider locale="sl" messages={sl} timeZone="Europe/Ljubljana">
				<AdSlot slot="detail" />
			</NextIntlClientProvider>
		);
		expect(html).toContain('data-ad-slot="detail"');
		expect(html).toContain('aria-hidden="true"');
		expect(html).not.toContain(sl.ads.label);
		expect(fetchMock).not.toHaveBeenCalled();
	});
});

// The routes that can render an ad, traced through their static imports: every other route, among them the report
// flows, manage (/m), chat (inbox), sign-in, payments, consent settings, admin and the Partners page, never even
// imports AdSlot, so none of their states can show one (C15, FR-030).
describe('no AdSlot in protected flows', () => {
	const ROOT = path.join(import.meta.dirname, '../..');
	const APP = path.join(ROOT, 'app');
	const AD_SLOT = path.join(ROOT, 'components/ads/ad-slot.tsx');
	const WITH_ADS = [
		'app/[locale]/(public)/map/page.tsx',
		'app/[locale]/(public)/r/[code]/page.tsx',
		'app/[locale]/(app)/r/[code]/reunited/page.tsx',
	];
	const PROTECTED = [
		'app/[locale]/(public)/report/lost/page.tsx',
		'app/[locale]/(public)/report/found/page.tsx',
		'app/[locale]/(public)/m/page.tsx',
		'app/[locale]/(app)/inbox/page.tsx',
		'app/[locale]/(app)/inbox/[id]/page.tsx',
		'app/[locale]/(public)/sign-in/page.tsx',
		'app/[locale]/(public)/sign-up/page.tsx',
		'app/[locale]/(public)/reset-password/page.tsx',
		'app/[locale]/(app)/payments/return/page.tsx',
		'app/[locale]/(app)/account/payments/page.tsx',
		'app/[locale]/dev/checkout/page.tsx',
		'app/[locale]/(public)/cookies/page.tsx',
		'app/[locale]/(public)/advertise/page.tsx',
		'app/[locale]/(admin)/admin/page.tsx',
	];
	// Value imports and re-exports, side-effect imports included; `import type` brings no code. Dynamic import() is
	// not followed: a lazily loaded AdSlot must be added to this guard by hand.
	const IMPORT = /^\s*(?:import|export)\s+(?!type\s)(?:[^'";]*?\sfrom\s+)?['"]([^'"]+)['"]/gm;

	const resolve = (from: string, spec: string): string | null => {
		const base = spec.startsWith('@/')
			? path.join(ROOT, spec.slice(2))
			: spec.startsWith('.')
				? path.join(path.dirname(from), spec)
				: null;
		if (!base) return null;
		return (
			['', '.tsx', '.ts', '/index.tsx', '/index.ts']
				.map((ext) => base + ext)
				.find((file) => fs.existsSync(file) && fs.statSync(file).isFile()) ?? null
		);
	};
	// A route's own components only: a helper from another route file does not render that route.
	const reaches = (file: string, seen = new Set<string>()): boolean => {
		if (file === AD_SLOT) return true;
		if (seen.has(file) || (seen.size > 0 && file.startsWith(APP))) return false;
		seen.add(file);
		return [...fs.readFileSync(file, 'utf8').matchAll(IMPORT)].some(([, spec]) => {
			const dep = resolve(file, spec!);
			return dep !== null && reaches(dep, seen);
		});
	};
	const routes = (dir: string): string[] =>
		fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }).flatMap((entry) => {
			const rel = `${dir}/${entry.name}`;
			if (entry.isDirectory()) return routes(rel);
			return /^(page|layout|route)\.tsx?$/.test(entry.name) ? [rel] : [];
		});

	it('only the map, report detail and reunited pages can render an ad', () => {
		const all = routes('app');
		expect(PROTECTED.filter((route) => !all.includes(route))).toEqual([]);
		expect(PROTECTED.filter((route) => reaches(path.join(ROOT, route)))).toEqual([]);
		expect(all.filter((route) => reaches(path.join(ROOT, route))).sort()).toEqual([...WITH_ADS].sort());
	});
});
