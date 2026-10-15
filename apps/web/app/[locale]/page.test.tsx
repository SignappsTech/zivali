import { cleanup, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it } from 'vitest';

import en from '@zivali/i18n/dist/en.json';
import sl from '@zivali/i18n/dist/sl.json';

import HomePage from './page';

afterEach(cleanup);

describe('HomePage', () => {
	it.each([
		['sl', sl],
		['en', en],
	] as const)('renders the hero in %s', (locale, messages) => {
		render(
			<NextIntlClientProvider locale={locale} messages={messages}>
				<HomePage />
			</NextIntlClientProvider>
		);

		expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(messages.pages.home.hero_title);
		expect(screen.getByText(messages.pages.home.hero_lede)).toBeTruthy();
	});
});
