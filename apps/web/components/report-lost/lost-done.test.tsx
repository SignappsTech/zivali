import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { Provider } from 'react-redux';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { responsibleConfirmed } from '@zivali/api/__fixtures__/directory';
import { placeReverse } from '@zivali/api/__fixtures__/geocode';
import { ownerReport } from '@zivali/api/__fixtures__/reports';
import { createMockApi, mockError, type MockRoutes } from '@zivali/api/mock';
import { createApiStore } from '@zivali/api/rtk';
import en from '@zivali/i18n/dist/en.json';
import sl from '@zivali/i18n/dist/sl.json';
import { timeZone } from '@zivali/i18n/format';

import { LostDone } from './lost-done';

const t = sl.report_lost;
const CODE = ownerReport.short_code;
// The coarsened point the report was sent with.
const POINT = { lat: 46.05041, lng: 14.50587 };
const report = { ...ownerReport, type: 'lost', name: 'Medo', manager_role: 'owner' };

const locale = vi.hoisted(() => ({ current: 'sl' as 'sl' | 'en' }));
vi.mock('next/navigation', async (actual) => ({
	...(await actual()),
	usePathname: () => '/prijava/izgubljena-zival',
	useParams: () => ({ locale: locale.current }),
}));
const track = vi.hoisted(() => vi.fn());
const fetchMock = vi.fn<typeof fetch>();
const LINK = `https://najdimo.si/r/${CODE}`;
vi.mock('@zivali/analytics', () => ({ track }));
// The P15 row has its own tests (who is asked, the ask itself: components/payments/support.test.tsx); here only its
// slot.
vi.mock('@/components/payments/support', () => ({
	ContributionRow: ({ code }: { code: string }) => <div data-testid="contribution-row" data-code={code} />,
}));

function show(props: Partial<React.ComponentProps<typeof LostDone>> = {}, routes: MockRoutes = {}) {
	const api = createMockApi({
		'GET /v1/reports/:code': report,
		'GET /v1/shelters/responsible': responsibleConfirmed,
		'POST /v1/geo/reverse': placeReverse,
		...routes,
	});
	render(
		<NextIntlClientProvider locale={locale.current} messages={{ sl, en }[locale.current]} timeZone={timeZone}>
			<Provider store={createApiStore(api)}>
				<LostDone
					code={CODE}
					name="Medo"
					species="dog"
					point={POINT}
					unverified={false}
					titleClass=""
					{...props}
				/>
			</Provider>
		</NextIntlClientProvider>
	);
	return api;
}
const duty = `${sl.shelter_row.lost_body.replace('{municipality}', 'Ljubljana')} ${sl.shelter_row.not_replace}`;

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
	locale.current = 'sl';
	vi.stubGlobal('fetch', fetchMock);
	URL.createObjectURL = vi.fn(() => 'blob:poster');
	URL.revokeObjectURL = vi.fn();
});
afterEach(() => {
	cleanup();
	vi.clearAllMocks();
	vi.unstubAllGlobals();
	fetchMock.mockReset();
	Reflect.deleteProperty(navigator, 'share');
	Reflect.deleteProperty(navigator, 'clipboard');
});

