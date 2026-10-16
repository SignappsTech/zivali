import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { Provider } from 'react-redux';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { placeReverse, placeSearch } from '@zivali/api/__fixtures__/geocode';
import { createMockApi, type MockRoutes } from '@zivali/api/mock';
import { createApiStore } from '@zivali/api/rtk';
import en from '@zivali/i18n/dist/en.json';
import sl from '@zivali/i18n/dist/sl.json';
import { coarsenPoint } from '@zivali/validation/geo';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';

import type { LatLng } from '../map/map-data';
import { LocationPicker, type LocationPickerProps } from './location-picker';

// MapLibre needs WebGL, which jsdom lacks: the engine is a spy, and the tests drive its camera callback.
type Options = Parameters<typeof import('../map/engine').createMapEngine>[0];
const engine = vi.hoisted(() => ({
	options: undefined as Options | undefined,
	setData: vi.fn(),
	setMode: vi.fn(),
	setLabel: vi.fn(),
	moveTo: vi.fn(),
	zoomToCluster: vi.fn(),
	destroy: vi.fn(),
}));
vi.mock('../map/engine', () => ({
	createMapEngine: (options: Options) => {
		engine.options = options;
		return engine;
	},
}));
// The real coarsening, watched: the tests check what goes in and that onChange gets only what comes out.
vi.mock('@zivali/validation/geo', async (original) => {
	const geo = await original<typeof import('@zivali/validation/geo')>();
	return { ...geo, coarsenPoint: vi.fn(geo.coarsenPoint) };
});

const t = en.location;
const geolocation = { getCurrentPosition: vi.fn() };
const permissions = { query: vi.fn() };
Object.defineProperty(navigator, 'geolocation', { value: geolocation, configurable: true });
Object.defineProperty(navigator, 'permissions', { value: permissions, configurable: true });

beforeEach(() => {
	vi.clearAllMocks();
	engine.options = undefined;
	permissions.query.mockResolvedValue({ state: 'granted' });
});
afterEach(cleanup);

const SISKA: LatLng = { lat: 46.0702, lng: 14.4875 };
const FIX: LatLng = { lat: 46.0561, lng: 14.5122 };
const EXIF: LatLng = { lat: 46.0489, lng: 14.4691 };
const STORED: LatLng = { lat: 46.051234, lng: 14.505678 };

const metres = (a: LatLng, b: LatLng) =>
	Math.hypot((b.lng - a.lng) * Math.cos(((a.lat + b.lat) * Math.PI) / 360), b.lat - a.lat) * 111_320;

function renderPicker(props: Partial<LocationPickerProps> = {}, routes: MockRoutes = {}, locale: 'sl' | 'en' = 'en') {
	const store = createApiStore(
		createMockApi({ 'POST /v1/geo/search': placeSearch, 'POST /v1/geo/reverse': placeReverse, ...routes })
	);
	const onChange = vi.fn();
	render(
		<Provider store={store}>
			<NextIntlClientProvider locale={locale} messages={locale === 'sl' ? sl : en}>
				<LocationPicker mode="lost" onChange={onChange} {...props} />
			</NextIntlClientProvider>
		</Provider>
	);
	return onChange;
}

/** Waits for the map, then drags it so `center` is under the pin. */
async function dragTo(center: LatLng) {
	await vi.waitFor(() => expect(engine.options).toBeDefined());
	act(() => engine.options!.onCameraChange({ center, zoom: 15, moving: true }));
	act(() => engine.options!.onCameraChange({ center, zoom: 15, moving: false }));
}

const confirm = () => fireEvent.click(screen.getByRole('button', { name: t.confirm }));
const useMyLocation = () => fireEvent.click(screen.getByRole('button', { name: t.use_my_location }));
const searchField = () => screen.getByRole('combobox', { name: t.search_label });

