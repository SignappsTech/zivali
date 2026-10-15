import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { colorScheme } from 'nativewind';
import { Linking, Text } from 'react-native';
import { IntlProvider } from 'use-intl';

import sl from '@zivali/i18n/dist/sl.json';
import { buildMapStyle } from '@zivali/tokens/map-style';
import { colors } from '@zivali/tokens/values';
import DevMapScreen from '@/app/dev/map';
import { circlePolygon, type Marker } from '@/components/map/features';
import { MapView, type MapViewProps } from '@/components/map/map-view';
import { seedMarkers } from '@/components/map/seed';
import { distanceKm } from '@/lib/geo';

jest.mock('@/lib/env', () => ({ env: { EXPO_PUBLIC_APP_ENV: 'local' } }));

const { __refs: refs } = jest.requireMock<{
	__refs: { camera: { easeTo: jest.Mock }; source: { getClusterExpansionZoom: jest.Mock } };
}>('@maplibre/maplibre-react-native');

const markers: Marker[] = [
	{ id: 'r1', position: { lat: 46.05, lng: 14.5 }, kind: 'lost', label: 'Maks, Izgubljena' },
	{ id: 'r2', position: { lat: 46.06, lng: 14.51 }, kind: 'found', label: 'Najdena mačka, Najdena' },
	{ id: 'r3', position: { lat: 46.07, lng: 14.52 }, kind: 'sighted', label: 'Opažen pes, Opažena' },
	{ id: 'me', position: { lat: 46.04, lng: 14.49 }, kind: 'me', label: 'Vi' },
];

const ui = (props: Partial<MapViewProps> = {}) => (
	<IntlProvider locale="sl" messages={sl}>
		<MapView markers={markers} textAlternative={<Text>Seznam prijav</Text>} {...props} />
	</IntlProvider>
);

// The native map is hidden from the accessibility tree (the wrapper is the one accessible element), so the queries
// for its parts include hidden elements.
const hidden = (testID: string) => screen.getByTestId(testID, { includeHiddenElements: true });
type Data = { features: { geometry: { coordinates: unknown }; properties: Record<string, unknown> }[] };
const data = (id: string) => hidden(`GeoJSONSource:${id}`).props.data as Data;
const paint = (id: string) => hidden(`Layer:${id}`).props.paint as Record<string, unknown>;
const native = () => hidden('map-native');
const pressEvent = (properties: object, coordinates = [14.5, 46.05]) => ({
	nativeEvent: { features: [{ properties, geometry: { coordinates } }] },
});

afterEach(async () => {
	jest.useRealTimers();
	await act(async () => colorScheme.set('light'));
});

