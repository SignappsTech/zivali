import { cleanup, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { Provider } from 'react-redux';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@zivali/api/client';
import { municipalityList, shelterList, shelterPage } from '@zivali/api/__fixtures__/directory';
import { createMockApi } from '@zivali/api/mock';
import { createApiStore } from '@zivali/api/rtk';
import en from '@zivali/i18n/dist/en.json';
import sl from '@zivali/i18n/dist/sl.json';

import ShelterPage, { generateMetadata as shelterMetadata } from './[slug]/page';
import SheltersPage, { generateMetadata as sheltersMetadata } from './page';

const catalogues = { sl, en };

// Server translations from the same catalogues (next-intl/server needs the Next request scope).
vi.mock('next-intl/server', async () => {
	const { createTranslator } = await import('next-intl');
	return {
		getTranslations: async ({ locale, namespace }: { locale: 'sl' | 'en'; namespace: string }) =>
			createTranslator({ locale, messages: catalogues[locale], namespace: namespace as 'shelters' }),
	};
});

const directory = vi.hoisted(() => ({ getShelters: vi.fn(), getMunicipalities: vi.fn(), getShelter: vi.fn() }));
vi.mock('@/lib/directory', async (original) => ({ ...(await original<object>()), ...directory }));
vi.mock('next/navigation', async (original) => ({
	...(await original<object>()),
	notFound: () => {
		throw new Error('NEXT_NOT_FOUND');
	},
}));

const sheltersParams = (locale: 'sl' | 'en') =>
	({ params: Promise.resolve({ locale }) }) as PageProps<'/[locale]/shelters'>;
const shelterParams = (locale: 'sl' | 'en', slug = 'zavetisce-ljubljana') =>
	({ params: Promise.resolve({ locale, slug }) }) as PageProps<'/[locale]/shelters/[slug]'>;

async function renderPage(node: Promise<React.ReactNode>, locale: 'sl' | 'en' = 'sl') {
	const page = await node;
	render(
		<NextIntlClientProvider locale={locale} messages={catalogues[locale]}>
			<Provider store={createApiStore(createMockApi({}, { locale }))}>{page}</Provider>
		</NextIntlClientProvider>
	);
}

const jsonLdOf = () => JSON.parse(document.querySelector('script[type="application/ld+json"]')!.textContent!);

beforeEach(() => {
	directory.getShelters.mockResolvedValue(shelterList);
	directory.getMunicipalities.mockResolvedValue(municipalityList);
	directory.getShelter.mockResolvedValue({ ...shelterPage, verified_at: new Date().toISOString().slice(0, 10) });
});
afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

describe('T5 /zavetisca', () => {
	it('lists the shelters with their municipality count and a tel: link', async () => {
		await renderPage(SheltersPage(sheltersParams('sl')));

		expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(sl.shelters.h1);
		expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('Vsa zavetišča (1)');
		expect(screen.getByText('Ljubljana · 1 občina')).toBeTruthy();
		expect(screen.getByRole('link', { name: /01 234 56 78/ }).getAttribute('href')).toBe('tel:+38612345678');
		expect(screen.getByRole('combobox', { name: sl.shelters.search_label })).toBeTruthy();
		expect(jsonLdOf()['@graph'][0].mainEntity.itemListElement[0].item).toEqual({
			'@type': 'AnimalShelter',
			name: 'Zavetišče Ljubljana',
			url: 'https://najdimo.si/zavetisca/zavetisce-ljubljana',
			telephone: '+38612345678',
		});
	});

	it('has a unique title, a description with the count and a canonical on the app URL', async () => {
		expect(await sheltersMetadata(sheltersParams('en'))).toEqual({
			title: { absolute: 'Animal shelters by municipality · Najdimo' },
			description:
				'Find the shelter responsible for your municipality: phone, address and opening hours of all 1 dog and cat shelters in Slovenia.',
			alternates: { canonical: 'https://najdimo.si/en/shelters' },
		});
	});

	it('shows the inline error and is not indexed when the directory API fails', async () => {
		directory.getShelters.mockRejectedValue(new ApiError('NETWORK', 'down'));
		await renderPage(SheltersPage(sheltersParams('sl')));

		expect(screen.getByRole('alert').textContent).toContain(sl.shelters.error);
		expect(screen.getByRole('link', { name: sl.common.try_again }).getAttribute('href')).toBe('/zavetisca');
		expect(screen.queryByRole('combobox')).toBeNull();
		expect((await sheltersMetadata(sheltersParams('sl'))).robots).toEqual({ index: false });
	});
});

describe('T6 /zavetisca/[slug]', () => {
	it('shows contact, hours, municipalities, what to do and the verified line', async () => {
		await renderPage(ShelterPage(shelterParams('sl')));

		expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Zavetišče Ljubljana');
		expect(screen.getByText('Pristojno za 1 občino')).toBeTruthy();
		const call = screen.getByRole('link', { name: 'Pokliči Zavetišče Ljubljana' });
		expect(call.getAttribute('href')).toBe('tel:+38612345678');
		expect(call.dataset.variant).toBe('default');
		expect(screen.getByText('ponedeljek–nedelja').nextElementSibling?.textContent).toBe('10.00–18.00');
		// jsdom's name computation trims the sr-only span; browsers keep its leading space.
		const map = screen.getByRole('link', { name: /^Odpri v zemljevidu ?\(odpre se v novem zavihku\)$/ });
		expect(map.getAttribute('href')).toBe(
			'https://www.openstreetmap.org/search?query=Cesta%201%2C%201000%20Ljubljana'
		);
		expect(screen.getByRole('heading', { name: 'Občine, za katere je pristojno (1)' })).toBeTruthy();
		expect(screen.getByRole('link', { name: sl.shelters.what_lost_button }).getAttribute('href')).toBe(
			'/prijava/izgubljena-zival'
		);
		expect(screen.getByRole('link', { name: sl.shelters.what_found_button }).getAttribute('href')).toBe(
			'/prijava/najdena-zival'
		);
		expect(screen.getByText(/^Podatki preverjeni \d+\. \d+\. \d{4}\. Vir: UVHVVR 2026-09\.$/)).toBeTruthy();
		expect(screen.queryByText(/Pred obiskom pokličite/)).toBeNull();
	});

	it('emits AnimalShelter and BreadcrumbList JSON-LD', async () => {
		await renderPage(ShelterPage(shelterParams('en')), 'en');

		const [shelter, breadcrumb] = jsonLdOf()['@graph'];
		expect(shelter).toMatchObject({
			'@type': 'AnimalShelter',
			name: 'Zavetišče Ljubljana',
			url: 'https://najdimo.si/en/shelters/zavetisce-ljubljana',
			telephone: '+38612345678',
			address: {
				'@type': 'PostalAddress',
				postalCode: '1000',
				addressLocality: 'Ljubljana',
				addressCountry: 'SI',
			},
			areaServed: ['Ljubljana'],
		});
		expect(shelter.openingHoursSpecification[0].dayOfWeek).toHaveLength(7);
		expect(breadcrumb.itemListElement.map((item: { name: string }) => item.name)).toEqual([
			'Najdimo',
			'Shelters',
			'Zavetišče Ljubljana',
		]);
	});

	it('warns about stale data and keeps it visible', async () => {
		directory.getShelter.mockResolvedValue({ ...shelterPage, verified_at: '2025-08-03' });
		await renderPage(ShelterPage(shelterParams('sl')));

		expect(
			screen.getByText('Podatki so bili nazadnje preverjeni 3. 8. 2025. Pred obiskom pokličite.')
		).toBeTruthy();
		expect(screen.getByRole('link', { name: 'Pokliči Zavetišče Ljubljana' })).toBeTruthy();
	});

	it('without a phone offers the website as a secondary button and no call', async () => {
		directory.getShelter.mockResolvedValue({
			...shelterPage,
			phone: '',
			phone_display: '',
			website: 'https://example.si/',
			opening_hours: [],
		});
		await renderPage(ShelterPage(shelterParams('sl')));

		expect(screen.getByText(sl.shelters.no_phone)).toBeTruthy();
		const website = screen.getByRole('link', { name: /Spletna stran zavetišča/ });
		expect(website.dataset.variant).toBe('secondary');
		expect(screen.queryAllByRole('link').some((link) => link.getAttribute('href')?.startsWith('tel:'))).toBe(false);
		expect(screen.getByText(sl.shelters.hours_none)).toBeTruthy();
	});

	it('has a unique title and description, shortened to 60 characters', async () => {
		expect(await shelterMetadata(shelterParams('sl'))).toEqual({
			title: { absolute: 'Zavetišče Ljubljana – zavetišče za živali · Najdimo' },
			description: 'Zavetišče Ljubljana, Ljubljana: telefon, naslov in delovni čas. Pristojno za 1 občino.',
			alternates: { canonical: 'https://najdimo.si/zavetisca/zavetisce-ljubljana' },
		});
		directory.getShelter.mockResolvedValue({ ...shelterPage, name: 'Obalno zavetišče za zapuščene živali' });
		expect((await shelterMetadata(shelterParams('sl'))).title).toEqual({
			absolute: 'Obalno zavetišče za zapuščene živali – zavetišče za živali',
		});
	});

	it('answers 404 for an unknown slug', async () => {
		directory.getShelter.mockResolvedValue(null);
		await expect(ShelterPage(shelterParams('sl', 'no-such'))).rejects.toThrow('NEXT_NOT_FOUND');
	});
});