/** onChange got the one coarsened point, 20–30 m from the raw one, never the raw point itself. */
function expectCoarsened(onChange: ReturnType<typeof vi.fn>, raw: LatLng, source: string) {
	expect(coarsenPoint).toHaveBeenCalledTimes(1);
	expect(coarsenPoint).toHaveBeenCalledWith(raw);
	const sent = vi.mocked(coarsenPoint).mock.results[0]!.value as LatLng;
	expect(onChange).toHaveBeenCalledExactlyOnceWith({ point: sent, radiusM: 500, source });
	expect(sent).not.toEqual(raw);
	expect(metres(sent, raw)).toBeGreaterThan(19.9);
	expect(metres(sent, raw)).toBeLessThan(30.1);
}

describe('LocationPicker (web)', () => {
	it('keeps the pin at the centre and coarsens the point the map was dragged to once, on Confirm (AC#1, AC#5)', async () => {
		const onChange = renderPicker();
		await dragTo(SISKA);
		expect(screen.getByTestId('picker-pin')).toBeTruthy();
		expect(await screen.findByText('Šiška, Ljubljana')).toBeTruthy();
		expect(coarsenPoint).not.toHaveBeenCalled();

		confirm();
		expectCoarsened(onChange, SISKA, 'pin');
	});

	it('coarsens a GPS fix, a search result and the photo location alike (AC#5)', async () => {
		geolocation.getCurrentPosition.mockImplementation((success: PositionCallback) =>
			success({ coords: { latitude: FIX.lat, longitude: FIX.lng } } as GeolocationPosition)
		);
		let onChange = renderPicker();
		useMyLocation();
		await vi.waitFor(() => expect(engine.moveTo).toHaveBeenCalledWith(FIX, expect.any(Number)));
		confirm();
		expectCoarsened(onChange, FIX, 'gps');

		cleanup();
		vi.clearAllMocks();
		onChange = renderPicker();
		fireEvent.change(searchField(), { target: { value: 'trubarjeva 5' } });
		fireEvent.mouseDown(await screen.findByRole('option', { name: 'Trubarjeva cesta 5, Ljubljana' }));
		confirm();
		const [address] = placeSearch.items;
		expectCoarsened(onChange, { lat: address!.lat, lng: address!.lng }, 'search');

		cleanup();
		vi.clearAllMocks();
		onChange = renderPicker({ suggested: { ...EXIF, source: 'exif' } });
		fireEvent.click(screen.getByRole('button', { name: t.use_photo_location }));
		confirm();
		expectCoarsened(onChange, EXIF, 'exif');
	});

	it('gives a stored point confirmed unmoved back as is, under the own-pin label (AC#5)', async () => {
		const onChange = renderPicker({ value: { point: STORED, radiusM: 1000 } }, {}, 'sl');
		expect(screen.getByText('Približna lokacija · vidno samo vam')).toBeTruthy();
		// The map reports its centre after loading, a hair off in floating point: still the stored point.
		await dragTo({ lat: STORED.lat + 1e-9, lng: STORED.lng - 1e-9 });

		fireEvent.click(screen.getByRole('button', { name: sl.location.confirm }));
		expect(onChange).toHaveBeenCalledExactlyOnceWith({ point: STORED, radiusM: 1000, source: 'pin' });
		expect(coarsenPoint).not.toHaveBeenCalled();

		await dragTo(SISKA);
		expect(screen.queryByText('Približna lokacija · vidno samo vam')).toBeNull();
		fireEvent.click(screen.getByRole('button', { name: sl.location.confirm }));
		expect(coarsenPoint).toHaveBeenCalledExactlyOnceWith(SISKA);
		expect(onChange).toHaveBeenLastCalledWith({
			point: vi.mocked(coarsenPoint).mock.results[0]!.value,
			radiusM: 1000,
			source: 'pin',
		});
	});

	it('shows the P2 primer before the browser asks; "Not now" leaves search and the pin (AC#2)', async () => {
		permissions.query.mockResolvedValue({ state: 'prompt' });
		renderPicker();
		useMyLocation();
		const primer = await screen.findByRole('dialog', { name: en.permissions.location_title });
		expect(geolocation.getCurrentPosition).not.toHaveBeenCalled();
		expect(primer.textContent).toContain(en.permissions.location_body);

		fireEvent.click(screen.getByRole('button', { name: en.permissions.location_allow }));
		expect(geolocation.getCurrentPosition).toHaveBeenCalledOnce();

		cleanup();
		renderPicker();
		useMyLocation();
		fireEvent.click(await screen.findByRole('button', { name: en.permissions.not_now }));
		expect(await screen.findByText(t.gps_denied)).toBeTruthy();
		expect(screen.queryByRole('button', { name: t.use_my_location })).toBeNull();
		await vi.waitFor(() => expect(document.activeElement).not.toBe(document.body));
	});

	it('explains a denied permission in place of the button; search and the pin still work (AC#2)', async () => {
		const onChange = renderPicker({ permissionDenied: true });
		expect(screen.getByText(t.gps_denied)).toBeTruthy();
		expect(screen.queryByRole('button', { name: t.use_my_location })).toBeNull();
		fireEvent.change(searchField(), { target: { value: 'trubarjeva' } });
		expect(await screen.findByRole('option', { name: 'Trubarjeva cesta, Ljubljana' })).toBeTruthy();
		await dragTo(SISKA);
		confirm();
		expect(onChange).toHaveBeenCalledOnce();

		cleanup();
		permissions.query.mockResolvedValue({ state: 'denied' });
		renderPicker();
		useMyLocation();
		expect(await screen.findByText(t.gps_denied)).toBeTruthy();
		expect(geolocation.getCurrentPosition).not.toHaveBeenCalled();

		// Refused at the browser prompt (no Permissions API answer): the same note.
		cleanup();
		permissions.query.mockRejectedValue(new Error('unsupported'));
		geolocation.getCurrentPosition.mockImplementation((_: PositionCallback, failure: PositionErrorCallback) =>
			failure({ code: 1, PERMISSION_DENIED: 1 } as GeolocationPositionError)
		);
		renderPicker();
		useMyLocation();
		fireEvent.click(await screen.findByRole('button', { name: en.permissions.location_allow }));
		expect(await screen.findByText(t.gps_denied)).toBeTruthy();
		expect(screen.queryByRole('button', { name: t.use_my_location })).toBeNull();
	});

	it('shows a notice for a point outside Slovenia and still accepts it (AC#3)', async () => {
		const trieste = { lat: 45.6495, lng: 13.7768 };
		const onChange = renderPicker({}, { 'POST /v1/geo/reverse': { place: null } });
		await dragTo(trieste);
		expect(await screen.findByText(t.outside_si)).toBeTruthy();
		confirm();
		expectCoarsened(onChange, trieste, 'pin');
	});

	it('runs the search as a keyboard combobox, with no results and the GURS attribution (AC#4)', async () => {
		renderPicker(
			{},
			{
				'POST /v1/geo/search': ({ body }) =>
					(body as { q: string }).q === 'xyzzy' ? { items: [] } : placeSearch,
			}
		);
		const field = searchField();
		fireEvent.change(field, { target: { value: 'trubarjeva' } });
		const [first, second] = await screen.findAllByRole('option');
		expect(field.getAttribute('aria-expanded')).toBe('true');
		expect(field.getAttribute('aria-activedescendant')).toBe(first!.id);
		expect(screen.getByRole('link', { name: /Surveying and Mapping Authority/ }).getAttribute('target')).toBe(
			'_blank'
		);

		fireEvent.keyDown(field, { key: 'ArrowDown' });
		expect(field.getAttribute('aria-activedescendant')).toBe(second!.id);
		fireEvent.keyDown(field, { key: 'Enter' });
		expect(screen.getByText('Trubarjeva cesta, Ljubljana')).toBeTruthy();
		expect((field as HTMLInputElement).value).toBe('');
		expect(field.getAttribute('aria-expanded')).toBe('false');

		fireEvent.change(field, { target: { value: 'xyzzy' } });
		expect(await screen.findByText(t.no_results)).toBeTruthy();
		fireEvent.keyDown(field, { key: 'Escape' });
		expect(screen.getByText(t.no_results).closest('[hidden]')).not.toBeNull();
	});

	it('Escape closes only the open results inside a dialog; a second Escape closes the dialog (AC#4)', async () => {
		const store = createApiStore(
			createMockApi({ 'POST /v1/geo/search': placeSearch, 'POST /v1/geo/reverse': placeReverse })
		);
		render(
			<Provider store={store}>
				<NextIntlClientProvider locale="en" messages={en}>
					<Dialog defaultOpen>
						<DialogContent closeLabel="Close" aria-describedby={undefined}>
							<DialogTitle>Picker</DialogTitle>
							<LocationPicker mode="lost" onChange={vi.fn()} variant="dialog" />
						</DialogContent>
					</Dialog>
				</NextIntlClientProvider>
			</Provider>
		);
		const field = searchField();
		field.focus();
		fireEvent.change(field, { target: { value: 'trubarjeva' } });
		await screen.findAllByRole('option');
		fireEvent.keyDown(field, { key: 'Escape' });
		expect(field.getAttribute('aria-expanded')).toBe('false');
		expect(screen.getByRole('dialog', { name: 'Picker' })).toBeTruthy();
		expect(document.activeElement).toBe(field);
		fireEvent.keyDown(field, { key: 'Escape' });
		await vi.waitFor(() => expect(screen.queryByRole('dialog', { name: 'Picker' })).toBeNull());
	});

	it('keeps the radius slider and the number in sync, warns from 3 km and sends the radius (AC#1, AC#4)', async () => {
		const onChange = renderPicker();
		const slider = screen.getByRole('slider', { name: t.radius_label });
		const number = screen.getByRole('spinbutton', { name: t.radius_number_label }) as HTMLInputElement;
		expect(slider.getAttribute('aria-valuetext')).toBe('Radius 500 m');
		expect(number.value).toBe('500');

		fireEvent.change(slider, { target: { value: '9' } });
		expect(slider.getAttribute('aria-valuetext')).toBe('Radius 3 km');
		expect(number.value).toBe('3000');
		expect(screen.getByText(t.radius_large_warning)).toBeTruthy();

		fireEvent.change(number, { target: { value: '1234' } });
		fireEvent.blur(number);
		expect(number.value).toBe('1000');
		expect(slider.getAttribute('aria-valuetext')).toBe('Radius 1 km');
		expect(screen.getByText(t.radius_help)).toBeTruthy();

		confirm();
		expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ radiusM: 1000 }));
	});

	it('uses the alert stops and copy, and has no radius for found and sighted', () => {
		renderPicker({ mode: 'alert' });
		expect(screen.getByRole('heading', { level: 1, name: t.title_alert })).toBeTruthy();
		const slider = screen.getByRole('slider', { name: t.alert_radius_label });
		expect(slider.getAttribute('aria-valuetext')).toBe('5 km');
		fireEvent.change(slider, { target: { value: '9' } });
		expect(slider.getAttribute('aria-valuetext')).toBe('25 km');
		expect(screen.getByText(t.privacy_alert)).toBeTruthy();
		expect(screen.getByRole('button', { name: t.save_area })).toBeTruthy();

		cleanup();
		renderPicker({ mode: 'found' });
		expect(screen.queryByRole('slider')).toBeNull();
		expect(screen.queryByTestId('picker-disc')).toBeNull();
		expect(screen.getByText(t.privacy_found)).toBeTruthy();
	});

	it('zooms and moves the map by 100 m from its buttons (AC#4)', async () => {
		renderPicker({ mode: 'found' });
		await dragTo(SISKA);
		fireEvent.click(screen.getByRole('button', { name: t.zoom_in }));
		expect(engine.moveTo).toHaveBeenLastCalledWith(SISKA, 16);

		const toggle = screen.getByRole('button', { name: t.nudge_show });
		expect(toggle.getAttribute('aria-expanded')).toBe('false');
		fireEvent.click(toggle);
		expect(toggle.getAttribute('aria-expanded')).toBe('true');
		fireEvent.click(screen.getByRole('button', { name: t.nudge_north }));
		const [north] = engine.moveTo.mock.lastCall as [LatLng];
		expect(metres(north, SISKA)).toBeCloseTo(100, 0);
		expect(north.lat).toBeGreaterThan(SISKA.lat);
	});
});
