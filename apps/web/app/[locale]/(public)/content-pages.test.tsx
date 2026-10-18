import { cleanup, render, screen, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it } from 'vitest';

import en from '@zivali/i18n/dist/en.json';
import sl from '@zivali/i18n/dist/sl.json';
import type { ArticleContent, Block } from '@/components/content/article';
import { about } from '@/content/pages/about';
import { faq } from '@/content/pages/faq';
import { forShelters } from '@/content/pages/for-shelters';
import { howItWorks } from '@/content/pages/how-it-works';
import { safety } from '@/content/pages/safety';
import { routing } from '@/i18n/routing';

import AboutPage, { generateMetadata as aboutMetadata } from './about/page';
import Faq, { generateMetadata as faqMetadata } from './faq/page';
import ForSheltersPage, { generateMetadata as forSheltersMetadata } from './for-shelters/page';
import HowItWorksPage, { generateMetadata as howItWorksMetadata } from './how-it-works/page';
import SafetyPage, { generateMetadata as safetyMetadata } from './safety/page';

const catalogues = { sl, en };
type Locale = keyof typeof catalogues;

afterEach(cleanup);

const renderIn = (locale: Locale, Page: () => React.ReactNode) =>
	render(
		<NextIntlClientProvider locale={locale} messages={catalogues[locale]}>
			<Page />
		</NextIntlClientProvider>
	);

const graph = (container: HTMLElement) =>
	JSON.parse(container.querySelector('script[type="application/ld+json"]')!.textContent!)['@graph'];

const ARTICLES = [
	{
		Page: HowItWorksPage,
		metadata: howItWorksMetadata,
		content: howItWorks,
		paths: ['/kako-deluje', '/en/how-it-works'],
		schema: 'WebPage',
		toc: true,
	},
	{
		Page: SafetyPage,
		metadata: safetyMetadata,
		content: safety,
		paths: ['/varnost', '/en/safety'],
		schema: 'Article',
		toc: true,
	},
	{
		Page: ForSheltersPage,
		metadata: forSheltersMetadata,
		content: forShelters,
		paths: ['/za-zavetisca', '/en/for-shelters'],
		schema: 'WebPage',
		toc: false,
	},
	{
		Page: AboutPage,
		metadata: aboutMetadata,
		content: about,
		paths: ['/o-nas', '/en/about'],
		schema: 'AboutPage',
		toc: false,
	},
] as const;

const props = (locale: Locale) => ({ params: Promise.resolve({ locale }) }) as never;
const pathnames = Object.keys(routing.pathnames);
const shape = (blocks: Block[]) => blocks.map((block) => (typeof block === 'string' ? 'p' : Object.keys(block)[0]));

