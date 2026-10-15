import { cleanup, render, screen } from '@testing-library/react';
import { NextIntlClientProvider, useLocale, useTranslations } from 'next-intl';
import { afterEach, describe, expect, it } from 'vitest';

import en from '@zivali/i18n/dist/en.json';
import sl from '@zivali/i18n/dist/sl.json';
import { formatCount, formatDate, formatEur, timeZone } from '@zivali/i18n/format';

const at = new Date('2026-10-15T12:30:00Z');

// How pages use the shared catalogues: ICU plurals through next-intl, dates, numbers and EUR through @zivali/i18n/format.
function Page() {
	const t = useTranslations('errors');
	const locale = useLocale();

	return (
		<main>
			<p>{t('RATE_LIMITED', { minutes: 2 })}</p>
			<p>{`${formatDate(at, locale, 'long')}, ${formatDate(at, locale, 'time')}`}</p>
			<p>{formatCount(12_345, locale)}</p>
			<p>{formatEur(500, locale)}</p>
		</main>
	);
}

afterEach(cleanup);

describe('@zivali/i18n on a page', () => {
	it.each([
		['sl', sl, /čez 2 minuti\.$/, '15. oktober 2026, 14:30', '12.345', /^5,00\s€$/],
		['en', en, /in 2 minutes\.$/, '15 October 2026, 14:30', '12,345', /^€5\.00$/],
	] as const)('renders the %s plural and formats', (locale, messages, plural, date, count, eur) => {
		render(
			<NextIntlClientProvider locale={locale} messages={messages} timeZone={timeZone}>
				<Page />
			</NextIntlClientProvider>
		);

		expect(screen.getByText(plural)).toBeTruthy();
		expect(screen.getByText(date)).toBeTruthy();
		expect(screen.getByText(count)).toBeTruthy();
		expect(screen.getByText(eur)).toBeTruthy();
	});
});
