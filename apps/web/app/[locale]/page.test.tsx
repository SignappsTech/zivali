import { cleanup, render, screen } from '@testing-library/react';
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

afterEach(cleanup);

describe('HomePage (P3 T1)', () => {
	it.each([
		[
			'sl',
			'',
			['/prijava/izgubljena-zival', '/prijava/najdena-zival', '/kako-deluje', '/varnost', '/za-zavetisca'],
		],
		['en', '/en', ['/en/report/lost', '/en/report/found', '/en/how-it-works', '/en/safety', '/en/for-shelters']],
	] as const)('renders the sections in %s with the slice copy and its links', (locale, root, hrefs) => {
		const home = catalogues[locale].pages.home;
		const { container } = render(
			<NextIntlClientProvider locale={locale} messages={catalogues[locale]}>
				<HomePage />
			</NextIntlClientProvider>
		);

		expect(screen.getAllByRole('heading', { level: 1 }).map((h) => h.textContent)).toEqual([home.hero_title]);
		expect(screen.getByText(home.hero_lede)).toBeTruthy();
		expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual([
			home.how_title,
			home.safe_title,
			home.shelters_title,
		]);
		expect(screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual([
			home.how_1_title,
			home.how_2_title,
			home.how_3_title,
		]);
		for (const key of ['safe_1', 'safe_2', 'safe_3', 'shelters_body'] as const)
			expect(screen.getByText(home[key])).toBeTruthy();
		expect(screen.getAllByRole('img').map((img) => img.getAttribute('alt'))).toEqual([home.hero_alt, home.how_alt]);
		expect(screen.getByRole('img', { name: home.hero_alt }).getAttribute('loading')).toBe('eager');
		expect(screen.getByRole('img', { name: home.how_alt }).getAttribute('loading')).toBe('lazy');
		expect(
			[home.hero_primary, home.hero_secondary, home.how_more, home.safe_action, home.shelters_action].map(
				(name) => screen.getByRole('link', { name }).getAttribute('href')
			)
		).toEqual(hrefs);
		// The page's one primary is the hero's; no ad slot or sidebar on T1.
		expect(container.querySelectorAll('[data-variant="default"]')).toHaveLength(1);
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
