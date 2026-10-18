import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
	municipalityList,
	responsibleConfirmed,
	responsibleLikely,
	responsibleUnconfirmed,
} from '@zivali/api/__fixtures__/directory';
import { placeReverse } from '@zivali/api/__fixtures__/geocode';
import { createMockApi, mockError, type MockRoutes } from '@zivali/api/mock';
import { type ApiStore, createApiStore } from '@zivali/api/rtk';
import en from '@zivali/i18n/dist/en.json';
import sl from '@zivali/i18n/dist/sl.json';

import { ShelterSearch } from './shelter-search';

// The answer brings its own StoreProvider (shelter-answer.tsx); its store runs over the in-memory API.
const stores = vi.hoisted(() => ({ current: undefined as ApiStore | undefined, getStore: vi.fn() }));
vi.mock('@/lib/store', () => ({ getStore: stores.getStore.mockImplementation(() => stores.current) }));

const t = sl.shelters;
const municipalities = [
	...municipalityList.items,
	{ slug: 'kocevje', name: 'Kočevje', shelter_slug: null },
	{ slug: 'skofja-loka', name: 'Škofja Loka', shelter_slug: null },
	{ slug: 'skofljica', name: 'Škofljica', shelter_slug: null },
	{ slug: 'loski-potok', name: 'Loški Potok', shelter_slug: null },
];
const responsible: Record<string, object> = {
	ljubljana: responsibleConfirmed,
	kocevje: responsibleLikely,
	osilnica: responsibleUnconfirmed,
};

function renderSearch(routes: MockRoutes = {}, locale: 'sl' | 'en' = 'sl') {
	stores.current = createApiStore(
		createMockApi(
			{
				'GET /v1/shelters/responsible': ({ query }) => responsible[query.municipality!],
				...routes,
			},
			{ locale }
		)
	);
	render(
		<NextIntlClientProvider locale={locale} messages={locale === 'sl' ? sl : en}>
			<ShelterSearch municipalities={municipalities} />
		</NextIntlClientProvider>
	);
	return screen.getByRole('combobox', { name: locale === 'sl' ? t.search_label : en.shelters.search_label });
}

function choose(input: HTMLElement, text: string, option: string) {
	fireEvent.change(input, { target: { value: text } });
	fireEvent.mouseDown(screen.getByRole('option', { name: option }));
}

const callLinks = () => screen.queryAllByRole('link').filter((link) => link.getAttribute('href')?.startsWith('tel:'));

afterEach(() => {
	cleanup();
	stores.getStore.mockClear();
});

