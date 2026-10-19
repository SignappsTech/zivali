import { cleanup, render, screen, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import en from '@zivali/i18n/dist/en.json';
import sl from '@zivali/i18n/dist/sl.json';

import HomePage, { generateMetadata } from './page';

const catalogues = { sl, en };

vi.mock('next-intl/server', async () => {
	const { createTranslator } = await import('next-intl');
	return {
		getTranslations: async ({ locale, namespace }: { locale: 'sl' | 'en'; namespace: 'pages.home' }) =>
			createTranslator({ locale, messages: catalogues[locale], namespace }),
	};
});

// The API-backed blocks are async server components with their own tests (components/home/blocks.test.tsx).
vi.mock('@/components/home/blocks', () => ({
	RecentReports: ({ locale }: { locale: string }) => <p data-testid="recent">{locale}</p>,
	RecentReportsSkeleton: () => null,
	LiveNumbers: ({ locale }: { locale: string }) => <p data-testid="numbers">{locale}</p>,
}));

afterEach(cleanup);

describe('HomePage (P3 T1, layout B)', () => {
	it.each([
		[
			'sl',
			'',
			{
				lost: '/prijava/izgubljena-zival',
				found: '/prijava/najdena-zival',
				map: '/zemljevid',
				how: '/kako-deluje',
				safety: '/varnost',
				shelters: '/za-zavetisca',
			},
		],
		[
			'en',
			'/en',
			{
				lost: '/en/report/lost',
				found: '/en/report/found',
				map: '/en/map',
				how: '/en/how-it-works',
				safety: '/en/safety',
				shelters: '/en/for-shelters',
			},
		],
	] as const)('renders the layout B sections in %s with the slice copy and its links', (locale, root, to) => {
		const messages = catalogues[locale];
		const home = messages.pages.home;
		const nav = messages.nav;
		const { container } = render(
			<NextIntlClientProvider locale={locale} messages={messages}>
				<HomePage />
			</NextIntlClientProvider>
		);

		expect(screen.getAllByRole('heading', { level: 1 }).map((h) => h.textContent)).toEqual([home.hero_title]);
		expect(screen.getByText(home.hero_lede)).toBeTruthy();
		// Order: hero with the chooser, recent reports, (numbers), how it works, safe by design, shelters; no closing band.
		expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual([
			nav.report_menu_title,
			home.near_title_no_location,
			home.how_title,
			home.safe_title,
			home.shelters_title,
		]);
		expect(screen.queryByText(home.cta_title)).toBeNull();
		expect(screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual([
			home.how_1_title,
			home.how_2_title,
			home.how_3_title,
		]);
		for (const key of ['safe_1', 'safe_2', 'safe_3', 'shelters_body'] as const)
			expect(screen.getByText(home[key])).toBeTruthy();
		// The cards sit right under the hero, the numbers right under the cards.
		const recent = screen.getByRole('region', { name: home.near_title_no_location });
		expect(within(recent).getByTestId('recent').textContent).toBe(locale);
		expect(recent.nextElementSibling).toBe(screen.getByTestId('numbers'));

		const href = (name: string, scope: HTMLElement = container) =>
			within(scope)
				.getAllByRole('link', { name })
				.map((link) => link.getAttribute('href'));
		const hero = screen.getByRole('region', { name: home.hero_title });
		// The chooser: the header menu's lost and found rows (title, then description), 64 px targets.
		const rows = within(hero).getAllByRole('listitem');
		expect(rows.map((row) => within(row).getByRole('link').getAttribute('href'))).toEqual([to.lost, to.found]);
		expect(rows.map((row) => row.textContent)).toEqual([
			nav.report_lost_title + nav.report_lost_desc,
			nav.report_found_title + nav.report_found_desc,
		]);
		for (const row of rows) expect(within(row).getByRole('link').className).toContain('min-h-16');
		// Sighted is not a third row but the quiet link: plain prompt, the header menu's words, the found flow.
		expect(hero.textContent).toContain(home.hero_sighted_prompt);
		expect(href(nav.report_sighted_title, hero)).toEqual([to.found]);
		// "Open the map" on the heading row from lg; below it the teaser (in RecentReports) leads to the map.
		const openMap = within(screen.getByRole('region', { name: home.near_title_no_location })).getByRole('link', {
			name: home.near_open_map,
		});
		expect([openMap.getAttribute('href'), openMap.className]).toEqual([
			to.map,
			expect.stringMatching(/\bhidden lg:inline-flex\b/),
		]);
		expect(href(home.how_more)).toEqual([to.how]);
		expect(href(home.safe_action)).toEqual([to.safety]);
		expect(href(home.shelters_action)).toEqual([to.shelters]);

		// The hero photo is decoration behind the scrim and the LCP element; the how-it-works cat is lazy.
		expect(
			[...container.querySelectorAll('img')].map((img) => [
				img.alt,
				img.getAttribute('loading'),
				img.getAttribute('fetchpriority'),
			])
		).toEqual([
			['', 'eager', 'high'],
			[home.hero_cat_alt, 'lazy', null],
		]);
		// From lg the footer's 96 px margin is the only gap after the shelters block, not 96 + 96 (TASK-115.11).
		const main = container.querySelector('main')!.className.split(' ');
		expect(main).toContain('lg:pb-0');
		expect(main).not.toContain('lg:pb-24');
		// No primary button (the chooser rows are the actions), no ad slot or sidebar on T1.
		expect(container.querySelectorAll('[data-variant="default"]')).toHaveLength(0);
		expect(screen.queryByRole('complementary')).toBeNull();

		const [organization, website] = JSON.parse(
			container.querySelector('script[type="application/ld+json"]')!.textContent!
		)['@graph'];
		expect(organization).toMatchObject({
			'@type': 'Organization',
			name: 'Najdimo',
			url: `https://najdimo.si${root || '/'}`,
			logo: 'https://najdimo.si/apple-icon.png',
			areaServed: 'SI',
			parentOrganization: { name: 'Signapps' },
		});
		expect(website).toEqual({ '@type': 'WebSite', name: 'Najdimo', url: organization.url, inLanguage: locale });
	});

	it.each([
		['sl', 'https://najdimo.si/'],
		['en', 'https://najdimo.si/en'],
	] as const)(
		'metadata in %s: slice title and description, canonical, the Open Graph card',
		async (locale, canonical) => {
			const home = catalogues[locale].pages.home;
			const meta = await generateMetadata({ params: Promise.resolve({ locale }) } as PageProps<'/[locale]'>);

			expect(meta.title).toEqual({ absolute: home.seo_title });
			expect(meta.description).toBe(home.seo_description);
			expect(meta.alternates?.canonical).toBe(canonical);
			expect(meta.openGraph).toMatchObject({
				url: canonical,
				title: home.seo_title,
				images: [
					{ url: `/og/${locale}-home.png`, width: 1200, height: 630, alt: `Najdimo – ${home.hero_title}` },
				],
			});
		}
	);
});
