import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { getMockEvents, initAnalytics, resetMockEvents, setConsent } from '@zivali/analytics';
import { publicReport } from '@zivali/api/__fixtures__/reports';
import en from '@zivali/i18n/dist/en.json';
import sl from '@zivali/i18n/dist/sl.json';
import type { DetailReport } from '@/components/report/slots';
import { SlotB } from '@/components/report/slots/slot-b';

import { parseShareConfig } from './share-kit';

const thisYear = new Date().getUTCFullYear();
const lost: DetailReport = {
	...publicReport,
	short_code: 'Rex12345',
	type: 'lost',
	status: 'open',
	species: 'dog',
	name: 'Rex',
	event_at: new Date(Date.UTC(thisYear, 9, 12, 16)).toISOString(),
};
const owner: DetailReport = { ...lost, is_mine: true, moderation_state: 'visible' };
const place = { label: 'Šiška, Ljubljana', area: 'Šiška', municipality: 'Ljubljana' };
const LINK = 'https://najdimo.si/r/Rex12345';
const MESSAGE = `Pomagajte najti psa: Rex. Nazadnje viden 12. oktobra, območje Šiška, Ljubljana. Ste ga videli? ${LINK}`;

const writeText = vi.fn<(text: string) => Promise<void>>();
const fetchMock = vi.fn<typeof fetch>();
const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);

/** `where` null: no place (outside Slovenia, failed lookup). */
function show(report: DetailReport, locale: 'sl' | 'en' = 'sl', where: typeof place | null = place) {
	return render(
		<NextIntlClientProvider locale={locale} messages={locale === 'sl' ? sl : en} timeZone="Europe/Ljubljana">
			<SlotB report={report} place={where ?? undefined} />
		</NextIntlClientProvider>
	);
}
// jsdom hides popovers and cannot open them (no popovertarget): the rows are queried as they sit in the closed menu.
const item = (name: string | RegExp) => screen.getByRole('menuitem', { name, hidden: true });
const events = () => getMockEvents().map(({ name, params }) => ({ name, params }));

// jsdom has <dialog> without showModal() and close().
beforeAll(() => {
	HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
		this.setAttribute('open', '');
	};
	HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
		this.removeAttribute('open');
		this.dispatchEvent(new Event('close'));
	};
});
beforeEach(() => {
	Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
	writeText.mockResolvedValue();
	vi.stubGlobal('fetch', fetchMock);
	URL.createObjectURL = vi.fn(() => 'blob:poster');
	URL.revokeObjectURL = vi.fn();
	initAnalytics();
	setConsent({ analytics: true });
	resetMockEvents();
});
afterEach(() => {
	cleanup();
	vi.unstubAllGlobals();
	fetchMock.mockReset();
	writeText.mockReset();
	click.mockClear();
	Reflect.deleteProperty(navigator, 'share');
});

