import { cleanup, render, screen } from '@testing-library/react';
import { NextIntlClientProvider, useMessages } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import en from '@zivali/i18n/dist/en.json';
import sl from '@zivali/i18n/dist/sl.json';

import MapPage, { generateMetadata } from './page';

const catalogues = { sl, en };

// Server translations from the same catalogues (next-intl/server needs the Next request scope).
vi.mock('next-intl/server', async () => {
	const { createTranslator } = await import('next-intl');
	return {
		getTranslations: async ({ locale, namespace }: { locale: 'sl' | 'en'; namespace: string }) =>
			createTranslator({ locale, messages: catalogues[locale], namespace: namespace as 'browse' }),
		getMessages: async ({ locale }: { locale: 'sl' | 'en' }) => catalogues[locale],
	};
});
// The island itself is covered in components/browse; here it shows which namespaces reach the client.
vi.mock('@/components/browse/browse', () => ({
	Browse: () => <p data-testid="namespaces">{Object.keys(useMessages()).sort().join(',')}</p>,
}));
vi.mock('@/lib/store', () => ({
	getStore: () => ({ getState: () => ({}), subscribe: () => () => {}, dispatch: () => {} }),
}));

const props = (locale: 'sl' | 'en') => ({ params: Promise.resolve({ locale }) }) as PageProps<'/[locale]/map'>;

afterEach(cleanup);

describe('/zemljevid', () => {
	it.each([
		['sl', 'Zemljevid izgubljenih in najdenih živali · Najdimo', 'https://najdimo.si/zemljevid'],
		['en', 'Map of lost and found pets · Najdimo', 'https://najdimo.si/en/map'],
	] as const)(
		'%s: title, description and a canonical without the filters (content slice §7)',
		async (locale, title, url) => {
			expect(await generateMetadata(props(locale))).toEqual({
				title: { absolute: title },
				description: catalogues[locale].browse.seo_description,
				alternates: { canonical: url },
			});
		}
	);

	it('sends the browse, map, ad and colour messages with the island and describes the page in JSON-LD', async () => {
		const { common, consent, errors, nav } = sl;
		render(
			<NextIntlClientProvider locale="sl" messages={{ common, consent, errors, nav }}>
				{await MapPage(props('sl'))}
			</NextIntlClientProvider>
		);
		expect(screen.getByTestId('namespaces').textContent).toBe(
			'ads,attributes,browse,common,consent,errors,map,nav'
		);
		const ld = JSON.parse(document.querySelector('script[type="application/ld+json"]')!.textContent!);
		expect(ld['@graph']).toEqual([
			{ '@type': 'CollectionPage', name: sl.browse.seo_title, url: 'https://najdimo.si/zemljevid' },
			{
				'@type': 'BreadcrumbList',
				itemListElement: [
					{ '@type': 'ListItem', position: 1, name: 'Najdimo', item: 'https://najdimo.si/' },
					{ '@type': 'ListItem', position: 2, name: 'Zemljevid', item: 'https://najdimo.si/zemljevid' },
				],
			},
		]);
	});
});
