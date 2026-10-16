import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type * as React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ownerReport, publicReport } from '@zivali/api/__fixtures__/reports';
import en from '@zivali/i18n/dist/en.json';
import sl from '@zivali/i18n/dist/sl.json';
import { Gallery } from '@/components/report/gallery';
import type { DetailReport } from '@/components/report/slots';

import ReportPage, { generateMetadata } from './page';

const catalogues = { sl, en };

vi.mock('next-intl/server', async () => {
	const { createTranslator } = await import('next-intl');
	return {
		getTranslations: async ({ locale, namespace }: { locale: 'sl' | 'en'; namespace: string }) =>
			createTranslator({ locale, messages: catalogues[locale], namespace: namespace as 'report' }),
		getMessages: async ({ locale }: { locale: 'sl' | 'en' }) => catalogues[locale],
	};
});
const data = vi.hoisted(() => ({ getReport: vi.fn(), getPlace: vi.fn() }));
vi.mock('@/lib/report', () => data);
vi.mock('next/navigation', async (original) => ({
	...(await original<object>()),
	notFound: () => {
		throw new Error('NEXT_NOT_FOUND');
	},
}));
// What the page hands MapView; MapLibre itself is covered by components/map.
vi.mock('@/components/map/map-view', () => ({
	MapView: (props: { label: string; markers: unknown; circles: unknown; textAlternative: React.ReactNode }) => (
		<div
			data-testid="map"
			aria-label={props.label}
			data-markers={JSON.stringify(props.markers)}
			data-circles={JSON.stringify(props.circles)}
		>
			{props.textAlternative}
		</div>
	),
}));
// The owner actions (slots A and C) are client islands with their own tests (components/report/owner-actions.test.tsx), loaded lazily by slots/owner-lazy.
vi.mock('@/components/report/slots/owner-lazy', () => ({
	OwnerActions: ({ report }: { report: DetailReport }) => (
		<div data-testid="owner-actions" data-status={report.status} />
	),
	OwnerMenu: () => <div data-testid="owner-menu" />,
}));
// The ad units have their own tests (components/ads/ad-slot.test.tsx); here: where the page puts them.
vi.mock('@/components/ads/ad-slot', () => ({
	AdSlot: (props: { slot: string; region?: string; species?: string }) => (
		<div data-testid={`ad-${props.slot}`} data-region={props.region} data-species={props.species} />
	),
}));
// Server components read the whole catalogue (next-intl/server); PageMessages only scopes the client copy, which the
// last test covers on its own.
vi.mock('@/components/page-messages', () => ({
	PageMessages: ({ children }: { children: React.ReactNode }) => children,
}));

const CHIP = '705098100012345';
const thisYear = new Date().getUTCFullYear();
const lost: DetailReport = {
	...publicReport,
	short_code: 'Rex12345',
	type: 'lost',
	name: 'Rex',
	breed_codes: ['dog.mixed'],
	colours: ['brown', 'white'],
	pattern: 'bicolour',
	size: 'm',
	sex: 'male',
	has_chip: true,
	event_at: new Date(Date.UTC(thisYear, 9, 12, 16)).toISOString(),
	circumstances: 'Ustrašil se je ognjemeta.',
	reward: { eur: 50, note: 'tudi za podatek' },
	area: { lat: 46.064, lng: 14.493, radius_m: 500 },
	photos: [
		{ ...publicReport.photos[0]!, alt: 'Pogrešani pes Rex, fotografija 1 od 2' },
		{
			...publicReport.photos[0]!,
			url: 'https://media.zivali.test/r/2.webp',
			alt: 'Pogrešani pes Rex, fotografija 2 od 2',
		},
	],
};
const owner: DetailReport = {
	...ownerReport,
	...lost,
	is_mine: true,
	manager_role: 'owner',
	moderation_state: 'held',
	chip_number: CHIP,
	collar: 'rdeča z zvončkom',
	location: { lat: 46.06512, lng: 14.49177 },
};
const place = { label: 'Šiška, Ljubljana', area: 'Šiška', municipality: 'Ljubljana' };

const props = (locale: 'sl' | 'en' = 'sl', code = 'Rex12345') =>
	({ params: Promise.resolve({ locale, code }) }) as PageProps<'/[locale]/r/[code]'>;

async function renderPage(locale: 'sl' | 'en' = 'sl') {
	const page = await ReportPage(props(locale));
	render(
		<NextIntlClientProvider locale={locale} messages={catalogues[locale]} timeZone="Europe/Ljubljana">
			{page}
		</NextIntlClientProvider>
	);
}
/** `where` null: no place (outside Slovenia, failed lookup). */
const show = (report: DetailReport, where: typeof place | null = place) => {
	data.getReport.mockResolvedValue({ report });
	data.getPlace.mockResolvedValue(where ?? undefined);
};
const jsonLd = () => document.querySelector('script[type="application/ld+json"]')?.textContent;
const fact = (label: string) => screen.getByText(label, { selector: 'dt' }).nextElementSibling?.textContent;