describe('P9 slot B share menu (P18)', () => {
	it('offers copy link, WhatsApp, Facebook, the Web Share API and the poster, with the localised text', () => {
		show(lost);

		const button = screen.getByRole('button', { name: sl.report.share_button });
		expect(button.getAttribute('aria-haspopup')).toBe('menu');
		// The button opens the native popover menu it names.
		const menu = document.getElementById(button.getAttribute('popovertarget')!)!;
		expect([menu.getAttribute('role'), menu.getAttribute('aria-label')]).toEqual(['menu', sl.report.share_button]);
		expect(
			within(menu)
				.getAllByRole('menuitem', { hidden: true })
				.map((row) => row.textContent)
		).toEqual([
			'Kopiraj povezavo',
			'WhatsApp(odpre se v novem zavihku)',
			'Facebook(odpre se v novem zavihku)',
			'Več …',
			'Plakat s QR kodo',
		]);
		// The link and the area name only: no contact, no point.
		expect(item(/WhatsApp/).getAttribute('href')).toBe(`https://wa.me/?text=${encodeURIComponent(MESSAGE)}`);
		expect(item(/Facebook/).getAttribute('href')).toBe(
			`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(LINK)}`
		);
	});

	it('shares the bare link without an area name, and thanks everyone once reunited', () => {
		show(lost, 'sl', null);
		expect(item(/WhatsApp/).getAttribute('href')).toBe(`https://wa.me/?text=${encodeURIComponent(LINK)}`);
		cleanup();
		show({ ...lost, status: 'reunited' }, 'en');
		expect(item(/WhatsApp/).getAttribute('href')).toBe(
			`https://wa.me/?text=${encodeURIComponent(`Rex is home again. Thank you to everyone who shared and helped. ${LINK}`)}`
		);
	});

	it('copies the link with a toast and counts share/copy_link only with consent', async () => {
		show(lost);
		fireEvent.click(item('Kopiraj povezavo'));

		expect(await screen.findByText(sl.share.copied)).toBeTruthy();
		expect(writeText).toHaveBeenCalledWith(LINK);
		expect(events()).toEqual([
			{ name: 'share', params: { method: 'copy_link', report_type: 'lost', species: 'dog' } },
		]);

		setConsent({ analytics: false });
		resetMockEvents();
		fireEvent.click(item(/WhatsApp/));
		fireEvent.click(item('Kopiraj povezavo'));
		await waitFor(() => expect(writeText).toHaveBeenCalledTimes(2));
		expect(events()).toEqual([]);
	});

	it('says so when the clipboard refuses', async () => {
		writeText.mockRejectedValue(new Error('denied'));
		show(lost);
		fireEvent.click(item('Kopiraj povezavo'));
		expect(await screen.findByText(sl.share.copy_failed)).toBeTruthy();
		expect(events()).toEqual([]);
	});

	it('counts WhatsApp and Facebook as they open', () => {
		show(lost);
		fireEvent.click(item(/WhatsApp/));
		fireEvent.click(item(/Facebook/));
		expect(events().map(({ params }) => (params as { method: string }).method)).toEqual(['whatsapp', 'facebook']);
	});

	it('"Več …" opens the Web Share API, else copies the link and says why', async () => {
		show(lost);
		fireEvent.click(item('Več …'));
		expect(await screen.findByText(sl.share.unsupported)).toBeTruthy();
		expect(writeText).toHaveBeenCalledWith(LINK);

		const share = vi.fn().mockResolvedValue(undefined);
		Object.defineProperty(navigator, 'share', { value: share, configurable: true });
		fireEvent.click(item('Več …'));
		await waitFor(() => expect(share).toHaveBeenCalledWith({ text: MESSAGE }));
		await waitFor(() =>
			expect(events().at(-1)?.params).toEqual({ method: 'native', report_type: 'lost', species: 'dog' })
		);
	});

	it('is not offered for a closed search, nor in the owner view of a report the public cannot open', () => {
		const { container } = show({ ...lost, status: 'closed' });
		expect(container.innerHTML).toBe('');
		cleanup();
		const held = show({ ...owner, moderation_state: 'held' });
		expect(held.container.innerHTML).toBe('');
	});
});

describe('P18 poster dialog', () => {
	const openPoster = () => fireEvent.click(item('Plakat s QR kodo'));

	it('downloads the PDF in the chosen language as najdimo-<code>.pdf and counts poster_download', async () => {
		fetchMock.mockResolvedValue(new Response('%PDF-', { headers: { 'content-type': 'application/pdf' } }));
		show(lost);
		openPoster();

		const dialog = screen.getByRole('dialog', { name: sl.report.share_poster });
		expect(within(dialog).getByText(sl.poster.qr_note)).toBeTruthy();
		expect(within(dialog).getByText('Datoteka: najdimo-Rex12345.pdf')).toBeTruthy();
		const print = within(dialog).getByRole('link', { name: /Natisni/ });
		expect(print.getAttribute('href')).toBe('/r/Rex12345/poster.pdf?lang=sl');

		fireEvent.click(within(dialog).getByRole('button', { name: 'English' }));
		expect(print.getAttribute('href')).toBe('/r/Rex12345/poster.pdf?lang=en');
		fireEvent.click(within(dialog).getByRole('button', { name: sl.poster.download }));

		await waitFor(() => expect(click).toHaveBeenCalled());
		expect(fetchMock).toHaveBeenCalledWith('/r/Rex12345/poster.pdf?lang=en');
		const link = click.mock.contexts[0] as HTMLAnchorElement;
		expect([link.download, link.href]).toEqual(['najdimo-Rex12345.pdf', 'blob:poster']);
		expect(events()).toEqual([
			{ name: 'poster_download', params: { species: 'dog', region: 'osrednjeslovenska' } },
		]);
	});

	it('shows "Pripravljamo …" while it waits and the failure note with a retry', async () => {
		let fail: (response: Response) => void = () => undefined;
		fetchMock.mockReturnValue(new Promise((resolve) => (fail = resolve)));
		show(lost);
		openPoster();
		fireEvent.click(screen.getByRole('button', { name: sl.poster.download }));

		const busy = screen.getByRole('button', { name: sl.poster.preparing });
		expect(busy.getAttribute('aria-busy')).toBe('true');
		await act(async () => fail(new Response(null, { status: 503 })));

		expect((await screen.findByRole('alert')).textContent).toBe(sl.poster.failed);
		expect(screen.getByRole('button', { name: sl.common.try_again })).toBeTruthy();
		expect(events()).toEqual([]);
	});

	it('asks for a photo instead of a download when the report has none', () => {
		show({ ...lost, photos: [] });
		openPoster();
		const dialog = screen.getByRole('dialog');
		expect(within(dialog).getByText(sl.poster.no_photo)).toBeTruthy();
		expect(within(dialog).queryByRole('button', { name: sl.poster.download })).toBeNull();
	});

	it('marks the "Spet doma" poster of a reunited report', () => {
		show({ ...lost, status: 'reunited' });
		openPoster();
		expect(within(screen.getByRole('dialog')).getByText(sl.browse.status_reunited)).toBeTruthy();
	});
});

