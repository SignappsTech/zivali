import {
	Camera,
	type CameraRef,
	type CircleLayerSpecification,
	GeoJSONSource,
	type GeoJSONSourceRef,
	Layer,
	type LngLat,
	Map as MapLibreMap,
	type PressEventWithFeatures,
	type ViewStateChangeEvent,
} from '@maplibre/maplibre-react-native';
import { useColorScheme } from 'nativewind';
import * as React from 'react';
import {
	AccessibilityInfo,
	type DimensionValue,
	Linking,
	type NativeSyntheticEvent,
	Pressable,
	ScrollView,
	View,
} from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { useTranslations } from 'use-intl';

import { buildMapStyle } from '@zivali/tokens/map-style';
import { colors, component, motion } from '@zivali/tokens/values';
import {
	type BBox,
	type Circle,
	circleFeatures,
	type LatLng,
	type Marker,
	markerFeatures,
	type Path,
	pathFeatures,
} from '@/components/map/features';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

export type { BBox, Circle, LatLng, Marker, Path };

export type MapViewProps = {
	markers?: Marker[];
	cluster?: boolean;
	circles?: Circle[];
	paths?: Path[];
	initialView?: { center: LatLng; zoom: number } | { bbox: BBox };
	/** Debounced 300 ms after the map stops moving. */
	onViewportChange?(bbox: BBox, zoom: number): void;
	onMarkerPress?(id: string): void;
	/** The list for screen reader and switch users: activating the map shows it in place of the map. */
	textAlternative: React.ReactNode;
	height?: number | string;
	/** Mobile only: px covered by an overlay at the bottom (the list sheet); the attribution stays above it. */
	bottomInset?: number;
	testID?: string;
	/** LocationPicker: the camera while it moves (`moving`) and once it stops, not debounced. */
	onCameraChange?(camera: CameraState): void;
	/** LocationPicker: the map element's accessible name and hint (default "Zemljevid: n prijav", "Pokaži seznam"). */
	label?: string;
	hint?: string;
	/** Drawn over the map and under the list (the picker's centre pin); give it `pointerEvents="none"`. */
	children?: React.ReactNode;
	ref?: React.Ref<MapViewHandle>;
};

export type CameraState = { center: LatLng; zoom: number; moving: boolean };
export type MapViewHandle = {
	/** Eases the camera to `center` (and `zoom`), at once under reduced motion. */
	moveTo(center: LatLng, zoom?: number): void;
};

const SLOVENIA: BBox = [13.38, 45.42, 16.61, 46.88];
// P4 "Many results": markers cluster once there are 25 of them.
const CLUSTER_FROM = 25;
const VIEWPORT_DEBOUNCE_MS = 300;
const OSM_COPYRIGHT = 'https://www.openstreetmap.org/copyright';
const FONT = ['Noto Sans Bold']; // a glyph stack the OpenFreeMap style serves
const { avatar, 'avatar-ring': ring, area, cluster: clusterSize } = component.marker;

type Palette = (typeof colors)['light' | 'dark'];
type Kind = Exclude<Marker['kind'], 'me'>;
type Color = NonNullable<CircleLayerSpecification['paint']>['circle-color'];
type Pressed = { properties?: Record<string, unknown> | null; geometry?: { coordinates?: LngLat } };

/** A colour per report kind, read from the feature (lost, found, sighted; anything else is reunited). */
const byKind = (pick: (kind: Kind) => string): Color => [
	'match',
	['get', 'kind'],
	'lost',
	pick('lost'),
	'found',
	pick('found'),
	'sighted',
	pick('sighted'),
	pick('reunited'),
];

/**
 * C6 MapView on MapLibre Native (dev build): the calm `buildMapStyle` map with system §9 markers drawn as native
 * layers, so hundreds stay smooth. Found and sighted: a 44 px disc with a 3 px status ring and a 3 px halo; lost: the
 * same on a 96 px `marker-area` disc (a fuzzed area, never a pin); clusters: 40 px count discs (tap zooms in); "you":
 * an 18 px dot, only when the caller passes a `me` marker. Circles are to-scale area discs. Positions are the public
 * points the API returns; this component never reads the device location. The map is one accessible element whose
 * activation swaps in `textAlternative`; the OpenFreeMap attribution sits bottom-right above `bottomInset`.
 */