beforeEach(() => show(lost));
afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

describe('P9 /r/[code], lost report (visitor)', () => {
	it('renders the public facts, the chip only as "Čip vpisan", and the fuzzed area', async () => {
		await renderPage();

		expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Rex');
		expect(screen.getByText('Pes · Mešanec · samec')).toBeTruthy();
		expect(screen.getByText(sl.browse.status_lost)).toBeTruthy();
		expect(screen.getByText(/^Pogrešana od 12\. oktobra$/)).toBeTruthy();
		expect(fact('Barva')).toBe('rjava in bela');
		expect(fact('Velikost')).toBe('srednja');
		expect(fact('Čip')).toBe('Čip vpisan');
		expect(fact('Spol')).toBe('samec');
		// The collar text is a manager field.
		expect(screen.queryByText('Ovratnica', { selector: 'dt' })).toBeNull();
		expect(screen.getByText('Šiška', { selector: 'b' }).parentElement?.textContent).toBe('Območje: Šiška');
		expect(screen.getByRole('heading', { level: 2, name: 'Kaj se je zgodilo' })).toBeTruthy();
		expect(screen.getByText('Ustrašil se je ognjemeta.')).toBeTruthy();
		expect(screen.getByRole('img', { name: 'Pogrešani pes Rex, fotografija 1 od 2' })).toBeTruthy();

		// Slot C (TASK-25.3): a visitor can report abuse from "Več možnosti".
		expect(screen.getByRole('button', { name: sl.report.more }).getAttribute('aria-haspopup')).toBe('menu');

		const map = screen.getByTestId('map');
		expect(map.getAttribute('aria-label')).toBe('Približno območje okoli kraja Šiška, polmer približno 500 m');
		expect(within(map).getByText('Območje: Šiška, približno 500 m')).toBeTruthy();
		// The public centre on a disc of the true radius, in the lost hue; no other point.
		expect(JSON.parse(map.dataset.markers!)).toEqual([
			{
				id: 'report',
				position: { lat: 46.064, lng: 14.493 },
				kind: 'lost',
				label: 'Rex',
				photoUrl: lost.photos[0]!.thumb_url,
			},
		]);
		expect(JSON.parse(map.dataset.circles!)).toEqual([
			{ id: 'area', center: { lat: 46.064, lng: 14.493 }, radiusM: 500, kind: 'area', status: 'lost' },
		]);
	});

	it('puts one detail ad below "Kje je bila videna" and the sidebar ad in the "Oglasi" landmark (P21, AC#2)', async () => {
		await renderPage();

		const where = screen.getByRole('heading', { level: 2, name: sl.report.where_title });
		const detail = screen.getByTestId('ad-detail');
		expect(where.compareDocumentPosition(detail) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
		const sidebar = screen.getByRole('complementary', { name: sl.ads.sidebar_label });
		expect(sidebar.className).toContain('lg:block');
		expect(sidebar.className).toContain('hidden');
		expect(within(sidebar).getByTestId('ad-sidebar')).toBeTruthy();
		// Targeted by the report's region and species (C14), on both.
		for (const ad of [detail, within(sidebar).getByTestId('ad-sidebar')])
			expect([ad.dataset.region, ad.dataset.species]).toEqual(['osrednjeslovenska', 'dog']);
		expect(screen.getAllByTestId(/^ad-/)).toHaveLength(2);
	});

	it('shows the reward line with the reward scam warning as the one note', async () => {
		await renderPage();

		expect(screen.getByText(/^Nagrada: 50\s€ · tudi za podatek$/)).toBeTruthy();
		const note = screen.getByRole('note');
		expect(note.textContent).toBe(`${sl.report.safety_note_reward} ${sl.report.safety_link}`);
		expect(within(note).getByRole('link', { name: sl.report.safety_link }).getAttribute('href')).toBe('/varnost');
		expect(screen.queryByText(sl.report.safety_note, { exact: false })).toBeNull();
	});

	it('without a reward keeps the plain safety note', async () => {
		show({ ...lost, reward: undefined });
		await renderPage();

		expect(screen.queryByText(/Nagrada/)).toBeNull();
		expect(screen.getByRole('note').textContent).toBe(`${sl.report.safety_note} ${sl.report.safety_link}`);
	});

	it('has SL meta, Open Graph and JSON-LD without location data or chip', async () => {
		const metadata = await generateMetadata(props());

		expect(metadata.title).toEqual({ absolute: 'Izgubljen pes Rex – Ljubljana · Najdimo' });
		expect(metadata.description).toBe(
			'Pogrešan pes Rex, rjave in bele barve. Nazadnje viden 12. oktobra v okolici kraja Šiška, Ljubljana. Ste ga videli? Sporočite opažanje.'
		);
		expect(metadata.alternates?.canonical).toBe('https://najdimo.si/r/Rex12345');
		expect(metadata.robots).toBeUndefined();
		expect(metadata.openGraph).toMatchObject({
			type: 'article',
			title: 'Izgubljen pes Rex – Ljubljana',
			images: [
				{ url: '/r/Rex12345/opengraph-image', width: 1200, height: 630, alt: 'Izgubljen pes Rex, Ljubljana' },
			],
		});

		await renderPage();
		const [article, breadcrumb] = JSON.parse(jsonLd()!)['@graph'];
		expect(article).toMatchObject({
			'@type': 'Article',
			headline: 'Rex',
			url: 'https://najdimo.si/r/Rex12345',
			image: lost.photos.map((photo) => photo.url),
			contentLocation: { '@type': 'Place', name: 'Šiška, Ljubljana' },
			inLanguage: 'sl',
			isAccessibleForFree: true,
		});
		expect(article.contentLocation.geo).toBeUndefined();
		expect(breadcrumb.itemListElement.map((item: { name: string }) => item.name)).toEqual([
			'Najdimo',
			'Zemljevid',
			'Rex',
		]);
		expect(jsonLd()).not.toMatch(/46\.06|14\.49/);
	});

	it('is localised in EN', async () => {
		const metadata = await generateMetadata(props('en'));

		expect(metadata.title).toEqual({ absolute: 'Lost dog Rex – Ljubljana · Najdimo' });
		expect(metadata.description).toBe(
			'Missing dog Rex, brown and white. Last seen on 12 October around Šiška, Ljubljana. Have you seen this dog? Report a sighting.'
		);
		expect(metadata.alternates?.canonical).toBe('https://najdimo.si/en/r/Rex12345');
		expect(metadata.openGraph?.images).toEqual([
			{ url: '/r/Rex12345/opengraph-image?lang=en', width: 1200, height: 630, alt: 'Lost dog Rex, Ljubljana' },
		]);

		await renderPage('en');
		expect(screen.getByText(/^Missing since 12 October$/)).toBeTruthy();
		expect(screen.getByText(/^Reward offered: €50 · tudi za podatek$/)).toBeTruthy();
		expect(fact('Microchip')).toBe('Chip on file');
		expect(JSON.parse(jsonLd()!)['@graph'][0].inLanguage).toBe('en');
	});

	it('without a place drops the area from the text and the title', async () => {
		show(lost, null);
		const metadata = await generateMetadata(props());

		expect(metadata.title).toEqual({ absolute: 'Izgubljen pes Rex · Najdimo' });
		expect(metadata.description).toBe('Pogrešan pes Rex, rjave in bele barve. Ste ga videli? Sporočite opažanje.');
		await renderPage();
		expect(screen.queryByText('Območje:', { exact: false, selector: 'p' })).toBeNull();
		expect(screen.getByTestId('map').getAttribute('aria-label')).toBe(sl.report.area_note);
	});
});

describe('P9 /r/[code], other types and states', () => {
	it('a found report has the row title as h1 and "Opomba"', async () => {
		show({ ...publicReport, circumstances: 'Sedel je pred trgovino.' });
		await renderPage();

		expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Najden pes');
		expect(screen.getByRole('heading', { level: 2, name: 'Opomba' })).toBeTruthy();
		expect(fact('Čip')).toBe('Ni podatka');
		expect(JSON.parse(screen.getByTestId('map').dataset.circles!)[0].status).toBe('found');
		const metadata = await generateMetadata(props());
		expect(metadata.title).toEqual({ absolute: 'Najden pes – Ljubljana · Najdimo' });
		expect(metadata.description).toMatch(
			/^Najden pes, zlate barve, \d+\. \w+( \d{4})? v okolici kraja Šiška, Ljubljana\./
		);
	});

	it('reunited: thanks, no actions, area, map or safety note; noindex and no JSON-LD', async () => {
		show({ ...lost, status: 'reunited' });
		await renderPage();

		expect(screen.getByText(sl.browse.status_reunited)).toBeTruthy();
		expect(screen.getByText('Rex je spet doma. Hvala vsem, ki ste pomagali.')).toBeTruthy();
		expect(screen.queryByTestId('owner-actions')).toBeNull();
		expect(screen.queryByRole('note')).toBeNull();
		expect(screen.queryByTestId('map')).toBeNull();
		expect(screen.queryByText(sl.report.area_note)).toBeNull();
		expect(screen.queryByRole('button', { name: sl.report.more })).toBeNull();
		expect(jsonLd()).toBeUndefined();
		expect((await generateMetadata(props())).robots).toEqual({ index: false });
	});

	it('closed: muted "Zaključeno", the area line, no actions; noindex', async () => {
		show({ ...lost, status: 'closed' });
		await renderPage();

		expect(screen.getByText(sl.browse.status_closed)).toBeTruthy();
		expect(screen.getByText(sl.report.closed)).toBeTruthy();
		expect(screen.getByText(sl.report.area_note)).toBeTruthy();
		expect(screen.queryByRole('note')).toBeNull();
		expect(screen.queryByTestId('map')).toBeNull();
		expect((await generateMetadata(props())).robots).toEqual({ index: false });
	});

	it('gone (hidden, removed, closed > 30 days): the 410 page, no report data', async () => {
		data.getReport.mockResolvedValue({ gone: true });
		await renderPage();

		expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(sl.errors.page_410_title);
		expect(document.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('noindex');
		expect(jsonLd()).toBeUndefined();
		expect(await generateMetadata(props())).toEqual({});
		expect(data.getPlace).not.toHaveBeenCalled();
	});

	it('an unknown code is the 404 page', async () => {
		data.getReport.mockResolvedValue(null);

		await expect(ReportPage(props())).rejects.toThrow('NEXT_NOT_FOUND');
		expect(await generateMetadata(props())).toEqual({});
	});
});

describe('P9 /r/[code], owner view', () => {
	beforeEach(() => show(owner));

	it('shows why a held report is not public, the collar and the own point, never the chip number', async () => {
		await renderPage();

		expect(screen.getByRole('status').textContent).toBe(sl.report.owner_held);
		expect(fact('Ovratnica')).toBe('rdeča z zvončkom');
		expect(fact('Čip')).toBe('Čip vpisan');
		expect(document.body.textContent).not.toContain(CHIP);
		const map = screen.getByTestId('map');
		expect(JSON.parse(map.dataset.markers!)[1]).toEqual({
			id: 'own',
			position: owner.location,
			kind: 'me',
			label: sl.location.exact_own,
		});
		expect(within(map).getByText(sl.location.exact_own)).toBeTruthy();
		expect(within(map).getByText(sl.location.exact_own_help)).toBeTruthy();
		// No "Prijavi zlorabo" on an own report (P10 states): slot C is the owner's menu ("Zaključi iskanje").
		expect(screen.queryByRole('button', { name: sl.report.more })).toBeNull();
		expect(screen.getByTestId('owner-menu')).toBeTruthy();
		expect((await generateMetadata(props())).robots).toEqual({ index: false });
	});

	it.each(['open', 'closed', 'reunited'] as const)(
		'puts the owner actions in slot A (%s: they decide about reopening)',
		async (status) => {
			show({ ...owner, status });
			await renderPage();
			expect(screen.getByTestId('owner-actions').dataset.status).toBe(status);
		}
	);

	it("puts the owner's reward reminder in place of the public scam warning", async () => {
		await renderPage();

		expect(screen.getByText(/^Nagrada: 50\s€/)).toBeTruthy();
		expect(screen.queryByRole('note')).toBeNull();
		expect(screen.getByText(sl.report.owner_reward_note, { exact: false })).toBeTruthy();
	});
});

describe('P9 gallery with the client copy the page sends', () => {
	it('switches photos with named controls and shows the placeholder for a failed one', () => {
		const { common, consent, errors, nav } = sl;
		const { photo_prev, photo_next, photo_position, photo_thumb, photo_failed } = sl.report;
		render(
			<NextIntlClientProvider
				locale="sl"
				messages={{
					common,
					consent,
					errors,
					nav,
					report: { photo_prev, photo_next, photo_position, photo_thumb, photo_failed },
				}}
			>
				<Gallery photos={lost.photos} />
			</NextIntlClientProvider>
		);

		expect(screen.getByText('1 / 2')).toBeTruthy();
		expect(screen.getByRole('button', { name: 'Pokaži fotografijo 1' }).getAttribute('aria-current')).toBe('true');
		fireEvent.click(screen.getByRole('button', { name: 'Naslednja fotografija' }));
		expect(screen.getByText('2 / 2')).toBeTruthy();
		const second = screen.getByRole('img', { name: 'Pogrešani pes Rex, fotografija 2 od 2' });
		fireEvent.error(second);
		expect(screen.getByRole('img', { name: photo_failed })).toBeTruthy();
		fireEvent.click(screen.getByRole('button', { name: 'Prejšnja fotografija' }));
		expect(screen.getByRole('img', { name: 'Pogrešani pes Rex, fotografija 1 od 2' })).toBeTruthy();
	});
});
