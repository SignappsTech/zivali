import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import * as React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import en from '@zivali/i18n/dist/en.json';

import type { MapItem } from './engine';
import { type Marker, MapView, type MapViewHandle, type MapViewProps } from './map-view';

// MapLibre needs WebGL, which jsdom lacks: the engine is a spy, and each test drives its callbacks.
type Options = Parameters<typeof import('./engine').createMapEngine>[0];
const engine = vi.hoisted(() => ({
	options: undefined as Options | undefined,
	setData: vi.fn(),
	setMode: vi.fn(),
	setLabel: vi.fn(),
	moveTo: vi.fn(),
	zoomToCluster: vi.fn(),
	destroy: vi.fn(),
	fail: false,
}));
vi.mock('./engine', () => ({
	createMapEngine: (options: Options) => {
		if (engine.fail) throw new Error('no WebGL');
		engine.options = options;
		return engine;
	},
}));

beforeEach(() => {
	vi.clearAllMocks();
	engine.options = undefined;
	engine.fail = false;
});
afterEach(cleanup);

const report = (id: string, kind: Marker['kind'], extra: Partial<Marker> = {}): Marker => ({
	id,
	position: { lat: 46.05, lng: 14.5 },
	kind,
	label: `${id}, ${kind}`,
	...extra,
});
const markers = [report('maks', 'lost', { photoUrl: '/maks.webp' }), report('mici', 'found'), report('me', 'me')];

function renderMap(props: Partial<MapViewProps> = {}, ref?: React.Ref<MapViewHandle>) {
	const view = (extra: Partial<MapViewProps>) => (
		<NextIntlClientProvider locale="en" messages={en}>
			<MapView
				ref={ref}
				markers={markers}
				textAlternative={<p>Map of reports around Ljubljana. All reports are listed in the list.</p>}
				{...props}
				{...extra}
			/>
		</NextIntlClientProvider>
	);
	const result = render(view({}));
	return { ...result, update: (extra: Partial<MapViewProps>) => result.rerender(view(extra)) };
}

/** Waits for the dynamic import and the engine set-up. */
async function ready() {
	await vi.waitFor(() => expect(engine.options).toBeDefined());
	return engine.options!;
}

/** The engine reports what is on screen: one element per marker, cluster or "you" dot. */
function show(options: Options, items: Array<{ id: string } | { cluster: { id: number; count: number } }>) {
	const shown = items.map((item) => {
		const element = document.createElement('div');
		options.container.append(element);
		return { ...item, key: JSON.stringify(item), element } as MapItem;
	});
	act(() => options.onItems(shown));
}

