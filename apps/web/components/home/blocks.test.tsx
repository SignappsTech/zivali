import { cleanup, render, screen, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type * as React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import en from '@zivali/i18n/dist/en.json';
import sl from '@zivali/i18n/dist/sl.json';
import type { PublicReport, PublicStats } from '@zivali/types';

import { LiveNumbers, RecentReports, RecentReportsSkeleton } from './blocks';

const catalogues = { sl, en };

const getPlace = vi.hoisted(() => vi.fn());
vi.mock('@/lib/report', () => ({ getPlace }));

const fetchMock = vi.fn<typeof fetch>();
const answer = (body: unknown, status = 200) =>
	fetchMock.mockResolvedValue(new Response(JSON.stringify(body), { status }));

beforeEach(() => {
	vi.stubGlobal('fetch', fetchMock);
	getPlace.mockResolvedValue({ label: 'Šiška, Ljubljana', area: 'Šiška', municipality: 'Ljubljana' });
});
afterEach(() => {
	cleanup();
	vi.unstubAllGlobals();
	vi.clearAllMocks();
});

const show = (locale: 'sl' | 'en', node: React.ReactNode) =>
	render(
		<NextIntlClientProvider locale={locale} messages={catalogues[locale]}>
			{node}
		</NextIntlClientProvider>
	);

const report = (code: string, extra: Partial<PublicReport> = {}) =>
	({
		id: `id-${code}`,
		short_code: code,
		type: 'lost',
		status: 'open',
		species: 'dog',
		name: 'Luna',
		colours: ['brown'],
		event_at: new Date(Date.now() - 5 * 60_000).toISOString(),
		area: { lat: 46.07, lng: 14.48, radius_m: 300 },
		photos: [
			{
				url: 'u',
				thumb_url: `https://media.test/${code}.webp`,
				// The API's detail-page alt starts with the name (P9 §11): the card must not use it.
				alt: `${extra.name ?? 'Luna'}: pes rjave barve, Ljubljana, fotografija 1 od 2`,
				width: 4,
				height: 3,
			},
		],
		...extra,
	}) as PublicReport;

/** The report rows; the map teaser is the other link. */
const rows = () => within(screen.getByRole('list')).getAllByRole('link');

describe('RecentReports (T1 layout B, block 2)', () => {
	it('asks the public list for the six newest, cached a minute, and links each row to its report', async () => {
		answer({
			items: [report('Ab3dEf7h'), report('Cd4fGh8j', { type: 'found', species: 'cat', photos: [] })],
			next_cursor: null,
			total_estimate: 2,
		});
		getPlace.mockResolvedValueOnce({ label: 'Šiška, Ljubljana' }).mockResolvedValueOnce(undefined);

		show('sl', await RecentReports({ locale: 'sl' }));

		const [url, init] = fetchMock.mock.calls[0]!;
		expect(String(url)).toMatch(/\/v1\/reports\?sort=recent&limit=6$/);
		expect(init).toMatchObject({ method: 'GET', next: { revalidate: 60 } });
		expect(getPlace).toHaveBeenCalledWith('sl', 46.07, 14.48);

		const cards = rows();
		expect(cards.map((card) => [card.getAttribute('href'), card.getAttribute('aria-label')])).toEqual([
			['/r/Ab3dEf7h', 'Izgubljen pes, Izgubljena, pred 5 minutami, Šiška, Ljubljana'],
			// No place name (lookup failed): the trailing separator goes too.
			['/r/Cd4fGh8j', 'Najdena mačka, Najdena, pred 5 minutami'],
		]);
		// Status, species and rough area only: never the pet's name.
		expect(within(cards[0]!).getByText('Izgubljen pes')).toBeTruthy();
		expect(within(cards[0]!).getByText('Šiška, Ljubljana')).toBeTruthy();
		expect(screen.queryByText(/Luna/)).toBeNull();
		expect(cards[0]!.querySelector('img')?.getAttribute('src')).toBe('https://media.test/Ab3dEf7h.webp');
		// No photo: the muted tile shows a paw print, never an empty tile (TASK-115.11).
		expect(cards[1]!.querySelector('img')).toBeNull();
		const tile = cards[1]!.firstElementChild!;
		expect([tile.getAttribute('aria-hidden'), tile.className]).toEqual([
			'true',
			expect.stringMatching(/\bbg-muted\b/),
		]);
		expect(tile.querySelector('svg')).not.toBeNull();
	});

	it('the map teaser: a drawn tile with a pin per report in its status colour, opening /map, no map library', async () => {
		answer({
			items: [
				// Ljubljana, Koper, and a point past the border, which stays on the tile.
				report('Ab3dEf7h', { area: { lat: 46.05, lng: 14.51, radius_m: 300 } }),
				report('Cd4fGh8j', { type: 'found', area: { lat: 45.55, lng: 13.73, radius_m: 300 } }),
				report('Ef5gHi9k', { status: 'reunited', area: { lat: 47.5, lng: 17.2, radius_m: 300 } }),
			],
			next_cursor: null,
			total_estimate: 3,
		});

		const { container } = show('sl', await RecentReports({ locale: 'sl' }));

		// The teaser, then the visible text link under the rows, which only shows below lg (the heading's is lg only).
		const [teaser, below] = screen.getAllByRole('link', { name: sl.pages.home.near_open_map });
		expect([teaser!.getAttribute('href'), below!.getAttribute('href')]).toEqual(['/zemljevid', '/zemljevid']);
		expect(below!.className).toMatch(/\blg:hidden\b/);
		expect(below!.compareDocumentPosition(screen.getByRole('list'))).toBe(Node.DOCUMENT_POSITION_PRECEDING);
		// Hidden from assistive tech: the rows are the list alternative.
		expect(teaser!.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
		// Inside x 63-337, y 63-237, so the 2:1 and the 1:1 crops never cut a pin; the far point is clamped.
		const pins = [...teaser!.querySelectorAll('[data-pin]')];
		expect(pins.map((pin) => [pin.getAttribute('data-pin'), pin.getAttribute('transform')])).toEqual([
			['lost', 'translate(159 162)'],
			['found', 'translate(93 222)'],
			['reunited', 'translate(337 63)'],
		]);
		expect(pins.map((pin) => pin.lastElementChild?.getAttribute('class'))).toEqual([
			'fill-marker-lost',
			'fill-marker-found',
			'fill-marker-reunited',
		]);
		expect(container.querySelector('canvas, script, .maplibregl-map')).toBeNull();
		expect(teaser!.querySelectorAll('[data-cluster]')).toHaveLength(0);
	});

	it('the map teaser: overlapping pins merge into one cluster disc with the count, at their centre', async () => {
		answer({
			items: [
				// Ljubljana at (159 162); 40 units east (199 162) overlaps nothing yet, so it starts its own group.
				report('Code0001', { area: { lat: 46.05, lng: 14.51, radius_m: 300 } }),
				report('Code0002', { type: 'found', area: { lat: 45.55, lng: 13.73, radius_m: 300 } }),
				report('Code0003', { area: { lat: 46.05, lng: 14.983, radius_m: 300 } }),
				// Halfway (179 162) it overlaps both, so the two groups become one; then one more on Ljubljana.
				report('Code0004', { area: { lat: 46.05, lng: 14.7465, radius_m: 300 } }),
				report('Code0005', { status: 'reunited', area: { lat: 47.5, lng: 17.2, radius_m: 300 } }),
				report('Code0006', { area: { lat: 46.06, lng: 14.5, radius_m: 300 } }),
			],
			next_cursor: null,
			total_estimate: 6,
		});

		show('sl', await RecentReports({ locale: 'sl' }));

		const [teaser] = screen.getAllByRole('link', { name: sl.pages.home.near_open_map });
		const clusters = [...teaser!.querySelectorAll('[data-cluster]')];
		expect(
			clusters.map((c) => [c.getAttribute('data-cluster'), c.getAttribute('transform'), c.textContent])
		).toEqual([['4', 'translate(174 162)', '4']]);
		expect(clusters[0]!.querySelector('circle:last-of-type')?.getAttribute('class')).toBe('fill-marker-cluster');
		expect(clusters[0]!.querySelector('text')?.getAttribute('class')).toMatch(/\bfill-marker-cluster-foreground\b/);
		// The pins that overlap nothing stay single, in their status colours.
		expect(
			[...teaser!.querySelectorAll('[data-pin]')].map((pin) => [
				pin.getAttribute('data-pin'),
				pin.getAttribute('transform'),
			])
		).toEqual([
			['found', 'translate(93 222)'],
			['reunited', 'translate(337 63)'],
		]);
		// Every row stays in the list: the cluster only changes the drawing.
		expect(rows()).toHaveLength(6);
	});

	it('the map teaser: a pin that would touch the disc joins it; the next single pin stays clear of it', async () => {
		answer({
			items: [
				// Ljubljana (159 162) and (159 161) overlap; 28 units east (187 162) would sit under the 16-unit disc.
				report('Code0001', { area: { lat: 46.05, lng: 14.51, radius_m: 300 } }),
				report('Code0002', { area: { lat: 46.06, lng: 14.5, radius_m: 300 } }),
				report('Code0003', { area: { lat: 46.05, lng: 14.841, radius_m: 300 } }),
				// 40 units west (119 162): a single pin next to the cluster.
				report('Code0004', { area: { lat: 46.05, lng: 14.037, radius_m: 300 } }),
			],
			next_cursor: null,
			total_estimate: 4,
		});

		show('sl', await RecentReports({ locale: 'sl' }));

		const [teaser] = screen.getAllByRole('link', { name: sl.pages.home.near_open_map });
		const [cluster, ...others] = [...teaser!.querySelectorAll('[data-cluster]')];
		expect(others).toEqual([]);
		expect([cluster?.getAttribute('data-cluster'), cluster?.getAttribute('transform')]).toEqual([
			'3',
			'translate(168 162)',
		]);
		const pins = [...teaser!.querySelectorAll('[data-pin]')];
		expect(pins.map((pin) => pin.getAttribute('transform'))).toEqual(['translate(119 162)']);
		// Disc (16) and pin (13) halos never touch: 49 units apart.
		const [cx, cy] = cluster!.getAttribute('transform')!.match(/\d+/g)!.map(Number);
		const [px, py] = pins[0]!.getAttribute('transform')!.match(/\d+/g)!.map(Number);
		expect(Math.hypot(cx! - px!, cy! - py!)).toBeGreaterThanOrEqual(16 + 13);
	});

	it('the map teaser: six reports in one place are one disc with 6, kept inside the crop-safe box', async () => {
		answer({
			items: Array.from({ length: 6 }, (_, i) =>
				report(`Code000${i}`, { area: { lat: 47.5, lng: 12.0, radius_m: 300 } })
			),
			next_cursor: null,
			total_estimate: 6,
		});

		show('sl', await RecentReports({ locale: 'sl' }));

		const [teaser] = screen.getAllByRole('link', { name: sl.pages.home.near_open_map });
		expect(teaser!.querySelectorAll('[data-pin]')).toHaveLength(0);
		const [cluster] = teaser!.querySelectorAll('[data-cluster]');
		// The pins clamp to the corner (63, 63); the larger disc sits 3 units further in.
		expect([cluster?.getAttribute('data-cluster'), cluster?.getAttribute('transform')]).toEqual([
			'6',
			'translate(66 66)',
		]);
	});

	it('6 reports: six full rows on every width (nothing hidden from lg)', async () => {
		answer({
			items: Array.from({ length: 6 }, (_, i) => report(`Code000${i}`)),
			next_cursor: null,
			total_estimate: 6,
		});

		show('sl', await RecentReports({ locale: 'sl' }));

		const items = within(screen.getByRole('list')).getAllByRole('listitem');
		expect(items).toHaveLength(6);
		expect(items.filter((li) => /\bhidden\b/.test(li.className))).toEqual([]);
	});

	it.each([
		['sl', 'Izgubljena mačka, bele in sive barve', 'Izgubljena mačka'],
		['en', 'Lost cat, white and grey', 'Lost cat'],
	] as const)(
		'%s: the photo alt is type, species and colours, never the name (P3 §Home alt text)',
		async (locale, alt, bare) => {
			answer({
				items: [
					report('Ab3dEf7h', { species: 'cat', name: 'Spuži Kvadratnik', colours: ['white', 'grey'] }),
					report('Cd4fGh8j', { species: 'cat', name: 'Spuži Kvadratnik', colours: [] }),
				],
				next_cursor: null,
				total_estimate: 2,
			});

			show(locale, await RecentReports({ locale }));

			const cards = rows();
			expect(cards.map((card) => card.querySelector('img')?.getAttribute('alt'))).toEqual([alt, bare]);
			for (const card of cards) {
				const said = [
					card.textContent,
					card.getAttribute('aria-label'),
					card.querySelector('img')?.getAttribute('alt'),
				];
				expect(said.join(' ')).not.toMatch(/Spuži|Kvadratnik/);
			}
		}
	);

	it.each(['sl', 'en'] as const)(
		'empty in %s: the teaser without pins, only the body and the alerts action, no "near you" title',
		async (locale) => {
			answer({ items: [], next_cursor: null, total_estimate: 0 });
			const home = catalogues[locale].pages.home;

			show(locale, await RecentReports({ locale }));

			expect(screen.getByText(home.near_empty_body)).toBeTruthy();
			expect(screen.getByRole('link', { name: home.near_empty_action }).getAttribute('href')).toBe(
				locale === 'sl' ? '/racun/opozorila' : '/en/account/alerts'
			);
			// Only the teaser: the text link under the rows belongs to the filled state.
			const teaser = screen.getByRole('link', { name: home.near_open_map });
			expect(teaser.querySelectorAll('[data-pin]')).toHaveLength(0);
			expect(screen.queryByRole('heading')).toBeNull();
			expect(getPlace).not.toHaveBeenCalled();
		}
	);

	it.each([
		['an API error', () => answer({ error: { code: 'INTERNAL' } }, 500)],
		['no network', () => fetchMock.mockRejectedValue(new TypeError('fetch failed'))],
	])('%s: the inline error with a retry, never the empty copy', async (_, fail) => {
		fail();
		const home = sl.pages.home;

		show('sl', await RecentReports({ locale: 'sl' }));

		const alert = screen.getByRole('alert');
		expect(alert.textContent).toContain(home.near_error);
		expect(within(alert).getByRole('link', { name: sl.common.try_again }).getAttribute('href')).toBe('/');
		expect(screen.queryByText(home.near_empty_body)).toBeNull();
	});

	it('loading: teaser- and row-shaped skeletons, announced once', () => {
		const { container } = show('en', <RecentReportsSkeleton />);

		expect(screen.getByRole('status').textContent).toBe(en.common.loading);
		expect(container.querySelector('[aria-busy="true"]')).toBeTruthy();
	});
});

describe('LiveNumbers (T1 layout B, block 3)', () => {
	const stats: PublicStats = { reunited_total: 120, open_reports: 1350, alert_subscribers: 12340 };

	it.each([
		['sl', ['120', '1.350', '12.340']],
		['en', ['120', '1,350', '12,340']],
	] as const)('all three set in %s: the counts with the slice labels, cached 5 minutes', async (locale, numbers) => {
		answer(stats);
		const home = catalogues[locale].pages.home;

		show(locale, await LiveNumbers({ locale }));

		expect(String(fetchMock.mock.calls[0]![0])).toMatch(/\/v1\/stats\/public$/);
		expect(fetchMock.mock.calls[0]![1]).toMatchObject({ next: { revalidate: 300 } });
		expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
			`${numbers[0]}${home.stat_reunited}`,
			`${numbers[1]}${home.stat_open}`,
			`${numbers[2]}${home.stat_alerts}`,
		]);
	});

	it.each([
		['one count under 50 (null)', () => answer({ ...stats, alert_subscribers: null })],
		['an API error', () => answer({ error: { code: 'RATE_LIMITED' } }, 429)],
		['no network', () => fetchMock.mockRejectedValue(new TypeError('fetch failed'))],
	])('%s: the whole block stays hidden', async (_, setup) => {
		setup();

		expect(await LiveNumbers({ locale: 'sl' })).toBeNull();
	});
});
