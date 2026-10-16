import { cleanup, render, screen } from '@testing-library/react';
import { NextIntlClientProvider, useMessages } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import en from '@zivali/i18n/dist/en.json';
import sl from '@zivali/i18n/dist/sl.json';

import ReportLostPage, { generateMetadata } from './page';

const catalogues = { sl, en };

// Server translations from the same catalogues (next-intl/server needs the Next request scope).
vi.mock('next-intl/server', async () => {
	const { createTranslator } = await import('next-intl');
	return {
		getTranslations: async ({ locale, namespace }: { locale: 'sl' | 'en'; namespace: string }) =>
			createTranslator({ locale, messages: catalogues[locale], namespace: namespace as 'report_lost' }),
		getMessages: async ({ locale }: { locale: 'sl' | 'en' }) => catalogues[locale],
	};
});
const viewer = vi.hoisted(() => ({ current: null as null | { initials: string; aal2: boolean } }));
vi.mock('@/lib/viewer', () => ({ getViewer: async () => viewer.current }));
// The flow has its own tests: here it shows what the page hands it.
vi.mock('@/components/report-lost/lost-flow', () => ({
	LostFlow: ({ initialPet, signedIn }: { initialPet?: string; signedIn: boolean }) => (
		<p data-testid="flow" data-pet={initialPet} data-signed-in={signedIn}>
			{Object.keys(useMessages()).sort().join(' ')}
		</p>
	),
}));

const props = (locale: 'sl' | 'en', query: Record<string, string> = {}) =>
	({
		params: Promise.resolve({ locale }),
		searchParams: Promise.resolve(query),
	}) as PageProps<'/[locale]/report/lost'>;

async function show(locale: 'sl' | 'en', query?: Record<string, string>) {
	const page = await ReportLostPage(props(locale, query));
	const { common, consent, errors, nav } = catalogues[locale];
	render(
		<NextIntlClientProvider locale={locale} messages={{ common, consent, errors, nav }}>
			{page}
		</NextIntlClientProvider>
	);
}

afterEach(() => {
	cleanup();
	viewer.current = null;
});

describe('ReportLostPage', () => {
	it('is public and indexable with the slice title, description and canonical', async () => {
		expect(await generateMetadata(props('sl'))).toEqual({
			title: { absolute: sl.report_lost.seo_title },
			description: sl.report_lost.seo_description,
			alternates: { canonical: 'https://najdimo.si/prijava/izgubljena-zival' },
		});
		expect((await generateMetadata(props('en'))).alternates).toEqual({
			canonical: 'https://najdimo.si/en/report/lost',
		});
	});

	it('gives a signed-out visitor the flow to fill first, with the sign-in dialog and confirmation copy (C3)', async () => {
		await show('sl');
		const flow = screen.getByTestId('flow');
		expect(flow.dataset.signedIn).toBe('false');
		expect(flow.textContent!.split(' ')).toEqual(
			expect.arrayContaining(['report_lost', 'photos', 'location', 'auth', 'shelter_row', 'share', 'support'])
		);
		expect(document.querySelector('[data-ad-slot]')).toBeNull();
		const ld = JSON.parse(document.querySelector('script[type="application/ld+json"]')!.textContent!);
		expect(ld['@graph'].map((node: { '@type': string }) => node['@type'])).toEqual(['WebPage', 'BreadcrumbList']);
	});

	it('gives a signed-in owner the flow with its namespaces and the pet from ?pet=', async () => {
		viewer.current = { initials: 'AN', aal2: false };
		await show('en', { pet: 'pet-1' });
		const flow = screen.getByTestId('flow');
		expect(flow.dataset.pet).toBe('pet-1');
		expect(flow.dataset.signedIn).toBe('true');
		expect(flow.textContent!.split(' ')).toEqual(
			expect.arrayContaining([
				'report_lost',
				'pets',
				'attributes',
				'breeds',
				'photos',
				'location',
				'map',
				'errors',
			])
		);
		expect(document.querySelector('[data-ad-slot]')).toBeNull();
	});
});
