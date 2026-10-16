import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { Provider } from 'react-redux';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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
vi.mock('@zivali/analytics', () => ({ track }));

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

beforeEach(() => {
	locale.current = 'sl';
});
afterEach(() => {
	cleanup();
	vi.clearAllMocks();
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
		// The P15 slot is TASK-33.2's: nothing to pay here yet.
		expect(screen.queryByText(sl.support.contribution_row)).toBeNull();
	});

	it('links the poster PDF in the page language, the report and the first-24-hours tips', async () => {
		show();
		const poster = screen.getByRole('link', { name: t.poster });
		expect(poster.getAttribute('href')).toBe(`/r/${CODE}/poster.pdf?lang=sl`);
		expect(poster.getAttribute('download')).toBe(`najdimo-${CODE}.pdf`);
		expect(screen.getByRole('link', { name: t.open_report }).getAttribute('href')).toBe(`/r/${CODE}`);
		expect(screen.getByRole('link', { name: t.first_24h }).getAttribute('href')).toBe('/varnost#prvih-24-ur');

		// poster_download carries the region the API derived (C12); track() itself waits for consent.
		await screen.findByText(duty);
		fireEvent.click(poster);
		expect(track).toHaveBeenCalledWith('poster_download', { species: 'dog', region: 'osrednjeslovenska' });
	});

	it('uses the English poster and safety anchors in English', async () => {
		locale.current = 'en';
		show();
		expect(screen.getByRole('link', { name: en.report_lost.poster }).getAttribute('href')).toBe(
			`/r/${CODE}/poster.pdf?lang=en`
		);
		expect(screen.getByRole('link', { name: en.report_lost.first_24h }).getAttribute('href')).toBe(
			'/en/safety#first-24-hours'
		);
	});

	it('shares the P18 text with the short link, else copies the link', async () => {
		const share = vi.fn(async () => {});
		Object.defineProperty(navigator, 'share', { value: share, configurable: true });
		const api = show();
		await screen.findByText(duty);
		await waitFor(() => expect(api.calls.some((c) => c.path === '/v1/geo/reverse')).toBe(true));
		await new Promise((resolve) => setTimeout(resolve, 10));

		fireEvent.click(screen.getByRole('button', { name: t.share }));
		const url = `${window.location.origin}/r/${CODE}`;
		// The area is the reverse lookup of the public circle; the text has no phone, chip or exact point.
		await waitFor(() =>
			expect(share).toHaveBeenCalledWith({
				text: expect.stringMatching(
					new RegExp(
						`^Pomagajte najti psa: Medo\\. Nazadnje viden .+, območje Šiška, Ljubljana\\. .+ ${url}$`
					)
				),
			})
		);
		expect(api.calls.find((c) => c.path === '/v1/geo/reverse')!.body).toEqual({
			lat: report.area.lat,
			lng: report.area.lng,
		});
		expect(track).toHaveBeenCalledWith('share', { method: 'native', report_type: 'lost', species: 'dog' });

		Reflect.deleteProperty(navigator, 'share');
		const writeText = vi.fn(async () => {});
		Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
		fireEvent.click(screen.getByRole('button', { name: t.share }));
		await waitFor(() => expect(writeText).toHaveBeenCalledWith(url));
		expect(track).toHaveBeenCalledWith('share', { method: 'copy_link', report_type: 'lost', species: 'dog' });
	});

	it('says what an unconfirmed address still waits for', () => {
		show({ unverified: true, name: undefined });
		expect(screen.getByText(t.unverified_note)).toBeTruthy();
		expect(screen.getByText(t.done_lede)).toBeTruthy();
	});

	it('falls back to the sent point for the shelter and to the bare link for sharing when the report cannot be read', async () => {
		const share = vi.fn(async () => {});
		Object.defineProperty(navigator, 'share', { value: share, configurable: true });
		const api = show({}, { 'GET /v1/reports/:code': () => mockError('FORBIDDEN') });
		expect(await screen.findByText(duty)).toBeTruthy();
		expect(api.calls.find((c) => c.path === '/v1/shelters/responsible')!.query).toEqual({
			lat: '46.05',
			lng: '14.51',
		});
		fireEvent.click(screen.getByRole('button', { name: t.share }));
		await waitFor(() => expect(share).toHaveBeenCalledWith({ text: `${window.location.origin}/r/${CODE}` }));
		fireEvent.click(screen.getByRole('link', { name: t.poster }));
		expect(track).not.toHaveBeenCalledWith('poster_download', expect.anything());
	});
});
