import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { createTranslator, NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { placeReverse } from '@zivali/api/__fixtures__/geocode';
import { publicReport } from '@zivali/api/__fixtures__/reports';
import { createMockApi, mockError, type MockRequest, type MockRoutes } from '@zivali/api/mock';
import { type ApiStore, createApiStore } from '@zivali/api/rtk';
import { formatRelative } from '@zivali/i18n/format';
import sl from '@zivali/i18n/dist/sl.json';
import type { MapReport, PublicReport } from '@zivali/types';
import type { MapViewProps } from '@/components/map/map-view';
import { StoreProvider } from '@/components/store-provider';

import { Browse } from './browse';
import { ReportList } from './report-list';

// The store runs over the in-memory API; MapLibre needs WebGL, so MapView is a stand-in that draws its markers as
// buttons (a marker press is mouse and touch only on the real map).
const stores = vi.hoisted(() => ({ current: undefined as ApiStore | undefined }));
vi.mock('@/lib/store', () => ({ getStore: () => stores.current }));
const map = vi.hoisted(() => ({ props: undefined as MapViewProps | undefined }));
vi.mock('@/components/map/map-view', () => ({
	MapView: (props: MapViewProps) => {
		map.props = props;
		return (
			<div data-testid="map">
				{props.markers?.map((marker) => (
					<button key={marker.id} type="button" onClick={() => props.onMarkerPress?.(marker.id)}>
						{marker.label}
					</button>
				))}
				{props.children}
				{props.textAlternative}
			</div>
		);
	},
}));
// The page's search params follow history.replaceState, as in Next.js.
const nav = vi.hoisted(() => ({ push: vi.fn(), listeners: new Set<() => void>() }));
vi.mock('next/navigation', async (actual) => {
	const { useSyncExternalStore } = await import('react');
	const subscribe = (listener: () => void) => {
		nav.listeners.add(listener);
		return () => void nav.listeners.delete(listener);
	};
	return {
		...(await actual()),
		useRouter: () => ({ push: nav.push, replace: vi.fn(), prefetch: vi.fn() }),
		usePathname: () => '/zemljevid',
		useParams: () => ({ locale: 'sl' }),
		useSearchParams: () => new URLSearchParams(useSyncExternalStore(subscribe, () => window.location.search)),
	};
});

const NOW = new Date('2026-10-16T09:41:00Z');
const EVENT = '2026-10-16T07:30:00Z';
const TIME = formatRelative(EVENT, 'sl', NOW);
const SLOVENIA = '13.38,45.42,16.61,46.88';
const t = sl.browse;
const replaceState = window.history.replaceState.bind(window.history);

const report = (n: number, extra: Partial<PublicReport> = {}): PublicReport => ({
	...publicReport,
	id: `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`,
	short_code: `Code${n}`,
	event_at: EVENT,
	...extra,
});
const pin = (r: PublicReport): MapReport => ({
	id: r.id,
	short_code: r.short_code,
	type: r.type,
	species: r.species,
	area: r.area,
	boosted: r.boosted,
	thumb_url: r.photos[0]?.thumb_url ?? null,
});
const maks = report(1, { type: 'lost', name: 'Maks', boosted: true });
const three = [maks, report(2), report(3, { type: 'sighted', species: 'cat' })];
const byType = (reports: PublicReport[], query: Record<string, string>) =>
	reports.filter((r) => !query.types || query.types.split(',').includes(r.type));

/** Renders the page body at `/zemljevid{search}`; GET /v1/reports pages `pageSize` at a time by an offset cursor. */
function renderBrowse(
	reports: PublicReport[],
	{ search = '', pageSize = 20, routes = {} }: { search?: string; pageSize?: number; routes?: MockRoutes } = {}
) {
	replaceState(null, '', `/zemljevid${search}`);
	const api = createMockApi({
		'GET /v1/reports': ({ query }) => {
			const start = Number(query.cursor ?? 0);
			const items = byType(reports, query);
			const end = start + pageSize;
			return {
				items: items.slice(start, end),
				next_cursor: end < items.length ? String(end) : null,
				total_estimate: items.length,
			};
		},
		'GET /v1/reports/map': ({ query }) => ({ items: byType(reports, query).map(pin) }),
		'POST /v1/geo/reverse': placeReverse,
		...routes,
	});
	stores.current = createApiStore(api);
	render(
		<NextIntlClientProvider locale="sl" messages={sl} timeZone="Europe/Ljubljana">
			<StoreProvider>
				<Browse />
			</StoreProvider>
		</NextIntlClientProvider>
	);
	return api;
}

const queries = (api: { calls: MockRequest[] }, path: string) =>
	api.calls.filter((call) => call.path === path).map((call) => call.query);
const rows = () => screen.queryAllByRole('link').filter((link) => link.getAttribute('href')?.startsWith('/r/'));

function stubWide(wide: boolean) {
	window.matchMedia = ((query: string) => ({
		matches: wide && query.includes('min-width'),
		addEventListener: () => {},
		removeEventListener: () => {},
	})) as unknown as typeof window.matchMedia;
}

beforeEach(() => {
	vi.useFakeTimers({ now: NOW, toFake: ['Date'] });
	vi.spyOn(window.history, 'replaceState').mockImplementation((...args) => {
		replaceState(...args);
		nav.listeners.forEach((listener) => listener());
	});
});
afterEach(() => {
	cleanup();
	vi.useRealTimers();
	vi.restoreAllMocks();
	nav.push.mockClear();
	for (const key of ['matchMedia'] as const) Reflect.deleteProperty(window, key);
	for (const key of ['permissions', 'geolocation'] as const) Reflect.deleteProperty(navigator, key);
});

describe('Browse (P4 web)', () => {
	it('lists the reports in the API order, boosted first with its pill, and counts them with SL plurals (AC#2, AC#4)', async () => {
		const api = renderBrowse(three);
		expect(await screen.findByText('3 prijave')).toBeTruthy();
		const links = rows();
		expect(links.map((link) => link.getAttribute('aria-label'))).toEqual([
			`Maks, Izgubljena, ${TIME}`,
			`Najden pes, Najdena, ${TIME}`,
			`Opažena mačka, Opažena, ${TIME}`,
		]);
		expect(links.map((link) => link.getAttribute('href'))).toEqual(['/r/Code1', '/r/Code2', '/r/Code3']);
		expect(within(links[0]!).getByText(t.boosted)).toBeTruthy();
		expect(within(links[1]!).queryByText(t.boosted)).toBeNull();
		// Closed reports stay out by default; without a location the area is Slovenia, newest first.
		const [list] = queries(api, '/v1/reports');
		expect(list).toMatchObject({ sort: 'recent', limit: '20' });
		expect(list).not.toHaveProperty('include_closed');
		expect(queries(api, '/v1/reports/map')[0]).toMatchObject({ bbox: SLOVENIA });
		// The same three are on the map, named for the list.
		expect(map.props?.markers?.map((marker) => marker.label)).toEqual([
			'Izgubljen pes, Izgubljena',
			'Najden pes, Najdena',
			'Opažena mačka, Opažena',
		]);
		expect(
			screen.getByText('Zemljevid prijav v okolici kraja Slovenija. Vse prijave so naštete v seznamu.')
		).toBeTruthy();

		const tr = createTranslator({ locale: 'sl', messages: sl, namespace: 'browse' });
		expect([1, 2, 3, 5, 101, 102].map((count) => tr('count', { count }))).toEqual([
			'1 prijava',
			'2 prijavi',
			'3 prijave',
			'5 prijav',
			'101 prijava',
			'102 prijavi',
		]);
	});

	it('takes the filters from the URL for both the list and the map, and summarises them (AC#3)', async () => {
		const api = renderBrowse(three, { search: '?type=lost&species=dog&when=24h&km=5&colour=black&size=small' });
		expect(await screen.findByText('1 prijava')).toBeTruthy();
		const narrowed = {
			types: 'lost',
			species: 'dog',
			colours: 'black',
			sizes: 'xs,s',
			from: '2026-10-15T09:00:00.000Z',
		};
		expect(queries(api, '/v1/reports')[0]).toMatchObject(narrowed);
		expect(queries(api, '/v1/reports/map')[0]).toMatchObject({ ...narrowed, bbox: SLOVENIA });
		expect(screen.getByText('Izgubljene · psi · zadnjih 24 ur · 5 km')).toBeTruthy();
	});

	it('applies the drawer with its live count and writes the URL; closing applies nothing (AC#3)', async () => {
		const api = renderBrowse([...three, report(4, { type: 'lost' })]);
		expect(await screen.findByText('4 prijave')).toBeTruthy();

		fireEvent.click(screen.getByRole('button', { name: t.filters_button }));
		let drawer = screen.getByRole('dialog', { name: t.filters_title });
		const found = within(drawer).getByRole('button', { name: t.filter_type_found });
		expect(found.getAttribute('aria-pressed')).toBe('true');
		fireEvent.click(found);
		expect(found.getAttribute('aria-pressed')).toBe('false');
		// The count of the draft, announced politely (SL few, then dual).
		await within(drawer).findByRole('button', { name: 'Prikaži 3 prijave' });
		expect(within(drawer).getByText('Najdene so 3 prijave').getAttribute('role')).toBe('status');
		fireEvent.click(within(drawer).getByRole('button', { name: t.filter_type_sighted }));
		await within(drawer).findByRole('button', { name: 'Prikaži 2 prijavi' });
		expect(within(drawer).getByText('Najdeni sta 2 prijavi')).toBeTruthy();
		fireEvent.click(within(drawer).getByRole('button', { name: 'Prikaži 2 prijavi' }));

		expect(window.location.search).toBe('?type=lost');
		expect(await screen.findByText('2 prijavi')).toBeTruthy();
		expect(screen.getByText('Izgubljene · psi in mačke · zadnjih 7 dni · 10 km')).toBeTruthy();
		await waitFor(() => expect(queries(api, '/v1/reports').at(-1)).toMatchObject({ types: 'lost' }));
		expect(rows()).toHaveLength(2);

		// A change that is closed without "Prikaži" is dropped.
		fireEvent.click(screen.getByRole('button', { name: t.filters_button }));
		drawer = screen.getByRole('dialog', { name: t.filters_title });
		fireEvent.click(within(drawer).getByRole('radio', { name: t.filter_24h }));
		fireEvent.click(within(drawer).getByRole('button', { name: t.filters_close }));
		expect(window.location.search).toBe('?type=lost');
	});

	it('shows closed reports only after "Pokaži zaključene …" (AC#4)', async () => {
		const api = renderBrowse(three);
		fireEvent.click(await screen.findByRole('button', { name: t.show_closed }));
		expect(window.location.search).toBe('?closed=1');
		await waitFor(() => expect(queries(api, '/v1/reports').at(-1)).toMatchObject({ include_closed: 'true' }));
		expect(await screen.findByRole('button', { name: t.hide_closed })).toBeTruthy();
	});

	it('pages 20 at a time and moves the focus to the first new row (AC#2)', async () => {
		const many = Array.from({ length: 25 }, (_, i) => report(i + 1));
		const api = renderBrowse(many);
		await screen.findByText('25 prijav');
		expect(rows()).toHaveLength(20);
		expect(screen.queryByRole('button', { name: t.show_closed })).toBeNull();

		fireEvent.click(screen.getByRole('button', { name: t.load_more }));
		await waitFor(() => expect(rows()).toHaveLength(25));
		expect(queries(api, '/v1/reports').at(-1)).toMatchObject({ cursor: '20' });
		await waitFor(() => expect(document.activeElement).toBe(rows()[20]));
		expect(screen.queryByRole('button', { name: t.load_more })).toBeNull();
		expect(screen.getByRole('button', { name: t.show_closed })).toBeTruthy();
	});

	it('an empty region offers "Prijavi" and the alerts; with filters it offers "Ponastavi filtre" (AC#4)', async () => {
		renderBrowse([]);
		expect(await screen.findByRole('heading', { name: t.empty_title })).toBeTruthy();
		expect(screen.getByText('0 prijav')).toBeTruthy();
		const buttons = screen.getAllByRole('button', { name: t.empty_primary });
		// The header's report choices: the sheet below md, the popover from md.
		expect(buttons.map((button) => button.getAttribute('popovertarget'))).toEqual([null, 'report-menu']);
		expect(screen.getByRole('link', { name: t.empty_secondary }).getAttribute('href')).toBe('/racun/opozorila');
		cleanup();

		renderBrowse([report(5)], { search: '?type=sighted' });
		expect(await screen.findByText(t.no_match)).toBeTruthy();
		expect(screen.queryByRole('heading', { name: t.empty_title })).toBeNull();
		fireEvent.click(screen.getByRole('button', { name: t.no_match_action }));
		expect(window.location.search).toBe('');
	});

	it('says when the reports cannot load and tries again (P4 error)', async () => {
		let fail = true;
		renderBrowse(three, {
			routes: {
				'GET /v1/reports': () =>
					fail
						? mockError('RATE_LIMITED')
						: { items: three, next_cursor: null, total_estimate: three.length },
			},
		});
		expect((await screen.findByRole('alert')).textContent).toContain(t.error);
		fail = false;
		fireEvent.click(screen.getByRole('button', { name: t.error_action }));
		await waitFor(() => expect(rows()).toHaveLength(3));
		expect(screen.queryByRole('alert')).toBeNull();
	});

	it('centres on a granted browser location, rounded in requests and never in the page URL (C6)', async () => {
		Object.defineProperty(navigator, 'permissions', {
			configurable: true,
			value: { query: async () => ({ state: 'granted' }) },
		});
		Object.defineProperty(navigator, 'geolocation', {
			configurable: true,
			value: {
				getCurrentPosition: (ok: PositionCallback) =>
					ok({ coords: { latitude: 46.05123, longitude: 14.50678 } } as GeolocationPosition),
			},
		});
		const api = renderBrowse(three);
		expect(
			await screen.findByText(
				'Zemljevid prijav v okolici kraja Šiška, Ljubljana. Vse prijave so naštete v seznamu.'
			)
		).toBeTruthy();
		expect(queries(api, '/v1/reports')[0]).toMatchObject({ near: '46.05,14.51,10', sort: 'distance' });
		expect(queries(api, '/v1/reports/map')[0]).toMatchObject({ bbox: '14.37,45.96,14.64,46.15' });
		expect(api.calls.find((call) => call.path === '/v1/geo/reverse')?.body).toEqual({ lat: 46.05, lng: 14.51 });
		// The rows carry the distance band; the area pill names the place.
		await waitFor(() =>
			expect(rows()[0]?.getAttribute('aria-label')).toBe(`Maks, Izgubljena, ${TIME}, manj kot 1 km`)
		);
		expect(screen.getByRole('button', { name: 'Območje: Šiška, Ljubljana, 10 km. Odpri filtre' })).toBeTruthy();

		fireEvent.click(screen.getAllByRole('button', { name: `${t.sort_label}: ${t.sort_nearest}` })[0]!);
		expect(window.location.search).toBe('?sort=recent');
		await waitFor(() => expect(queries(api, '/v1/reports').at(-1)).toMatchObject({ sort: 'recent' }));
		expect(window.location.href).not.toMatch(/46\.05|14\.5/);
	});

	it('from lg a marker press opens its preview and selects its row; below lg it opens the report', async () => {
		stubWide(true);
		renderBrowse(three);
		await screen.findByText('3 prijave');
		fireEvent.mouseEnter(rows()[1]!);
		expect(map.props?.highlightId).toBe('Code2');
		fireEvent.mouseLeave(rows()[1]!);

		fireEvent.click(screen.getByRole('button', { name: 'Izgubljen pes, Izgubljena' }));
		const preview = screen.getByRole('dialog', { name: 'Maks' });
		expect(within(preview).getByRole('link', { name: sl.map.preview_open }).getAttribute('href')).toBe('/r/Code1');
		expect(within(preview).getByText(TIME)).toBeTruthy();
		expect(rows()[0]?.hasAttribute('data-selected')).toBe(true);
		expect(map.props?.highlightId).toBe('Code1');
		fireEvent.keyDown(document, { key: 'Escape' });
		expect(screen.queryByRole('dialog', { name: 'Maks' })).toBeNull();
		cleanup();

		stubWide(false);
		renderBrowse(three);
		await screen.findByText('3 prijave');
		fireEvent.click(screen.getByRole('button', { name: 'Izgubljen pes, Izgubljena' }));
		expect(nav.push.mock.calls[0]?.[0]).toBe('/r/Code1');
		expect(screen.queryByRole('dialog')).toBeNull();
	});
});

describe('ReportList', () => {
	it('exposes the ad insertion point after every 8 rows, never first (AC#4)', () => {
		const reports = Array.from({ length: 17 }, (_, i) => report(i + 1));
		render(
			<NextIntlClientProvider locale="sl" messages={sl} timeZone="Europe/Ljubljana">
				<ReportList
					reports={reports}
					center={null}
					isLoading={false}
					isError={false}
					onRetry={() => {}}
					filtered={false}
					onResetFilters={() => {}}
					includeClosed={false}
					onIncludeClosedChange={() => {}}
					hasNextPage={false}
					isFetchingNextPage={false}
					onLoadMore={() => {}}
					renderAd={(slot) => <aside>Ad {slot.index}</aside>}
				/>
			</NextIntlClientProvider>
		);
		const items = screen.getAllByRole('listitem').map((item) => item.textContent ?? '');
		expect(items.findIndex((text) => text === 'Ad 0')).toBe(8);
		expect(items.findIndex((text) => text === 'Ad 1')).toBe(17);
		expect(items).toHaveLength(19);
	});
});