export function MapView({
	markers = [],
	cluster = false,
	circles = [],
	paths = [],
	initialView = { bbox: SLOVENIA },
	onViewportChange,
	onMarkerPress,
	textAlternative,
	height,
	bottomInset = 0,
	testID,
	onCameraChange,
	label,
	hint,
	children,
	ref,
}: MapViewProps) {
	const t = useTranslations('map');
	const { colorScheme } = useColorScheme();
	const mode = colorScheme === 'dark' ? 'dark' : 'light';
	const c: Palette = colors[mode];
	const reduceMotion = useReducedMotion();
	const [failed, setFailed] = React.useState(false);
	const [listOpen, setListOpen] = React.useState(false);

	const camera = React.useRef<CameraRef>(null);
	const source = React.useRef<GeoJSONSourceRef>(null);
	const mapRef = React.useRef<React.ComponentRef<typeof View>>(null);
	const closeRef = React.useRef<React.ComponentRef<typeof View>>(null);
	const timer = React.useRef<ReturnType<typeof setTimeout>>(undefined);
	React.useEffect(() => () => clearTimeout(timer.current), []);

	// Screen reader focus follows the swap: to "Show map" when the list opens, back to the map when it closes.
	const opened = React.useRef(false);
	React.useEffect(() => {
		if (!listOpen && !opened.current) return;
		opened.current = true;
		const target = listOpen ? closeRef.current : mapRef.current;
		if (target) AccessibilityInfo.sendAccessibilityEvent(target, 'focus');
	}, [listOpen]);

	const mapStyle = React.useMemo(() => buildMapStyle(mode), [mode]);
	const reports = React.useMemo(() => markers.filter((m) => m.kind !== 'me'), [markers]);
	const reportData = React.useMemo(() => markerFeatures(reports), [reports]);
	const meData = React.useMemo(() => markerFeatures(markers.filter((m) => m.kind === 'me')), [markers]);
	const circleData = React.useMemo(() => circleFeatures(circles), [circles]);
	const pathData = React.useMemo(() => pathFeatures(paths), [paths]);
	const clustered = cluster && reports.length >= CLUSTER_FROM;
	// Alert and home areas are `primary` at the token's area alpha (system §9).
	const areaAlpha = c['marker-area'].slice(7);

	React.useImperativeHandle(
		ref,
		() => ({
			moveTo: (center, zoom) =>
				camera.current?.easeTo({
					center: [center.lng, center.lat],
					...(zoom !== undefined && { zoom }),
					duration: reduceMotion ? 0 : motion.duration.slow,
					easing: 'ease',
				}),
		}),
		[reduceMotion]
	);

	const cameraChange = (moving: boolean) => (event: NativeSyntheticEvent<ViewStateChangeEvent>) => {
		if (!onCameraChange) return;
		const { center, zoom } = event.nativeEvent;
		onCameraChange({ center: { lng: center[0], lat: center[1] }, zoom, moving });
	};
	const onCameraMove = cameraChange(true);
	const onCameraStop = cameraChange(false);

	const onRegionDidChange = (event: NativeSyntheticEvent<ViewStateChangeEvent>) => {
		onCameraStop(event);
		if (!onViewportChange) return;
		const { bounds, zoom } = event.nativeEvent;
		clearTimeout(timer.current);
		timer.current = setTimeout(() => onViewportChange(bounds, zoom), VIEWPORT_DEBOUNCE_MS);
	};

	const onReportPress = async (event: NativeSyntheticEvent<PressEventWithFeatures>) => {
		const feature = event.nativeEvent.features[0] as Pressed | undefined;
		const props = feature?.properties;
		if (!props) return;
		if (!props.cluster) return onMarkerPress?.(String(props.id));
		const center = feature.geometry?.coordinates;
		try {
			const zoom = await source.current?.getClusterExpansionZoom(Number(props.cluster_id));
			if (center && zoom !== undefined)
				camera.current?.easeTo({
					center,
					zoom,
					duration: reduceMotion ? 0 : motion.duration.slow,
					easing: 'ease',
				});
		} catch {
			// The cluster changed under the tap (data refresh); the next tap works on the new one.
		}
	};

	return (
		<View
			testID={testID}
			className={cn('overflow-hidden', height === undefined && 'flex-1')}
			// P4 loading: the map area is `map-land` until the tiles draw.
			style={{ height: height as DimensionValue | undefined, backgroundColor: c['map-land'] }}
		>
			<View
				ref={mapRef}
				accessible
				role="button"
				aria-label={label ?? t('a11y_label', { count: reports.length })}
				accessibilityHint={hint ?? t('list_show')}
				aria-expanded={listOpen}
				aria-hidden={listOpen}
				accessibilityActions={[{ name: 'activate' }]}
				onAccessibilityAction={() => setListOpen(true)}
				className="flex-1"
			>
				<MapLibreMap
					testID="map-native"
					importantForAccessibility="no-hide-descendants"
					accessibilityElementsHidden
					mapStyle={mapStyle}
					attribution={false}
					logo={false}
					compass={false}
					touchRotate={false}
					touchPitch={false}
					onRegionWillChange={onCameraChange && onCameraMove}
					onRegionIsChanging={onCameraChange && onCameraMove}
					onRegionDidChange={onRegionDidChange}
					onDidFinishLoadingMap={() => setFailed(false)}
					onDidFailLoadingMap={() => setFailed(true)}
				>
					<Camera
						ref={camera}
						initialViewState={
							'bbox' in initialView
								? { bounds: initialView.bbox }
								: { center: [initialView.center.lng, initialView.center.lat], zoom: initialView.zoom }
						}
					/>
					<GeoJSONSource id="circles" data={circleData}>
						<Layer
							id="circles-fill"
							type="fill"
							paint={{
								'fill-color': [
									'match',
									['get', 'kind'],
									'alert',
									`${c.primary}${areaAlpha}`,
									c['marker-area'],
								],
							}}
						/>
					</GeoJSONSource>
					<GeoJSONSource id="paths" data={pathData}>
						<Layer
							id="paths-line"
							type="line"
							filter={['==', ['geometry-type'], 'LineString']}
							layout={{ 'line-cap': 'round', 'line-join': 'round' }}
							paint={{ 'line-color': c['marker-sighted'], 'line-width': ring }}
						/>
						<Layer
							id="paths-stop"
							type="circle"
							filter={['==', ['geometry-type'], 'Point']}
							paint={{
								'circle-radius': 7,
								'circle-color': c['marker-sighted'],
								'circle-stroke-width': ring,
								'circle-stroke-color': c['marker-ring'],
							}}
						/>
						<Layer
							id="paths-number"
							type="symbol"
							filter={['has', 'n']}
							layout={{
								'text-field': ['to-string', ['get', 'n']],
								'text-font': FONT,
								'text-size': 13,
								'text-offset': [0, -1.5],
								'text-allow-overlap': true,
							}}
							paint={{
								'text-color': c.foreground,
								'text-halo-color': c['marker-ring'],
								'text-halo-width': 2,
							}}
						/>
					</GeoJSONSource>
					<GeoJSONSource
						key={clustered ? 'clustered' : 'flat'}
						ref={source}
						id="reports"
						data={reportData}
						cluster={clustered}
						onPress={onReportPress}
					>
						<Layer
							id="reports-lost-area"
							type="circle"
							filter={['all', ['!', ['has', 'point_count']], ['==', ['get', 'kind'], 'lost']]}
							paint={{ 'circle-radius': area / 2, 'circle-color': c['marker-area'] }}
						/>
						<Layer
							id="reports-halo"
							type="circle"
							filter={['!', ['has', 'point_count']]}
							paint={{ 'circle-radius': avatar / 2 + 2 * ring, 'circle-color': c['marker-ring'] }}
						/>
						<Layer
							id="reports-avatar"
							type="circle"
							filter={['!', ['has', 'point_count']]}
							paint={{
								'circle-radius': avatar / 2,
								'circle-color': byKind((kind) => c[`status-${kind}-subtle`]),
								'circle-stroke-width': ring,
								'circle-stroke-color': byKind((kind) => c[`marker-${kind}`]),
							}}
						/>
						<Layer
							id="reports-cluster"
							type="circle"
							filter={['has', 'point_count']}
							paint={{
								'circle-radius': clusterSize / 2,
								'circle-color': c['marker-cluster'],
								'circle-stroke-width': ring,
								'circle-stroke-color': c['marker-ring'],
							}}
						/>
						<Layer
							id="reports-cluster-count"
							type="symbol"
							filter={['has', 'point_count']}
							layout={{
								'text-field': ['get', 'point_count_abbreviated'],
								'text-font': FONT,
								'text-size': 15,
								'text-allow-overlap': true,
								'text-ignore-placement': true,
							}}
							paint={{ 'text-color': c['marker-cluster-foreground'] }}
						/>
					</GeoJSONSource>
					<GeoJSONSource id="me" data={meData}>
						<Layer
							id="me-dot"
							type="circle"
							paint={{
								'circle-radius': 9,
								'circle-color': c['marker-me'],
								'circle-stroke-width': ring,
								'circle-stroke-color': c['marker-ring'],
							}}
						/>
					</GeoJSONSource>
				</MapLibreMap>
				{children}
			</View>

			{failed && !listOpen && (
				<View pointerEvents="none" className="absolute inset-x-5 top-1/3 items-center">
					<View className="rounded-row bg-card px-4 py-3">
						<Text aria-live="polite" className="text-center">
							{t('tiles_error')}
						</Text>
					</View>
				</View>
			)}

			{listOpen ? (
				<View className="absolute inset-0 bg-card">
					<View className="px-5 pt-2">
						<Button
							ref={closeRef}
							variant="text"
							className="-ml-3 self-start"
							onPress={() => setListOpen(false)}
						>
							{t('list_hide')}
						</Button>
					</View>
					<ScrollView
						contentContainerClassName="px-5"
						contentContainerStyle={{ paddingBottom: bottomInset + 16 }}
					>
						{textAlternative}
					</ScrollView>
				</View>
			) : (
				// OpenFreeMap attribution (content map.attribution): small, bottom-right, one 44 px link, never covered.
				<Pressable
					role="link"
					onPress={() => void Linking.openURL(OSM_COPYRIGHT).catch(() => undefined)}
					className="absolute right-2 min-h-11 max-w-[232px] justify-center rounded-sm bg-card/[.88] px-2 py-1"
					style={{ bottom: bottomInset + 8 }}
				>
					<Text className="text-right text-xs text-foreground underline">{t('attribution')}</Text>
				</Pressable>
			)}
		</View>
	);
}