describe('P18 Facebook kit (owner of an open lost report)', () => {
	const config = {
		'share.facebook_groups': [
			{ name: 'Izgubljene živali – Gorenjska', url: 'https://facebook.com/groups/gor', regions: ['gorenjska'] },
			{ name: 'Plain http', url: 'http://facebook.com/groups/x' },
			{
				name: 'Izgubljene živali – Osrednja',
				url: 'https://facebook.com/groups/lj',
				regions: ['osrednjeslovenska'],
			},
			'broken',
		],
		'share.radio_form_url': 'https://radio.example/obvestila',
	};

	it('opens from the Facebook row: the ready text, the square image, the groups (region first) and the radio form', async () => {
		fetchMock.mockResolvedValue(new Response(JSON.stringify(config)));
		show(owner);
		expect(item('Facebook').tagName).toBe('BUTTON');
		fireEvent.click(item('Facebook'));

		const dialog = screen.getByRole('dialog', { name: sl.share.kit_title });
		expect(fetchMock).toHaveBeenCalledWith('http://localhost:4000/v1/config/public');
		expect(
			within(dialog).getByText(
				`Pogrešamo psa: Rex. Nazadnje viden 12. oktobra, območje Šiška, Ljubljana. Če ste ga videli, nam prosim sporočite prek povezave. Hvala, da delite. ${LINK}`
			)
		).toBeTruthy();
		const image = within(dialog).getByRole('img', { name: 'Kvadratna slika za objavo: Pogrešan pes Rex' });
		expect(image.getAttribute('src')).toBe('/r/Rex12345/square.png?lang=sl');
		expect(within(dialog).getByRole('link', { name: sl.share.kit_image_save }).getAttribute('download')).toBe(
			'najdimo-Rex12345.png'
		);

		await waitFor(() => expect(within(dialog).getAllByRole('listitem')).toHaveLength(2));
		expect(
			within(dialog)
				.getAllByRole('listitem')
				.map((row) => row.textContent)
		).toEqual([
			'Izgubljene živali – Osrednja(odpre se v novem zavihku)',
			'Izgubljene živali – Gorenjska(odpre se v novem zavihku)',
		]);
		expect(
			within(dialog)
				.getByRole('link', { name: /obrazec za obvestila/ })
				.getAttribute('href')
		).toBe('https://radio.example/obvestila');

		fireEvent.click(within(dialog).getAllByRole('button', { name: sl.share.kit_copy })[0]!);
		expect(await within(dialog).findByText(sl.share.kit_copied)).toBeTruthy();
		expect(events()).toEqual([
			{ name: 'share', params: { method: 'facebook', report_type: 'lost', species: 'dog' } },
		]);
	});

	it('still works without the public config', async () => {
		fetchMock.mockRejectedValue(new Error('offline'));
		show(owner);
		fireEvent.click(item('Facebook'));
		const dialog = screen.getByRole('dialog');
		await waitFor(() => expect(fetchMock).toHaveBeenCalled());
		expect(within(dialog).queryAllByRole('listitem')).toHaveLength(0);
		expect(within(dialog).getByText(sl.share.kit_groups_hint)).toBeTruthy();
	});
});

describe('parseShareConfig', () => {
	it('keeps https groups with a name, the region first, and an https radio form only', () => {
		expect(parseShareConfig({ 'share.radio_form_url': 'javascript:alert(1)' }, undefined)).toEqual({
			groups: [],
			radioFormUrl: undefined,
		});
		expect(parseShareConfig(null, 'gorenjska').groups).toEqual([]);
	});
});
