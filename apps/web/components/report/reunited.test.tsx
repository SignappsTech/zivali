import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ownerReport } from '@zivali/api/__fixtures__/reports';
import en from '@zivali/i18n/dist/en.json';
import sl from '@zivali/i18n/dist/sl.json';
import type { DetailReport } from '@/components/report/slots/types';

import { Reunited } from './reunited';

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('sonner', async (actual) => ({ ...(await actual()), toast }));

const rex: DetailReport = {
	...ownerReport,
	short_code: 'Rex12345',
	type: 'lost',
	name: 'Rex',
	status: 'reunited',
	manager_role: 'owner',
	reunited_at: new Date().toISOString(),
};

function show(report: DetailReport, { anonymous = false, locale = 'sl' as 'sl' | 'en' } = {}) {
	render(
		<NextIntlClientProvider locale={locale} messages={{ sl, en }[locale]}>
			<Reunited report={report} anonymous={anonymous} />
		</NextIntlClientProvider>
	);
}

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
	Object.assign(navigator, { share: undefined });
});

describe('Reunited page (P14)', () => {
	it('celebrates calmly: the photo, the focused h1 with the name, one sentence and the next steps', async () => {
		show(rex);

		const heading = screen.getByRole('heading', { level: 1, name: 'Rex je spet doma' });
		await waitFor(() => expect(document.activeElement).toBe(heading));
		expect(screen.getByRole('img', { name: 'Rex' })).toBeTruthy();
		expect(screen.getByText(sl.lifecycle.home_body)).toBeTruthy();
		expect(screen.getByRole('link', { name: 'Končano' }).getAttribute('href')).toBe('/zemljevid');
		expect(screen.getByRole('button', { name: 'Delite veselo novico' })).toBeTruthy();
	});

	it('asks for the story consent with a switch that is off, explained, and saved nowhere yet', () => {
		show(rex);

		const story = screen.getByRole('switch', { name: 'Delite svojo zgodbo' });
		expect(story.getAttribute('aria-checked')).toBe('false');
		expect(document.getElementById(story.getAttribute('aria-describedby')!)?.textContent).toBe(
			sl.lifecycle.story_help
		);
		// Local only (no API field yet): no "saved" toast and no promise to withdraw it in the profile.
		expect(document.body.textContent).not.toMatch(/profil/i);
		fireEvent.click(screen.getByText('Delite svojo zgodbo'));
		expect(story.getAttribute('aria-checked')).toBe('true');
		expect(toast.success).not.toHaveBeenCalled();
	});

	it('shares the good news with the report link, or copies it where the browser cannot share', async () => {
		const share = vi.fn(async () => {});
		Object.assign(navigator, { share });
		show(rex);
		fireEvent.click(screen.getByRole('button', { name: 'Delite veselo novico' }));
		expect(share).toHaveBeenCalledWith({
			text: 'Rex je spet doma. Hvala vsem, ki ste delili in pomagali.',
			url: `${window.location.origin}/r/Rex12345`,
		});

		cleanup();
		Object.assign(navigator, { share: undefined });
		const writeText = vi.fn(async () => {});
		Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
		show(rex, { locale: 'en' });
		fireEvent.click(screen.getByRole('button', { name: 'Share the good news' }));
		await waitFor(() => expect(toast.success).toHaveBeenCalledWith(en.share.copied));
		expect(writeText).toHaveBeenCalledWith(
			`Rex is home again. Thank you to everyone who shared and helped. ${window.location.origin}/en/r/Rex12345`
		);
	});

	it('a finder gets the short thank-you, with no consent, tip or ad, and the account offer when anonymous', async () => {
		show({ ...rex, type: 'found', name: undefined, manager_role: 'finder' }, { anonymous: true });

		const heading = screen.getByRole('heading', { level: 1, name: sl.lifecycle.finder_thanks_title });
		await waitFor(() => expect(document.activeElement).toBe(heading));
		expect(screen.getByText(sl.browse.status_reunited)).toBeTruthy();
		expect(screen.queryByRole('switch')).toBeNull();
		expect(screen.getByRole('link', { name: sl.lifecycle.finder_thanks_account }).getAttribute('href')).toBe(
			'/registracija?convert=1'
		);

		cleanup();
		show({ ...rex, manager_role: 'finder' });
		expect(screen.queryByRole('link')).toBeNull();
	});
});