describe('ShelterSearch', () => {
	it('loads the store only with the first chosen municipality, so the page itself has no Redux (TASK-90.5)', async () => {
		const input = renderSearch();
		fireEvent.change(input, { target: { value: 'ljub' } });
		expect(stores.getStore).not.toHaveBeenCalled();

		fireEvent.mouseDown(screen.getByRole('option', { name: 'Ljubljana' }));
		expect(screen.getByText(sl.common.loading)).toBeTruthy();
		await screen.findByRole('link', { name: 'Pokliči Zavetišče Ljubljana' });
		expect(stores.getStore).toHaveBeenCalledWith('sl');
	});

	it('suggests municipalities ignoring case and diacritics, prefix matches first', () => {
		const input = renderSearch();
		fireEvent.change(input, { target: { value: 'skof' } });

		expect(input.getAttribute('aria-expanded')).toBe('true');
		const names = screen.getAllByRole('option').map((option) => option.textContent);
		expect(names).toEqual(['Škofja Loka', 'Škofljica']);
		expect(screen.getByRole('status').textContent).toBe('2 občini ustrezata vnosu');

		fireEvent.change(input, { target: { value: 'lo' } });
		expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
			'Loški Potok',
			'Škofja Loka',
		]);
	});

	it('moves through the options with the keyboard and picks one with Enter', async () => {
		const input = renderSearch();
		fireEvent.change(input, { target: { value: 'skof' } });
		fireEvent.keyDown(input, { key: 'ArrowDown' });

		const second = screen.getByRole('option', { name: 'Škofljica' });
		expect(input.getAttribute('aria-activedescendant')).toBe(second.id);
		expect(second.getAttribute('aria-selected')).toBe('true');

		fireEvent.keyDown(input, { key: 'Enter' });
		expect((input as HTMLInputElement).value).toBe('Škofljica');
		expect(input.getAttribute('aria-expanded')).toBe('false');
	});

	it('says when nothing matches the typed text', () => {
		const input = renderSearch();
		fireEvent.change(input, { target: { value: 'Kamnk' } });

		expect(
			screen.getByText('Občine »Kamnk« ne najdemo. Preverite zapis ali jo poiščite na seznamu spodaj.')
		).toBeTruthy();
		expect(screen.queryByRole('option')).toBeNull();

		fireEvent.click(screen.getByRole('button', { name: t.search_clear }));
		expect((input as HTMLInputElement).value).toBe('');
		expect(document.activeElement).toBe(input);
	});

	it('answers a confirmed municipality with the number and the one primary call button', async () => {
		choose(renderSearch(), 'ljub', 'Ljubljana');

		const call = await screen.findByRole('link', { name: 'Pokliči Zavetišče Ljubljana' });
		expect(call.getAttribute('href')).toBe('tel:+38612345678');
		expect(call.dataset.variant).toBe('default');
		expect(screen.getByText('Za občino Ljubljana je pristojno')).toBeTruthy();
		expect(screen.getByText('01 234 56 78')).toBeTruthy();
		expect(screen.getByRole('link', { name: 'Zavetišče Ljubljana' }).getAttribute('href')).toBe(
			'/zavetisca/zavetisce-ljubljana'
		);
	});

	it('shows a likely shelter as not confirmed, with only a secondary call and no number', async () => {
		choose(renderSearch(), 'koc', 'Kočevje');

		const call = await screen.findByRole('link', { name: 'Pokliči Zavetišče Ljubljana. Pristojnost ni potrjena.' });
		expect(call.textContent).toBe(t.call_unconfirmed);
		expect(call.dataset.variant).toBe('secondary');
		expect(callLinks()).toHaveLength(1);
		expect(screen.getByText(t.not_confirmed)).toBeTruthy();
		expect(screen.getByRole('heading', { level: 2 }).textContent).toBe(t.maybe_responsible);
		expect(screen.queryByText(/Za občino Kočevje je pristojno/)).toBeNull();
		expect(screen.queryByText(/\d{2} \d{3} \d{2} \d{2}/)).toBeNull();
	});

	it('gives an unconfirmed municipality no phone at all, only the two nearest shelters', async () => {
		choose(renderSearch(), 'osil', 'Osilnica');

		await screen.findByText(t.nearest_title);
		expect(callLinks()).toHaveLength(0);
		expect(screen.getByText(/Za občino Osilnica še nimamo potrjenega zavetišča/)).toBeTruthy();
		const nearest = within(screen.getByRole('list'));
		expect(nearest.getByRole('link', { name: 'Zavetišče Kočevje' }).getAttribute('href')).toBe(
			'/zavetisca/zavetisce-kocevje'
		);
		expect(nearest.getByText('71 km od središča občine')).toBeTruthy();
		expect(screen.getByRole('link', { name: /Vsa zavetišča/ }).getAttribute('href')).toBe('#all');
	});

	it('shows the inline error with a retry when the lookup fails', async () => {
		let fail = true;
		const input = renderSearch({
			'GET /v1/shelters/responsible': () => (fail ? mockError('NOT_FOUND') : responsibleConfirmed),
		});
		choose(input, 'ljub', 'Ljubljana');

		expect((await screen.findByRole('alert')).textContent).toContain(t.error);
		fail = false;
		fireEvent.click(screen.getByRole('button', { name: sl.common.try_again }));
		expect(await screen.findByRole('link', { name: 'Pokliči Zavetišče Ljubljana' })).toBeTruthy();
	});

	it('speaks English on the EN page', async () => {
		choose(renderSearch({}, 'en'), 'koc', 'Kočevje');

		expect(
			await screen.findByRole('link', { name: 'Call Zavetišče Ljubljana. Responsibility is not confirmed.' })
		).toBeTruthy();
		expect(screen.getByText('Not confirmed')).toBeTruthy();
	});
});

