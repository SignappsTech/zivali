import { cleanup, render, screen, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type * as React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import en from '@zivali/i18n/dist/en.json';
import sl from '@zivali/i18n/dist/sl.json';

import AdvertisePage, { generateMetadata } from './page';

const catalogues = { sl, en };

// The Radix checkbox measures itself; jsdom has no ResizeObserver.
globalThis.ResizeObserver ??= class {
	observe() {}
	unobserve() {}
	disconnect() {}
} as unknown as typeof ResizeObserver;

// Server translations from the same catalogues (next-intl/server needs the Next request scope).
vi.mock('next-intl/server', async () => {
	const { createTranslator } = await import('next-intl');
	return {
		getTranslations: async ({ locale, namespace }: { locale: 'sl' | 'en'; namespace: string }) =>
			createTranslator({ locale, messages: catalogues[locale], namespace: namespace as 'partners' }),
		getMessages: async ({ locale }: { locale: 'sl' | 'en' }) => catalogues[locale],
	};
});
// The async Audience is a server component (components/partners/audience-section.test.tsx); this renders the rest.
vi.mock('@/components/partners/audience-section', async (original) => ({
	...(await original<object>()),
	Audience: () => <p>audience</p>,
}));
// In production the page's server components read the request config, not PageMessages' subset (which only the
// islands see); rendered in jsdom they would read the subset, so it passes the full catalogue through here. The
// islands get the real subset (clientMessages) in audience-section.test.tsx and enquiry-form.test.tsx.
vi.mock('@/components/page-messages', () => ({
	PageMessages: ({ children }: { children: React.ReactNode }) => children,
}));

const props = (locale: 'sl' | 'en') => ({ params: Promise.resolve({ locale }) }) as PageProps<'/[locale]/advertise'>;

function show(node: React.ReactNode, locale: 'sl' | 'en' = 'sl') {
	return render(
		<NextIntlClientProvider locale={locale} messages={catalogues[locale]}>
			{node}
		</NextIntlClientProvider>
	);
}

afterEach(cleanup);

describe('P22 /oglasevanje', () => {
	it('shows the pitch, the four slot previews, targeting, Vet Partner, trust rules, steps, the form and the FAQ', async () => {
		const { container } = show(await AdvertisePage(props('sl')));

		expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Oglašujte pri nas');
		expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual([
			'Naše občinstvo',
			'Kje se prikaže vaš oglas',
			'Komu se prikaže',
			'Veterinarski partner',
			'Pravila, ki varujejo zaupanje',
			'Cene in naslednji koraki',
			'Pošljite povpraševanje',
			'Pogosta vprašanja',
		]);
		// Hero and Vet Partner actions jump to the content slice's SL anchors.
		expect(
			screen.getAllByRole('link', { name: 'Pošlji povpraševanje' }).map((link) => link.getAttribute('href'))
		).toEqual(['#povprasevanje', '#povprasevanje']);
		expect(screen.getByRole('link', { name: 'Kako so oglasi videti' }).getAttribute('href')).toBe('#mesta');
		expect(container.querySelector('#povprasevanje form')).toBeTruthy();
		expect(container.querySelector('#veterinarski-partner')).toBeTruthy();

		// Previews, labelled as examples, never ad slots (no ads on this page, P21).
		const previews = screen.getAllByRole('figure');
		expect(previews.map((figure) => figure.getAttribute('aria-label'))).toEqual([
			'Primer oglasa na mestu Seznam prijav',
			'Primer oglasa na mestu Stran prijave',
			'Primer oglasa na mestu Zaslon Spet doma',
			'Primer oglasa na mestu Stranska vrstica',
		]);
		expect(within(previews[1]!).getByText(/Veterinar v vaši regiji/).textContent).toBe(
			'Oglas · Veterinar v vaši regiji'
		);
		for (const figure of previews) expect(within(figure).getByText(/^Oglas/)).toBeTruthy();
		expect(container.querySelector('[data-ad-slot]')).toBeNull();
		expect(container.querySelectorAll('figure a')).toHaveLength(0);

		// Prices on request only: no figure in euros anywhere, and no media kit until the PDF exists.
		expect(container.textContent).not.toMatch(/€|EUR/);
		expect(screen.queryByText(/predstavitev \(PDF\)/)).toBeNull();
		expect(container.querySelectorAll('details h3')).toHaveLength(6);
	});

	it('marks the page up as WebPage, BreadcrumbList and FAQPage with the six questions', async () => {
		show(await AdvertisePage(props('en')), 'en');
		const graph = JSON.parse(document.querySelector('script[type="application/ld+json"]')!.textContent!)['@graph'];

		expect(graph.map((node: { '@type': string }) => node['@type'])).toEqual([
			'WebPage',
			'BreadcrumbList',
			'FAQPage',
		]);
		expect(graph[0].url).toBe('https://najdimo.si/en/advertise');
		expect(graph[1].itemListElement[1]).toMatchObject({ name: 'Advertise with us' });
		expect(graph[2].mainEntity).toHaveLength(6);
		expect(graph[2].mainEntity[0]).toEqual({
			'@type': 'Question',
			name: 'Who sees my ad?',
			acceptedAnswer: {
				'@type': 'Answer',
				text: 'People who look at reports on Najdimo in the regions and for the animals you choose.',
			},
		});
		expect(screen.getAllByRole('link', { name: 'Send an enquiry' })[0]!.getAttribute('href')).toBe('#enquiry');
		expect(screen.getByRole('link', { name: 'How placements look' }).getAttribute('href')).toBe('#placements');
	});

	it('is indexable with the SEO title, description, canonical and the Open Graph card', async () => {
		const metadata = await generateMetadata(props('sl'));

		expect(metadata).toMatchObject({
			title: { absolute: 'Oglašujte lastnikom psov in mačk · Najdimo' },
			description: sl.partners.seo_description,
			alternates: { canonical: 'https://najdimo.si/oglasevanje' },
			openGraph: {
				url: 'https://najdimo.si/oglasevanje',
				images: [{ url: '/og/sl-partners.png', width: 1200, height: 630, alt: 'Oglašujte pri Najdimo' }],
			},
		});
		expect(metadata.robots).toBeUndefined();
	});
});