describe('MapView', () => {
	it('draws the calm token style and the public points, with "you" apart from the reports', async () => {
		await render(ui());
		expect(native().props.mapStyle).toEqual(buildMapStyle('light'));
		expect(
			data('reports').features.map((f) => [f.properties.id, f.properties.kind, f.geometry.coordinates])
		).toEqual([
			['r1', 'lost', [14.5, 46.05]],
			['r2', 'found', [14.51, 46.06]],
			['r3', 'sighted', [14.52, 46.07]],
		]);
		expect(data('me').features.map((f) => f.properties.id)).toEqual(['me']);
		// The native attribution, logo and compass are off: the attribution is our own link (map.attribution).
		expect(native().props).toMatchObject({ attribution: false, logo: false, compass: false });
	});

	it('styles markers per system §9: lost on an area disc, status rings, clusters and the "you" dot', async () => {
		await render(ui());
		const c = colors.light;
		expect(paint('reports-lost-area')).toEqual({ 'circle-radius': 48, 'circle-color': c['marker-area'] });
		expect(hidden('Layer:reports-lost-area').props.filter).toEqual([
			'all',
			['!', ['has', 'point_count']],
			['==', ['get', 'kind'], 'lost'],
		]);
		expect(paint('reports-halo')).toEqual({ 'circle-radius': 28, 'circle-color': c['marker-ring'] });
		expect(paint('reports-avatar')).toMatchObject({
			'circle-radius': 22,
			'circle-stroke-width': 3,
			'circle-stroke-color': [
				'match',
				['get', 'kind'],
				'lost',
				c['marker-lost'],
				'found',
				c['marker-found'],
				'sighted',
				c['marker-sighted'],
				c['marker-reunited'],
			],
		});
		expect(paint('reports-cluster')).toMatchObject({ 'circle-radius': 20, 'circle-color': c['marker-cluster'] });
		expect(paint('me-dot')).toMatchObject({ 'circle-radius': 9, 'circle-color': c['marker-me'] });
	});

	it('follows dark mode', async () => {
		await render(ui());
		await act(async () => colorScheme.set('dark'));
		expect(native().props.mapStyle).toEqual(buildMapStyle('dark'));
		expect(paint('reports-cluster')['circle-color']).toBe(colors.dark['marker-cluster']);
	});

	it('clusters from 25 markers when asked, and 500 seeded markers go into one native source', async () => {
		const { rerender } = await render(ui({ markers: seedMarkers(24), cluster: true }));
		expect(hidden('GeoJSONSource:reports').props.cluster).toBe(false);
		await rerender(ui({ markers: seedMarkers(500), cluster: true }));
		expect(hidden('GeoJSONSource:reports').props.cluster).toBe(true);
		expect(data('reports').features).toHaveLength(500);
		expect(screen.getByRole('button', { name: 'Zemljevid: 500 prijav' })).toBeOnTheScreen();
	});

	it('passes a marker press on and zooms into a pressed cluster', async () => {
		const onMarkerPress = jest.fn();
		await render(ui({ onMarkerPress }));
		const reports = hidden('GeoJSONSource:reports');
		await act(() => reports.props.onPress(pressEvent({ id: 'r2', kind: 'found' })));
		expect(onMarkerPress).toHaveBeenCalledWith('r2');

		await act(() =>
			reports.props.onPress(pressEvent({ cluster: true, cluster_id: 7, point_count: 30 }, [14.6, 46.1]))
		);
		expect(refs.source.getClusterExpansionZoom).toHaveBeenCalledWith(7);
		expect(refs.camera.easeTo).toHaveBeenCalledWith(expect.objectContaining({ center: [14.6, 46.1], zoom: 14 }));
		expect(onMarkerPress).toHaveBeenCalledTimes(1);
	});

	it('reports the viewport once the map has been still for 300 ms', async () => {
		jest.useFakeTimers();
		const onViewportChange = jest.fn();
		await render(ui({ onViewportChange }));
		const moved = (zoom: number) => ({ nativeEvent: { bounds: [14.4, 46, 14.6, 46.1], zoom } });
		await act(async () => native().props.onRegionDidChange(moved(12)));
		await act(async () => jest.advanceTimersByTime(200));
		await act(async () => native().props.onRegionDidChange(moved(13)));
		await act(async () => jest.advanceTimersByTime(299));
		expect(onViewportChange).not.toHaveBeenCalled();
		await act(async () => jest.advanceTimersByTime(1));
		expect(onViewportChange).toHaveBeenCalledTimes(1);
		expect(onViewportChange).toHaveBeenCalledWith([14.4, 46, 14.6, 46.1], 13);
	});

	it('is one accessible element whose activation swaps in the text alternative, and back', async () => {
		await render(ui());
		const map = screen.getByRole('button', { name: 'Zemljevid: 3 prijave' });
		expect(map.props.accessibilityHint).toBe('Pokaži seznam');
		expect(screen.queryByText('Seznam prijav')).toBeNull();

		await fireEvent(map, 'accessibilityAction', { nativeEvent: { actionName: 'activate' } });
		expect(screen.getByText('Seznam prijav')).toBeOnTheScreen();
		await fireEvent.press(screen.getByRole('button', { name: 'Pokaži zemljevid' }));
		expect(screen.queryByText('Seznam prijav')).toBeNull();
		expect(screen.getByRole('button', { name: 'Zemljevid: 3 prijave' })).toBeOnTheScreen();
	});

	it('keeps the attribution visible bottom-right above the sheet and links to the OSM copyright page', async () => {
		const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
		await render(ui({ bottomInset: 342 }));
		const link = screen.getByRole('link', {
			name: '© OpenFreeMap © OpenMapTiles, podatki © sodelavci OpenStreetMap',
		});
		expect(link).toHaveStyle({ bottom: 350 });
		await fireEvent.press(link);
		expect(openURL).toHaveBeenCalledWith('https://www.openstreetmap.org/copyright');
	});

	it('says so when the tiles cannot load', async () => {
		await render(ui());
		await act(async () => native().props.onDidFailLoadingMap());
		expect(screen.getByText('Zemljevida ta trenutek ni mogoče naložiti. Prijave so v seznamu.')).toBeOnTheScreen();
		await act(async () => native().props.onDidFinishLoadingMap());
		expect(screen.queryByText(/Zemljevida ta trenutek/)).toBeNull();
	});

	it('draws circles to scale and alert areas in primary at the area alpha', async () => {
		await render(ui({ circles: [{ id: 'a', center: { lat: 46.05, lng: 14.5 }, radiusM: 1000, kind: 'alert' }] }));
		const [ring] = data('circles').features[0]!.geometry.coordinates as [number, number][][];
		expect(ring).toHaveLength(65);
		expect(ring![0]).toEqual(ring![64]);
		expect((paint('circles-fill')['fill-color'] as string[])[3]).toBe(`${colors.light.primary}29`);
	});
});

test('the dev map (/dev/map) clusters 500 seeded markers and shows the pressed one', async () => {
	await render(
		<IntlProvider locale="sl" messages={sl}>
			<DevMapScreen />
		</IntlProvider>
	);
	expect(data('reports').features).toHaveLength(500);
	expect(hidden('GeoJSONSource:reports').props.cluster).toBe(true);
	await act(() => hidden('GeoJSONSource:reports').props.onPress(pressEvent({ id: 'seed-7', kind: 'sighted' })));
	expect(screen.getByText('seed-7')).toBeOnTheScreen();
});

describe('circlePolygon', () => {
	it('puts every vertex at the radius', () => {
		const center = { lat: 46.05, lng: 14.5 };
		for (const [lng, lat] of circlePolygon(center, 2500)) {
			expect(distanceKm(center, { lat, lng })).toBeCloseTo(2.5, 2);
		}
	});
});
