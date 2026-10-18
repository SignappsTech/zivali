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
		event_at: new Date(Date.now() - 5 * 60_000).toISOString(),
		area: { lat: 46.07, lng: 14.48, radius_m: 300 },
		photos: [
			{
				url: 'u',
				thumb_url: `https://media.test/${code}.webp`,
				alt: 'Izgubljen pes, rjave barve',
				width: 4,
				height: 3,
			},
		],
		...extra,
	}) as PublicReport;

describe('RecentReports (T1 layout A, block 2)', () => {
	it('asks the public list for the six newest, cached a minute, and links each card to its report', async () => {
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

		const cards = screen.getAllByRole('link');
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
		expect(cards[1]!.querySelector('img')).toBeNull();
	});

	it.each(['sl', 'en'] as const)(
		'empty in %s: only the body and the alerts action, no "near you" title',
		async (locale) => {
			answer({ items: [], next_cursor: null, total_estimate: 0 });
			const home = catalogues[locale].pages.home;

			show(locale, await RecentReports({ locale }));

			expect(screen.getByText(home.near_empty_body)).toBeTruthy();
			expect(screen.getByRole('link', { name: home.near_empty_action }).getAttribute('href')).toBe(
				locale === 'sl' ? '/racun/opozorila' : '/en/account/alerts'
			);
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

	it('loading: card-shaped skeletons, announced once', () => {
		const { container } = show('en', <RecentReportsSkeleton />);

		expect(screen.getByRole('status').textContent).toBe(en.common.loading);
		expect(container.querySelector('[aria-busy="true"]')).toBeTruthy();
	});
});

describe('LiveNumbers (T1 layout A, block 3)', () => {
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
