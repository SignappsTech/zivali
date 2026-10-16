// MapLibre side of MapView. Only map-view.tsx imports this module, and only through import(), so maplibre-gl, its CSS
// and its worker load on pages that show a map, never in another page's first load.
import 'maplibre-gl/dist/maplibre-gl.css';
import {
	type FillLayerSpecification,
	type GeoJSONSource,
	Map as MapLibre,
	Marker as GLMarker,
	setWorkerUrl,
	type StyleSpecification,
} from 'maplibre-gl';

import { buildMapStyle, type MapMode } from '@zivali/tokens/map-style';
import { colors } from '@zivali/tokens/values';

import {
	type BBox,
	type CameraState,
	type Circle,
	circleFeatures,
	type InitialView,
	type LatLng,
	type Marker,
	markerFeatures,
	type Path,
	pathFeatures,
	SLOVENIA,
} from './map-data';

// v6 looks for its worker next to its own module URL, which the bundle rewrites; the bundler emits the worker from
// this reference as a same-origin file (CSP worker-src 'self', proxy.ts).
setWorkerUrl(new URL('maplibre-gl/dist/maplibre-gl-worker.mjs', import.meta.url).href);

/** A marker, cluster or "you" dot on the map: MapView renders its face into `element` (a React portal). */
export type MapItem = { key: string; element: HTMLElement } & (
	{ id: string; cluster?: undefined } | { cluster: { id: number; count: number } }
);
export type MapData = { markers: Marker[]; circles: Circle[]; paths: Path[]; cluster: boolean };
export type MapEngine = {
	setData(data: MapData): void;
	setMode(mode: MapMode): void;
	setLabel(label: string): void;
	moveTo(center: LatLng, zoom?: number): void;
	zoomToCluster(clusterId: number): void;
	destroy(): void;
};
type EngineOptions = {
	container: HTMLElement;
	mode: MapMode;
	detail: boolean;
	initialView?: InitialView;
	data: MapData;
	/** Accessible name of the focusable canvas; `describedBy` is the id of its hint. */
	label: string;
	describedBy: string;
	onItems(items: MapItem[]): void;
	onViewportChange(bbox: BBox, zoom: number): void;
	onCameraChange(camera: CameraState): void;
	/** `true` while the base map cannot draw (style, sprite, glyphs or tiles failed before any tile loaded). */
	onFailed(failed: boolean): void;
};

const MARKERS = 'zz-markers';
const CIRCLES = 'zz-circles';
const PATHS = 'zz-paths';
const PATH_POINTS = 'zz-path-points';
// Count discs once markers sit closer than an avatar on a lost-area disc; none past street level.
const CLUSTER = { clusterRadius: 56, clusterMaxZoom: 15 };
const VIEWPORT_DEBOUNCE_MS = 300;

/** Area discs per system §9: status hue at `marker-area`'s alpha (0.16 light, 0.20 dark); alert areas `primary`. */
function areaPaint(mode: MapMode): FillLayerSpecification['paint'] {
	const c = colors[mode];
	return {
		'fill-color': [
			'match',
			['get', 'tone'],
			'alert',
			c.primary,
			'found',
			c['marker-found'],
			'sighted',
			c['marker-sighted'],
			c['marker-area'].slice(0, 7),
		],
		'fill-opacity': parseInt(c['marker-area'].slice(7, 9), 16) / 255,
	};
}