describe('ShelterSearch "Uporabi mojo lokacijo" (TASK-114.11)', () => {
	const RAW = { latitude: 46.056947, longitude: 14.505751 };
	const codes = { PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 };

	/** The browser's geolocation answers with a fix or with an error code (1 denied, 2 unavailable, 3 timeout). */
	function mockGeolocation(answer: { coords: typeof RAW } | { code: number } | undefined) {
		const getCurrentPosition = vi.fn((ok: PositionCallback, fail: PositionErrorCallback) =>
			answer && 'coords' in answer
				? ok({ coords: answer.coords } as GeolocationPosition)
				: fail({ ...codes, code: answer!.code } as GeolocationPositionError)
		);
		Object.defineProperty(navigator, 'geolocation', {
			configurable: true,
			value: answer ? { getCurrentPosition } : undefined,
		});
		return getCurrentPosition;
	}

	afterEach(() => {
		Object.defineProperty(navigator, 'geolocation', { configurable: true, value: undefined });
		localStorage.clear();
		sessionStorage.clear();
	});

	const button = (name = t.use_location) => screen.getByRole('button', { name });

	it('fills the municipality from a coarse fix and shows its shelter; only the rounded point goes out (AC#1, AC#3)', async () => {
		const getCurrentPosition = mockGeolocation({ coords: RAW });
		const sent: unknown[] = [];
		const input = renderSearch({
			'POST /v1/geo/reverse': ({ body }) => {
				sent.push(body);
				return placeReverse;
			},
		});
		expect(stores.getStore).not.toHaveBeenCalled();

		fireEvent.click(button());

		expect(await screen.findByRole('link', { name: 'Pokliči Zavetišče Ljubljana' })).toBeTruthy();
		expect((input as HTMLInputElement).value).toBe('Ljubljana');
		expect(getCurrentPosition.mock.calls[0]![2]).toMatchObject({ timeout: 10_000 });
		expect(getCurrentPosition.mock.calls[0]![2]?.enableHighAccuracy).toBeFalsy();
		expect(sent).toEqual([{ lat: 46.06, lng: 14.51 }]);
		const kept = JSON.stringify({ ...localStorage, ...sessionStorage }) + window.location.href;
		expect(kept).not.toMatch(/46\.0|14\.5/);
		expect(screen.queryByText(t.location_failed)).toBeNull();
	});

	it.each([
		['denied', codes.PERMISSION_DENIED, t.location_denied],
		['unavailable', codes.POSITION_UNAVAILABLE, t.location_failed],
		['timed out', codes.TIMEOUT, t.location_failed],
	])('says so when the position is %s, and the search stays usable (AC#2)', async (_, code, message) => {
		mockGeolocation({ code });
		const input = renderSearch();

		fireEvent.click(button());

		expect(await screen.findByText(message)).toBeTruthy();
		expect((input as HTMLInputElement).value).toBe('');
		expect(stores.getStore).not.toHaveBeenCalled();
		choose(input, 'ljub', 'Ljubljana');
		expect(screen.queryByText(message)).toBeNull();
		expect(await screen.findByRole('link', { name: 'Pokliči Zavetišče Ljubljana' })).toBeTruthy();
	});

	it('says so without a geolocation API or when the lookup fails', async () => {
		mockGeolocation(undefined);
		renderSearch({ 'POST /v1/geo/reverse': () => mockError('NOT_FOUND') });
		fireEvent.click(button());
		expect(await screen.findByText(t.location_failed)).toBeTruthy();

		cleanup();
		mockGeolocation({ coords: RAW });
		renderSearch({ 'POST /v1/geo/reverse': () => mockError('NOT_FOUND') });
		fireEvent.click(button());
		expect(await screen.findByText(t.location_failed)).toBeTruthy();
		expect(screen.getByRole('button', { name: t.use_location }).getAttribute('aria-busy')).toBeNull();
	});

	it('says the position is outside Slovenia when the reverse lookup has no place, in SL and EN (AC#2)', async () => {
		mockGeolocation({ coords: { latitude: 48.21, longitude: 16.37 } });
		const input = renderSearch({ 'POST /v1/geo/reverse': () => ({ place: null }) });
		fireEvent.click(button());
		expect(await screen.findByText(t.location_outside)).toBeTruthy();
		expect((input as HTMLInputElement).value).toBe('');

		cleanup();
		renderSearch({ 'POST /v1/geo/reverse': () => ({ place: null }) }, 'en');
		fireEvent.click(button('Use my location'));
		expect(
			await screen.findByText('Your location is outside Slovenia. Enter your municipality instead.')
		).toBeTruthy();

		cleanup();
		mockGeolocation({ code: codes.PERMISSION_DENIED });
		renderSearch({}, 'en');
		fireEvent.click(button('Use my location'));
		expect(
			await screen.findByText('Location access is not allowed. Enter your municipality instead.')
		).toBeTruthy();
	});
});