describe('T2 article pages', () => {
	for (const { Page, content, paths, schema, toc } of ARTICLES)
		for (const [index, locale] of (['sl', 'en'] as const).entries())
			it(`${paths[index]}: one h1, the slice sections, ${toc ? 'with' : 'without'} "On this page", JSON-LD`, () => {
				const copy: ArticleContent = content[locale];
				const { container } = renderIn(locale, Page);

				expect(screen.getAllByRole('heading', { level: 1 }).map((h) => h.textContent)).toEqual([copy.h1]);
				expect(screen.getByText(copy.lede)).toBeTruthy();
				expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual(
					copy.sections.map((section) => section.title)
				);
				expect(
					screen
						.getByRole('link', {
							name: catalogues[locale].common.breadcrumb_back.replace(
								'{page}',
								catalogues[locale].common.breadcrumb_home
							),
						})
						.getAttribute('href')
				).toBe(locale === 'sl' ? '/' : '/en');
				// Desktop list and the collapsed row below lg; every entry jumps to its h2.
				const tocLinks = container.querySelectorAll('a[href^="#"]');
				expect(tocLinks).toHaveLength(toc ? copy.sections.length * 2 : 0);
				for (const link of tocLinks)
					expect(container.querySelector(link.getAttribute('href')!)?.tagName).toBe('H2');

				const [page, breadcrumb] = graph(container);
				expect(page['@type']).toBe(schema);
				expect(page.url).toBe(`https://najdimo.si${paths[index]}`);
				expect(breadcrumb.itemListElement.map((item: { name: string }) => item.name)).toEqual([
					'Najdimo',
					copy.crumb,
				]);
			});

	it.each(ARTICLES.map((article) => [article.paths[0], article] as const))(
		'%s: SL and EN have the same structure',
		(_, { content }) => {
			const structure = (copy: ArticleContent) => [
				copy.sections.map((section) => shape(section.blocks)),
				copy.actions?.map((action) => [action.href, action.primary]),
			];
			expect(structure(content.en)).toEqual(structure(content.sl));
		}
	);

	it.each(
		ARTICLES.flatMap((article) =>
			(['sl', 'en'] as const).map((locale, index) => [article.paths[index], locale, article] as const)
		)
	)(
		'%s: title and description from the slice, canonical and the Open Graph card',
		async (path, locale, { metadata, content }) => {
			const { seo, h1 } = content[locale];
			const meta = await metadata(props(locale));

			expect(meta.title).toEqual({ absolute: seo.title });
			expect(meta.description).toBe(seo.description);
			expect(meta.alternates?.canonical).toBe(`https://najdimo.si${path}`);
			expect(meta.openGraph?.images).toEqual([
				expect.objectContaining({
					url: expect.stringMatching(new RegExp(`^/og/${locale}-[a-z-]+\\.png$`)),
					alt: `Najdimo – ${h1}`,
				}),
			]);
		}
	);

	it('localises internal links, keeps hashes and mailto, closes with one primary at most', () => {
		const { container } = renderIn('sl', ForSheltersPage);

		expect(screen.getByRole('link', { name: 'Veterinarski partner' }).getAttribute('href')).toBe(
			'/oglasevanje#veterinarski-partner'
		);
		expect(screen.getAllByRole('link', { name: 'podpora@najdimo.si' })[0]!.getAttribute('href')).toBe(
			'mailto:podpora@najdimo.si'
		);
		expect(screen.getByRole('link', { name: 'Pišite nam' }).getAttribute('href')).toBe('mailto:podpora@najdimo.si');
		expect(container.querySelectorAll('[data-variant="default"]')).toHaveLength(1);
		cleanup();

		renderIn('en', AboutPage);
		expect(screen.getByRole('link', { name: 'company information' }).getAttribute('href')).toBe(
			'/en/company-information'
		);
		expect(screen.getByRole('heading', { level: 2, name: 'How we are funded' }).id).toBe('funding');
	});

	it('every internal link in the copy is a C15 route', () => {
		const texts = [
			...ARTICLES.flatMap(({ content }) => [content.sl, content.en]).flatMap((copy) => [
				...copy.sections.flatMap((section) =>
					section.blocks.flatMap((block) =>
						typeof block === 'string' ? [block] : Object.values(block).flat()
					)
				),
				...(copy.actions ?? []).map((action) => `[x](${action.href})`),
			]),
			...[faq.sl, faq.en].flatMap((copy) => [copy.note, ...copy.groups.flatMap((group) => group.items.flat())]),
		];
		const targets = texts.flatMap((text) => [...text.matchAll(/\]\((\/[^)#]*)/g)].map((match) => match[1]));

		expect(targets.length).toBeGreaterThan(10);
		for (const target of targets) expect(pathnames).toContain(target);
	});
});

describe('T3 FAQ', () => {
	it.each([
		['sl', '/pogosta-vprasanja'],
		['en', '/en/faq'],
	] as const)(
		'%s: grouped native disclosure rows with an h3 question, the note and FAQPage JSON-LD',
		async (locale, path) => {
			const copy = faq[locale];
			const { container } = renderIn(locale, Faq);
			const questions = copy.groups.flatMap((group) => group.items);

			expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(copy.h1);
			expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual(
				copy.groups.map((g) => g.title)
			);
			const rows = container.querySelectorAll('details');
			expect(rows).toHaveLength(questions.length);
			expect(questions).toHaveLength(20);
			for (const [index, row] of [...rows].entries()) {
				expect(row.open).toBe(false);
				expect(within(row.querySelector('summary')!).getByRole('heading', { level: 3 }).textContent).toBe(
					questions[index]![0]
				);
			}
			expect(container.querySelector('[role="note"] a')?.getAttribute('href')).toBe('mailto:podpora@najdimo.si');

			const [page, breadcrumb] = graph(container);
			expect(page['@type']).toBe('FAQPage');
			expect(page.mainEntity).toHaveLength(20);
			expect(page.mainEntity[12]).toEqual({
				'@type': 'Question',
				name: questions[12]![0],
				acceptedAnswer: {
					'@type': 'Answer',
					text: expect.stringContaining(
						`<a href="https://najdimo.si${locale === 'sl' ? '/varnost' : '/en/safety'}">`
					),
				},
			});
			expect(breadcrumb['@type']).toBe('BreadcrumbList');

			const meta = await faqMetadata(props(locale));
			expect(meta.title).toEqual({ absolute: copy.seo.title });
			expect(meta.alternates?.canonical).toBe(`https://najdimo.si${path}`);
		}
	);
});