export function createMapEngine(options: EngineOptions): MapEngine {
	const { container, initialView, detail } = options;
	let data = options.data;
	let mode = options.mode;
	let debounce: ReturnType<typeof setTimeout> | undefined;
	let tileLoaded = false;

	const map = new MapLibre({
		container,
		style: buildMapStyle(mode, { detail }) as StyleSpecification,
		...(initialView && 'bbox' in initialView
			? { bounds: initialView.bbox, fitBoundsOptions: { padding: 32 } }
			: initialView
				? { center: [initialView.center.lng, initialView.center.lat], zoom: initialView.zoom }
				: { bounds: SLOVENIA }),
		// The attribution is MapView's own 44 px link (P4); no logo, no compact "i" button.
		attributionControl: false,
		locale: { 'Map.Title': options.label },
		// Calm map: north stays up.
		dragRotate: false,
		pitchWithRotate: false,
		touchPitch: false,
	});
	map.touchZoomRotate.disableRotation();
	map.keyboard.disableRotation();
	map.getCanvas().setAttribute('aria-describedby', options.describedBy);

	// Live HTML markers by key; "you" dots are never clustered and kept apart.
	const live = new globalThis.Map<string, { marker: GLMarker; item: MapItem; at: string }>();
	const me = new globalThis.Map<string, { marker: GLMarker; item: MapItem }>();
	const emit = () => options.onItems([...me.values(), ...live.values()].map((entry) => entry.item));

	/** Lost-area discs lie under avatars, clusters above them, the "you" dot on top. */
	function addMarker(lngLat: [number, number], layer: number) {
		const element = document.createElement('div');
		element.style.zIndex = String(layer);
		return { element, marker: new GLMarker({ element }).setLngLat(lngLat).addTo(map) };
	}

	/** Mirrors the clustered source's features (in loaded tiles) as HTML markers; only changes reach React. */
	function sync() {
		if (!map.getSource(MARKERS) || !map.isSourceLoaded(MARKERS)) return;
		const seen = new Set<string>();
		let changed = false;
		for (const feature of map.querySourceFeatures(MARKERS)) {
			const props = feature.properties as {
				id?: string;
				kind?: string;
				cluster?: boolean;
				cluster_id?: number;
				point_count?: number;
			};
			const key = props.cluster ? `c:${props.cluster_id}` : `m:${props.id}`;
			if (seen.has(key) || feature.geometry.type !== 'Point') continue;
			seen.add(key);
			const lngLat = feature.geometry.coordinates as [number, number];
			const at = `${lngLat}:${props.point_count ?? ''}`;
			const entry = live.get(key);
			if (entry?.at === at) continue;
			const { element, marker } = entry
				? { element: entry.item.element, marker: entry.marker.setLngLat(lngLat) }
				: addMarker(lngLat, props.cluster ? 2 : props.kind === 'lost' ? 0 : 1);
			const item: MapItem = props.cluster
				? { key, element, cluster: { id: props.cluster_id!, count: props.point_count! } }
				: { key, element, id: props.id! };
			live.set(key, { marker, item, at });
			changed = true;
		}
		for (const [key, entry] of live)
			if (!seen.has(key)) {
				entry.marker.remove();
				live.delete(key);
				changed = true;
			}
		if (changed) emit();
	}

	function setMe(markers: Marker[]) {
		for (const entry of me.values()) entry.marker.remove();
		me.clear();
		for (const marker of markers.filter((m) => m.kind === 'me')) {
			const added = addMarker([marker.position.lng, marker.position.lat], 3);
			me.set(marker.id, {
				marker: added.marker,
				item: { key: `me:${marker.id}`, element: added.element, id: marker.id },
			});
		}
	}

	/** Our sources and layers, again after every style load (a colour-mode switch reloads the style). */
	function addOverlays() {
		const c = colors[mode];
		const firstLabel = map.getStyle().layers.find((layer) => layer.type === 'symbol')?.id;
		const paths = pathFeatures(data.paths);
		map.addSource(CIRCLES, { type: 'geojson', data: circleFeatures(data.circles) });
		map.addLayer({ id: CIRCLES, type: 'fill', source: CIRCLES, paint: areaPaint(mode) }, firstLabel);
		map.addSource(PATHS, { type: 'geojson', data: paths.lines });
		map.addLayer({
			id: PATHS,
			type: 'line',
			source: PATHS,
			layout: { 'line-cap': 'round', 'line-join': 'round' },
			paint: { 'line-color': c['marker-sighted'], 'line-width': 3, 'line-opacity': 0.6 },
		});
		map.addSource(PATH_POINTS, { type: 'geojson', data: paths.points });
		// Sighting dots, 14 px with a 3 px ring (system §9); numbered points grow to fit the number.
		map.addLayer({
			id: PATH_POINTS,
			type: 'circle',
			source: PATH_POINTS,
			paint: {
				'circle-radius': ['case', ['==', ['get', 'n'], ''], 7, 11],
				'circle-color': c['marker-sighted'],
				'circle-stroke-width': 3,
				'circle-stroke-color': c['marker-ring'],
			},
		});
		map.addLayer({
			id: `${PATH_POINTS}-n`,
			type: 'symbol',
			source: PATH_POINTS,
			filter: ['!=', ['get', 'n'], ''],
			layout: {
				'text-field': ['get', 'n'],
				'text-font': ['Noto Sans Bold'],
				'text-size': 13,
				'text-allow-overlap': true,
			},
			paint: { 'text-color': c['marker-ring'] },
		});
		map.addSource(MARKERS, {
			type: 'geojson',
			data: markerFeatures(data.markers),
			cluster: data.cluster,
			...CLUSTER,
		});
		// Invisible: makes MapLibre tile the source, so sync() can read its features and clusters.
		map.addLayer({
			id: MARKERS,
			type: 'circle',
			source: MARKERS,
			paint: { 'circle-radius': 0, 'circle-opacity': 0 },
		});
	}

	map.on('style.load', () => {
		for (const entry of live.values()) entry.marker.remove();
		live.clear();
		addOverlays();
		emit();
	});
	map.on('render', sync);

	const camera = (moving: boolean): CameraState => {
		const { lng, lat } = map.getCenter();
		return { center: { lat, lng }, zoom: map.getZoom(), moving };
	};
	const viewport = () => {
		clearTimeout(debounce);
		debounce = setTimeout(() => {
			const bounds = map.getBounds();
			options.onViewportChange(
				[bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()],
				map.getZoom()
			);
		}, VIEWPORT_DEBOUNCE_MS);
	};
	map.once('load', viewport);
	map.on('move', () => options.onCameraChange(camera(true)));
	map.on('moveend', () => {
		options.onCameraChange(camera(false));
		viewport();
	});

	// One failed tile is not a broken map: only errors before the first base-map tile count, and a later tile (back
	// online, panned) clears them. MapView then shows map.tiles_error over the map; the list works either way.
	map.on('error', () => {
		if (!tileLoaded) options.onFailed(true);
	});
	map.on('data', (event) => {
		if (tileLoaded || event.dataType !== 'source' || !event.tile || event.sourceId.startsWith('zz-')) return;
		tileLoaded = true;
		options.onFailed(false);
	});
	setMe(data.markers);

	return {
		setData(next) {
			const clusterChanged = next.cluster !== data.cluster;
			data = next;
			setMe(next.markers);
			emit();
			const markers = map.getSource<GeoJSONSource>(MARKERS);
			if (!markers) return; // style still loading: addOverlays() reads `data`
			const paths = pathFeatures(next.paths);
			map.getSource<GeoJSONSource>(CIRCLES)?.setData(circleFeatures(next.circles));
			map.getSource<GeoJSONSource>(PATHS)?.setData(paths.lines);
			map.getSource<GeoJSONSource>(PATH_POINTS)?.setData(paths.points);
			markers.setData(markerFeatures(next.markers));
			if (clusterChanged) void markers.setClusterOptions({ cluster: next.cluster, ...CLUSTER });
		},
		setMode(next) {
			if (next === mode) return;
			mode = next;
			map.setStyle(buildMapStyle(mode, { detail }) as StyleSpecification, { diff: false });
		},
		setLabel(label) {
			map.getCanvas().setAttribute('aria-label', label);
		},
		// MapLibre makes eases instant under prefers-reduced-motion.
		moveTo(center, zoom) {
			map.easeTo({ center: [center.lng, center.lat], ...(zoom !== undefined && { zoom }) });
		},
		zoomToCluster(clusterId) {
			const source = map.getSource<GeoJSONSource>(MARKERS);
			const entry = live.get(`c:${clusterId}`);
			if (!source || !entry) return;
			source
				.getClusterExpansionZoom(clusterId)
				.then((zoom) => map.easeTo({ center: entry.marker.getLngLat(), zoom }))
				// The cluster changed under the click (new data); the next click works on the new one.
				.catch(() => undefined);
		},
		destroy() {
			clearTimeout(debounce);
			map.remove();
		},
	};
}
