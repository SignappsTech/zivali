import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { partnerStats } from '@zivali/api/__fixtures__/ads';
import en from '@zivali/i18n/dist/en.json';
import sl from '@zivali/i18n/dist/sl.json';
import { PageMessages } from '@/components/page-messages';
import { clientMessages } from '@/lib/partners';

import { Audience } from './audience-section';

const catalogues = { sl, en };

vi.mock('next-intl/server', async () => {
	const { createTranslator } = await import('next-intl');
	return {
		getTranslations: async ({ locale, namespace }: { locale: 'sl' | 'en'; namespace: string }) =>
			createTranslator({ locale, messages: catalogues[locale], namespace: namespace as 'partners' }),
	};
});
const stats = vi.hoisted(() => ({ getPartnerStats: vi.fn() }));
vi.mock('@/lib/partners', async (original) => ({ ...(await original<object>()), ...stats }));

/** The server component awaited, its region switch under the page's PageMessages subset. */
async function show(locale: 'sl' | 'en' = 'sl') {
	const node = await Audience({ locale });
	return render(
		<NextIntlClientProvider locale={locale} messages={catalogues[locale]}>
			<PageMessages messages={{ partners: clientMessages(catalogues[locale].partners) }}>{node}</PageMessages>
		</NextIntlClientProvider>
	);
}
const values = () => screen.getAllByRole('definition').map((dd) => dd.textContent);

beforeEach(() => stats.getPartnerStats.mockResolvedValue(partnerStats));
afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

describe('P22 audience numbers', () => {
	it('shows the totals as text, the pilot note, the date of the figures and the GURS attribution', async () => {
		await show();

		expect(screen.getAllByRole('term').map((dt) => dt.textContent)).toEqual([
			'Registrirani uporabniki',
			'Aktivne prijave',
			'Živali spet doma v zadnjih 90 dneh',
		]);
		expect(values()).toEqual(['1240', '86', '31']);
		expect(screen.getByRole('note').textContent).toBe(sl.partners.pilot_note);
		expect(screen.getByText(/Stanje: 15\. 10\. 2026 08:00\. Številke osvežujemo vsako uro\./)).toBeTruthy();
		expect(screen.getByText(/stanje 15\. 10\. 2026 \(licenca/)).toBeTruthy();
		expect(screen.getByRole('link', { name: 'CC BY 4.0' }).getAttribute('href')).toBe(
			'https://creativecommons.org/licenses/by/4.0/'
		);
	});

	it('switches to a region without a request; "< 5" reads "fewer than 5" and 0 stays 0', async () => {
		await show('en');
		const select = screen.getByRole('combobox', { name: 'Show figures for region' });

		expect(
			within(select)
				.getAllByRole('option')
				.map((option) => option.textContent)
		).toEqual(['All of Slovenia', 'Carinthia', 'Central Slovenia']);
		expect(screen.getByText(/as of 15 October 2026/)).toBeTruthy();
		fireEvent.change(select, { target: { value: 'koroska' } });

		const reports = screen.getAllByRole('definition')[1]!;
		expect(within(reports).getByText('< 5').getAttribute('aria-hidden')).toBe('true');
		expect(within(reports).getByText('fewer than 5').className).toContain('sr-only');
		expect(values()).toEqual(['38', '< 5fewer than 5', '0']);
		fireEvent.change(select, { target: { value: '' } });
		expect(values()).toEqual(['1,240', '86', '31']);
		expect(stats.getPartnerStats).toHaveBeenCalledTimes(1);
	});

	it('hides the pilot note once the pilot is over', async () => {
		stats.getPartnerStats.mockResolvedValue({ ...partnerStats, pilot: false });
		await show();

		expect(screen.queryByText(sl.partners.pilot_note)).toBeNull();
	});

	it('shows the error note when the stats API cannot answer, and no filter', async () => {
		stats.getPartnerStats.mockResolvedValue(null);
		await show();

		expect(screen.getByRole('status').textContent).toBe(sl.partners.stats_error);
		expect(screen.queryByRole('combobox')).toBeNull();
	});
});