describe('MapView', () => {
	it('puts "Skip map" first, the text alternative right after the map and the attribution on the map (AC#3)', async () => {
		const { container } = renderMap();
		const skip = screen.getByRole('link', { name: 'Skip map' });
		const alternative = screen.getByText(/All reports are listed in the list/).parentElement!;
		expect(skip.getAttribute('href')).toBe(`#${alternative.id}`);
		expect(alternative.tabIndex).toBe(-1);
		const map = container.querySelector('[data-slot=map-view]')!;
		expect(map.nextElementSibling).toBe(alternative);
		expect(map.firstElementChild).toBe(skip);

		const attribution = screen.getByRole('link', { name: /© OpenFreeMap © OpenMapTiles/ });
		expect(attribution).toHaveProperty('href', 'https://www.openstreetmap.org/copyright');
		expect(attribution.getAttribute('target')).toBe('_blank');
		expect(attribution.textContent).toContain('(opens in a new tab)');
		expect(map.contains(attribution)).toBe(true);
		expect(attribution.style.bottom).toBe('8px');
		await ready();
	});

	it('keeps the attribution above a bottom overlay', async () => {
		renderMap({ bottomInset: 240 });
		expect(screen.getByRole('link', { name: /OpenFreeMap/ }).style.bottom).toBe('248px');
		await ready();
	});

	it('names the focusable map by its report count and describes its keys', async () => {
		const { update } = renderMap();
		const options = await ready();
		expect(options.label).toBe('Map: 2 reports');
		expect(document.getElementById(options.describedBy)?.textContent).toBe(
			'Move the map with the arrow keys, zoom in with + and out with −.'
		);
		update({ markers: markers.slice(1) });
		expect(engine.setLabel).toHaveBeenLastCalledWith('Map: 1 report');
		update({ label: 'Location', hint: 'The pin is in the centre of the map.' });
		expect(engine.setLabel).toHaveBeenLastCalledWith('Location');
		expect(document.getElementById(options.describedBy)?.textContent).toBe('The pin is in the centre of the map.');
	});

	it('draws the highlighted marker larger (P4: its row is hovered or its preview open)', async () => {
		const { update } = renderMap({ highlightId: 'mici' });
		show(await ready(), [{ id: 'maks' }, { id: 'mici' }]);
		const face = (name: string) => screen.getByRole('img', { name: new RegExp(`^${name}`) });
		expect(face('mici').hasAttribute('data-highlighted')).toBe(true);
		expect(face('maks').hasAttribute('data-highlighted')).toBe(false);
		update({ highlightId: undefined });
		expect(face('mici').hasAttribute('data-highlighted')).toBe(false);
	});

	it('clusters only from 25 report markers (P4 "Many results")', async () => {
		const many = Array.from({ length: 24 }, (_, index) => report(`r${index}`, 'found'));
		const { update } = renderMap({ cluster: true, markers: [...many, report('me', 'me')] });
		expect((await ready()).data.cluster).toBe(false);
		const more = [...many, report('r24', 'sighted')];
		update({ markers: more });
		expect(engine.setData).toHaveBeenLastCalledWith(expect.objectContaining({ markers: more, cluster: true }));
	});

	it('draws avatars with a status ring, lost reports on an area disc, the "you" dot and count discs (AC#2)', async () => {
		const onMarkerPress = vi.fn();
		renderMap({ onMarkerPress, cluster: true });
		const options = await ready();
		show(options, [{ id: 'maks' }, { id: 'mici' }, { id: 'me' }, { cluster: { id: 7, count: 12 } }]);

		const lost = screen.getByRole('img', { name: 'maks, lost. Approximate area where the pet was last seen' });
		expect(lost.dataset.kind).toBe('lost');
		expect(lost.className).toContain('bg-marker-area');
		expect(lost.querySelector('img')?.getAttribute('src')).toBe('/maks.webp');
		expect(lost.querySelector('img')?.className).toContain('border-marker-lost');

		// No photo: the status icon in the ring, so the status is never colour alone.
		const found = screen.getByRole('img', { name: 'mici, found' });
		expect(found.className).not.toContain('bg-marker-area');
		expect(found.querySelector('.border-marker-found svg')).not.toBeNull();

		expect(screen.getByRole('img', { name: 'me, me' }).className).toContain('bg-marker-me');

		const cluster = screen.getByRole('img', { name: '12 reports in this area. Zoom in' });
		fireEvent.click(cluster);
		expect(engine.zoomToCluster).toHaveBeenCalledWith(7);

		fireEvent.click(found);
		expect(onMarkerPress).toHaveBeenCalledWith('mici');
	});

	it('announces loading, then shows the tile error over the map until a tile loads', async () => {
		renderMap();
		expect(screen.getByRole('status').textContent).toBe('Loading the map …');
		const options = await ready();
		await vi.waitFor(() => expect(screen.getByRole('status').textContent).toBe(''));

		act(() => options.onFailed(true));
		expect(screen.getByRole('status').textContent).toBe('The map cannot load right now. Reports are in the list.');
		act(() => options.onFailed(false));
		expect(screen.getByRole('status').textContent).toBe('');
	});

	it('shows the error when the map cannot start (no WebGL), and the list stays', async () => {
		engine.fail = true;
		renderMap();
		expect(await screen.findByText('The map cannot load right now. Reports are in the list.')).toBeDefined();
		expect(screen.getByText(/All reports are listed in the list/)).toBeDefined();
	});

	it('moves the camera through its ref, also when called before the map is ready', async () => {
		const ref = React.createRef<MapViewHandle>();
		renderMap({}, ref);
		ref.current!.moveTo({ lat: 46.06, lng: 14.51 }, 15);
		await ready();
		expect(engine.moveTo).toHaveBeenCalledWith({ lat: 46.06, lng: 14.51 }, 15);
		ref.current!.moveTo({ lat: 46.5, lng: 15.6 });
		expect(engine.moveTo).toHaveBeenLastCalledWith({ lat: 46.5, lng: 15.6 }, undefined);
	});

	it('passes camera and viewport changes to the latest callbacks and cleans up on unmount', async () => {
		const first = vi.fn();
		const onCameraChange = vi.fn();
		const onViewportChange = vi.fn();
		const { update, unmount } = renderMap({ onCameraChange: first });
		const options = await ready();
		update({ onCameraChange, onViewportChange });
		const camera = { center: { lat: 46, lng: 14.5 }, zoom: 12, moving: true };
		options.onCameraChange(camera);
		options.onViewportChange([14, 45.9, 15, 46.1], 12);
		expect(first).not.toHaveBeenCalled();
		expect(onCameraChange).toHaveBeenCalledWith(camera);
		expect(onViewportChange).toHaveBeenCalledWith([14, 45.9, 15, 46.1], 12);
		unmount();
		expect(engine.destroy).toHaveBeenCalled();
	});

	it('starts in Slovenia by default, light, with the calm style unless it is a detail map', async () => {
		renderMap();
		const options = await ready();
		expect(options).toMatchObject({ initialView: undefined, mode: 'light', detail: false });
		cleanup();
		engine.options = undefined;
		document.documentElement.classList.add('dark');
		renderMap({ detail: true, initialView: { center: { lat: 46, lng: 14.5 }, zoom: 14 } });
		expect(await ready()).toMatchObject({ mode: 'dark', detail: true, initialView: { zoom: 14 } });
		document.documentElement.classList.remove('dark');
		await vi.waitFor(() => expect(engine.setMode).toHaveBeenLastCalledWith('light'));
	});
});