describe('LostDone (P6 M9)', () => {
	it('shows next steps and the responsible shelter by municipality, with the duty it never replaces; no ad (AC#2, AC#4)', async () => {
		const api = show();

		expect(screen.getByRole('heading', { level: 1, name: t.done_title })).toBeTruthy();
		expect(screen.getByText(t.done_lede_named.replace('{name}', 'Medo'))).toBeTruthy();
		const next = screen.getByRole('list', { name: t.next_title });
		expect(next.textContent).toBe([t.next_1, t.next_2, t.next_3].join(''));
		expect(screen.queryByText(t.unverified_note)).toBeNull();

		expect(await screen.findByText(duty)).toBeTruthy();
		// The municipality the API derived for the report, not a point rounded across a border (C18).
		expect(api.calls.filter((c) => c.path === '/v1/shelters/responsible').map((c) => c.query)).toEqual([
			{ municipality: 'ljubljana' },
		]);
		expect(screen.getByRole('link', { name: 'Pokliči Zavetišče Ljubljana' }).getAttribute('href')).toBe(
			'tel:+38612345678'
		);
		expect(document.querySelector('[data-ad-slot]')).toBeNull();
		// The P15 contribution slot comes last (it asks signed-in accounts only: components/payments/support.test.tsx).
		expect(screen.getByTestId('contribution-row').dataset.code).toBe(CODE);
	});

	it('leaves the contribution slot out while payments are off (paymentsEnabled, TASK-76.1)', () => {
		show({ payments: false });
		expect(screen.getByRole('heading', { level: 1, name: t.done_title })).toBeTruthy();
		expect(screen.queryByTestId('contribution-row')).toBeNull();
	});

	it('opens the poster options: language, a failure on 503, then the PDF, with poster_download by region', async () => {
		vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
		show();
		await screen.findByText(duty);
		fireEvent.click(screen.getByRole('button', { name: t.poster }));
		const dialog = screen.getByRole('dialog', { name: sl.report.share_poster });
		expect(within(dialog).getByText(sl.poster.qr_note)).toBeTruthy();
		expect(
			within(dialog)
				.getByRole('link', { name: new RegExp(sl.poster.print) })
				.getAttribute('href')
		).toBe(`/r/${CODE}/poster.pdf?lang=sl`);

		fetchMock.mockResolvedValueOnce(new Response('', { status: 503 }));
		fireEvent.click(within(dialog).getByRole('button', { name: sl.poster.download }));
		expect((await within(dialog).findByRole('alert')).textContent).toBe(sl.poster.failed);
		expect(track).not.toHaveBeenCalledWith('poster_download', expect.anything());

		fireEvent.click(within(dialog).getByRole('button', { name: /English/ }));
		fetchMock.mockResolvedValueOnce(new Response('%PDF-'));
		fireEvent.click(within(dialog).getByRole('button', { name: sl.common.try_again }));
		await waitFor(() =>
			expect(track).toHaveBeenCalledWith('poster_download', { species: 'dog', region: 'osrednjeslovenska' })
		);
		expect(fetchMock).toHaveBeenLastCalledWith(`/r/${CODE}/poster.pdf?lang=en`);
		expect(screen.getByRole('link', { name: t.open_report }).getAttribute('href')).toBe(`/r/${CODE}`);
		expect(screen.getByRole('link', { name: t.first_24h }).getAttribute('href')).toBe('/varnost#prvih-24-ur');
	});

	it('uses the English safety anchor in English', () => {
		locale.current = 'en';
		show();
		expect(screen.getByRole('link', { name: en.report_lost.first_24h }).getAttribute('href')).toBe(
			'/en/safety#first-24-hours'
		);
	});

	it('shares through the P18 menu with the canonical link (never the page origin), the area text and the kit', async () => {
		const share = vi.fn(async () => {});
		Object.defineProperty(navigator, 'share', { value: share, configurable: true });
		const writeText = vi.fn(async () => {});
		Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
		const api = show();
		await screen.findByText(duty);
		await waitFor(() => expect(api.calls.some((c) => c.path === '/v1/geo/reverse')).toBe(true));
		await new Promise((resolve) => setTimeout(resolve, 10));

		const open = () => fireEvent.keyDown(screen.getByRole('button', { name: t.share }), { key: 'Enter' });
		open();
		const menu = screen.getByRole('menu');
		expect(
			within(menu)
				.getAllByRole('menuitem')
				.map((row) => row.textContent)
		).toEqual([
			'Kopiraj povezavo',
			'WhatsApp(odpre se v novem zavihku)',
			'Facebook(odpre se v novem zavihku)',
			'Več …',
			'Plakat s QR kodo',
		]);
		// The area is the reverse lookup of the public circle; the text has no phone, chip or exact point.
		const text = new RegExp(
			`^Pomagajte najti psa: Medo[.] Nazadnje viden .+, območje Šiška, Ljubljana[.] .+ ${LINK}$`
		);
		const wa = within(menu)
			.getByRole('menuitem', { name: /WhatsApp/ })
			.getAttribute('href')!;
		expect(decodeURIComponent(wa.replace('https://wa.me/?text=', ''))).toMatch(text);
		expect(api.calls.find((c) => c.path === '/v1/geo/reverse')!.body).toEqual({
			lat: report.area.lat,
			lng: report.area.lng,
		});

		fireEvent.click(within(menu).getByRole('menuitem', { name: 'Več …' }));
		await waitFor(() => expect(share).toHaveBeenCalledWith({ text: expect.stringMatching(text) }));
		expect(track).toHaveBeenCalledWith('share', { method: 'native', report_type: 'lost', species: 'dog' });

		// No Web Share API: the link is copied, with the unsupported toast.
		Reflect.deleteProperty(navigator, 'share');
		open();
		fireEvent.click(screen.getByRole('menuitem', { name: 'Več …' }));
		await waitFor(() => expect(writeText).toHaveBeenCalledWith(LINK));
		expect(await screen.findByText(sl.share.unsupported)).toBeTruthy();

		// A clipboard that refuses says so.
		writeText.mockRejectedValueOnce(new Error('denied'));
		open();
		fireEvent.click(screen.getByRole('menuitem', { name: 'Kopiraj povezavo' }));
		expect(await screen.findByText(sl.share.copy_failed)).toBeTruthy();
		expect(window.location.origin).not.toBe('https://najdimo.si');

		// Facebook: the sharer with the link, the kit's post copied to paste, the kit behind it; counted once.
		track.mockClear();
		fetchMock.mockResolvedValue(new Response('{}'));
		open();
		const facebook = screen.getByRole('menuitem', { name: /Facebook/ });
		expect(facebook.getAttribute('href')).toBe(
			`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(LINK)}`
		);
		fireEvent.click(facebook);
		expect(writeText).toHaveBeenLastCalledWith(
			expect.stringMatching(new RegExp(`^Pogrešamo psa: Medo[.] .+ ${LINK}$`))
		);
		const kit = await screen.findByRole('dialog', { name: sl.share.kit_title });
		expect(await within(kit).findByText(sl.share.facebook_copied)).toBeTruthy();
		expect(track.mock.calls).toEqual([['share', { method: 'facebook', report_type: 'lost', species: 'dog' }]]);
	});

	it('says what an unconfirmed address still waits for', () => {
		show({ unverified: true, name: undefined });
		expect(screen.getByText(t.unverified_note)).toBeTruthy();
		expect(screen.getByText(t.done_lede)).toBeTruthy();
	});

	it('falls back to the sent point for the shelter and to the bare link for sharing, without the kit, when the report cannot be read', async () => {
		const api = show({}, { 'GET /v1/reports/:code': () => mockError('FORBIDDEN') });
		expect(await screen.findByText(duty)).toBeTruthy();
		expect(api.calls.find((c) => c.path === '/v1/shelters/responsible')!.query).toEqual({
			lat: '46.05',
			lng: '14.51',
		});
		fireEvent.keyDown(screen.getByRole('button', { name: t.share }), { key: 'Enter' });
		const wa = screen.getByRole('menuitem', { name: /WhatsApp/ }).getAttribute('href');
		expect(wa).toBe(`https://wa.me/?text=${encodeURIComponent(LINK)}`);
		// No area, so Facebook is the plain sharer link.
		expect(screen.getByRole('menuitem', { name: /Facebook/ }).getAttribute('href')).toContain('sharer.php');
	});
});
