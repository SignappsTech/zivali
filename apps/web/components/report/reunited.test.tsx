import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { Provider } from 'react-redux';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ownerReport } from '@zivali/api/__fixtures__/reports';
import { createMockApi } from '@zivali/api/mock';
import { createApiStore } from '@zivali/api/rtk';
import en from '@zivali/i18n/dist/en.json';
import sl from '@zivali/i18n/dist/sl.json';
import type { DetailReport } from '@/components/report/slots/types';

import { Reunited } from './reunited';

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('sonner', async (actual) => ({ ...(await actual()), toast }));
// The ad unit has its own tests (components/ads/ad-slot.test.tsx); here: that the owner's page holds the one slot.
vi.mock('@/components/ads/ad-slot', () => ({
	AdSlot: (props: { slot: string; region?: string; species?: string }) => (
		<div data-testid={`ad-${props.slot}`} data-region={props.region} data-species={props.species} />
	),
}));

const rex: DetailReport = {
	...ownerReport,
	short_code: 'Rex12345',
	type: 'lost',
	name: 'Rex',
	status: 'reunited',
	manager_role: 'owner',
	reunited_at: new Date().toISOString(),
};

// The tip's radios measure their hidden inputs; jsdom has no ResizeObserver.
globalThis.ResizeObserver ??= class {
	observe() {}
	unobserve() {}
	disconnect() {}
} as unknown as typeof ResizeObserver;

function show(report: DetailReport, { anonymous = false, locale = 'sl' as 'sl' | 'en', testMode = false } = {}) {
	render(
		<NextIntlClientProvider locale={locale} messages={{ sl, en }[locale]}>
			<Provider store={createApiStore(createMockApi({ 'GET /v1/config/public': {} }))}>
				<Reunited report={report} anonymous={anonymous} testMode={testMode} />
			</Provider>
		</NextIntlClientProvider>
	);
}

afterEach(() => {
	cleanup();
	sessionStorage.clear();
	vi.clearAllMocks();
	Object.assign(navigator, { share: undefined });
});

describe('Reunited page (P14)', () => {
	it('celebrates calmly: the photo, the focused h1 with the name, one sentence and the next steps', async () => {
		// The tip is answered (paid), so the ad shows; while it asks the ad waits (below).
		sessionStorage.setItem('zz_support:tip:Rex12345', 'paid');
		show(rex);

		const heading = screen.getByRole('heading', { level: 1, name: 'Rex je spet doma' });
		await waitFor(() => expect(document.activeElement).toBe(heading));
		expect(screen.getByRole('img', { name: 'Rex' })).toBeTruthy();
		expect(screen.getByText(sl.lifecycle.home_body)).toBeTruthy();
		expect(screen.getByRole('link', { name: 'Končano' }).getAttribute('href')).toBe('/zemljevid');
		expect(screen.getByRole('button', { name: 'Delite veselo novico' })).toBeTruthy();
		// One ad (P21 reunited), before "Končano", targeted by the report's region and species.
		const ad = screen.getByTestId('ad-reunited');
		expect([ad.dataset.region, ad.dataset.species]).toEqual(['osrednjeslovenska', 'dog']);
		const done = screen.getByRole('link', { name: 'Končano' });
		expect(ad.compareDocumentPosition(done) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
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

	it('asks for the P15 tip between the story switch and Končano; a manage-link session gets none', async () => {
		show(rex, { testMode: true });
		const tip = screen.getByRole('heading', { level: 2, name: sl.support.tip_title });
		const story = screen.getByRole('switch');
		const done = screen.getByRole('link', { name: 'Končano' });
		expect(story.compareDocumentPosition(tip) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
		expect(tip.compareDocumentPosition(done) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
		expect(await screen.findByRole('button', { name: sl.support.skip })).toBeTruthy();
		expect(screen.getByText(sl.support.test_note)).toBeTruthy();

		cleanup();
		show(rex, { anonymous: true });
		expect(screen.queryByRole('heading', { name: sl.support.tip_title })).toBeNull();
	});

	it('hides the ad while the tip asks; skipped or paid, or with no tip (manage link), the ad shows (P21)', async () => {
		show(rex);
		expect(screen.queryByTestId('ad-reunited')).toBeNull();

		fireEvent.click(await screen.findByRole('button', { name: sl.support.skip }));
		// Preskoči: focus goes to "Končano" before the ask is removed.
		expect(document.activeElement).toBe(screen.getByRole('link', { name: 'Končano' }));
		expect(screen.getByTestId('ad-reunited')).toBeTruthy();

		cleanup();
		sessionStorage.clear();
		sessionStorage.setItem('zz_support:tip:Rex12345', 'paid');
		show(rex);
		expect(screen.getByTestId('ad-reunited')).toBeTruthy();

		cleanup();
		sessionStorage.clear();
		show(rex, { anonymous: true });
		expect(screen.getByTestId('ad-reunited')).toBeTruthy();
	});

	it('a finder gets the short thank-you, with no consent, tip or ad, and the account offer when anonymous', async () => {
		show({ ...rex, type: 'found', name: undefined, manager_role: 'finder' }, { anonymous: true });

		const heading = screen.getByRole('heading', { level: 1, name: sl.lifecycle.finder_thanks_title });
		await waitFor(() => expect(document.activeElement).toBe(heading));
		expect(screen.getByText(sl.browse.status_reunited)).toBeTruthy();
		expect(screen.queryByRole('switch')).toBeNull();
		expect(screen.queryByRole('heading', { name: sl.support.tip_title })).toBeNull();
		expect(screen.getByRole('link', { name: sl.lifecycle.finder_thanks_account }).getAttribute('href')).toBe(
			'/registracija'
		);

		cleanup();
		show({ ...rex, manager_role: 'finder' });
		expect(screen.queryByRole('link')).toBeNull();
		expect(screen.queryByTestId(/^ad-/)).toBeNull();
	});
});
