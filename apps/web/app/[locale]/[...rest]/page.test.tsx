import { cleanup, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import en from '@zivali/i18n/dist/en.json';
import sl from '@zivali/i18n/dist/sl.json';

import CatchAll, { generateMetadata } from './page';

const catalogues = { sl, en };

vi.mock('next-intl/server', async () => {
	const { createTranslator } = await import('next-intl');
	return {
		getTranslations: async ({ locale }: { locale: 'sl' | 'en' }) =>
			createTranslator({ locale, messages: catalogues[locale] }),
	};
});
vi.mock('next/navigation', async (original) => ({
	...(await original<object>()),
	notFound: () => {
		throw new Error('NEXT_NOT_FOUND');
	},
}));

const props = (locale: 'sl' | 'en', ...rest: string[]) =>
	({ params: Promise.resolve({ locale, rest }) }) as PageProps<'/[locale]/[...rest]'>;

afterEach(cleanup);

describe('CatchAll', () => {
	it.each([
		['sl', ['map'], 'Zemljevid'],
		['en', ['report', 'lost'], 'Lost pet'],
		['sl', ['accessibility'], 'Dostopnost'],
	] as const)('a pending %s page %j gets a placeholder titled %s, not indexed', async (locale, rest, title) => {
		render(
			<NextIntlClientProvider locale={locale} messages={catalogues[locale]}>
				{await CatchAll(props(locale, ...rest))}
			</NextIntlClientProvider>
		);

		expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(title);
		expect(screen.getByText(catalogues[locale].common.placeholder_body)).toBeTruthy();
		expect(await generateMetadata(props(locale, ...rest))).toEqual({ title, robots: { index: false } });
	});

	it('answers 404 for every other path', async () => {
		await expect(CatchAll(props('sl', 'no', 'such', 'page'))).rejects.toThrow('NEXT_NOT_FOUND');
		await expect(CatchAll(props('sl', 'map', 'x'))).rejects.toThrow('NEXT_NOT_FOUND');
	});
});
