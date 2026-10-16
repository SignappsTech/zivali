'use client';

import { WarningCircleIcon } from '@phosphor-icons/react/dist/ssr/WarningCircle';
import { useTranslations } from 'next-intl';
import * as React from 'react';
import { createPortal } from 'react-dom';

import type { MapMode } from '@zivali/tokens/map-style';
import { statusIcons } from '@/components/ui/status-label';
import { cn } from '@/lib/utils';

import type { MapEngine, MapItem } from './engine';
import type { BBox, CameraState, Circle, InitialView, LatLng, Marker, Path } from './map-data';

export type { BBox, CameraState, Circle, InitialView, LatLng, Marker, Path } from './map-data';

export type MapViewHandle = {
	/** Eases the camera to `center` (and `zoom`); instant under reduced motion. Before the map loads, it waits. */
	moveTo(center: LatLng, zoom?: number): void;
};

export type MapViewProps = {
	markers?: Marker[];
	/** Clusters report markers into count discs, from 25 of them (P4 "Many results"). */
	cluster?: boolean;
	circles?: Circle[];
	paths?: Path[];
	/** Default: all of Slovenia. */
	initialView?: InitialView;
	/** Detail maps (C6): keeps minor streets in the style. */
	detail?: boolean;
	/** Debounced 300 ms after the camera stops; also once after the first load. */
	onViewportChange?(bbox: BBox, zoom: number): void;
	/** The camera while it moves (`moving: true`) and once it stops; not debounced (LocationPicker's centre pin). */
	onCameraChange?(camera: CameraState): void;
	onMarkerPress?(id: string): void;
	/** Required: the list (or a sentence pointing to it) for screen reader and keyboard users, rendered right after
	 * the map; "Skip map" jumps to it. */
	textAlternative: React.ReactNode;
	/** The focusable map's accessible name; default `map.a11y_label` ("Map: 12 reports"). */
	label?: string;
	/** Its description; default `map.keyboard_hint` (arrows pan, + and - zoom). */
	hint?: string;
	height?: number | string;
	/** Px covered by an overlay along the bottom (a sheet); the attribution stays above it. */
	bottomInset?: number;
	testID?: string;
	/** Overlays over the map (the picker's centre pin, a preview popover), positioned by the caller; give purely
	 * visual ones `pointer-events-none`. */
	children?: React.ReactNode;
	ref?: React.Ref<MapViewHandle>;
};

const NONE: never[] = [];
const CLUSTER_FROM = 25;
const OSM_COPYRIGHT = 'https://www.openstreetmap.org/copyright';
const HALO = 'shadow-[0_0_0_3px_hsl(var(--marker-ring))]';
const RING = {
	lost: 'border-marker-lost text-marker-lost',
	found: 'border-marker-found text-marker-found',
	sighted: 'border-marker-sighted text-marker-sighted',
	reunited: 'border-marker-reunited text-marker-reunited',
};

// Light and dark follow the `dark` class on <html> (layout theme script, later the manual override).
function subscribeToTheme(onChange: () => void) {
	const observer = new MutationObserver(onChange);
	observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
	return () => observer.disconnect();
}
const themeMode = (): MapMode => (document.documentElement.classList.contains('dark') ? 'dark' : 'light');
const useThemeMode = () => React.useSyncExternalStore(subscribeToTheme, themeMode, () => 'light' as const);

/**
 * Markers per system §9: a 44 px photo avatar with a 3 px status ring (the status icon when there is no photo), lost
 * reports on a 96 px fuzzed-area disc, the 18 px "you" dot. The accessible name carries the status, so it is never
 * colour alone.
 */
function MarkerFace({ marker, onPress }: { marker: Marker; onPress?: (id: string) => void }) {
	const t = useTranslations('map');
	const press = onPress && (() => onPress(marker.id));
	if (marker.kind === 'me')
		return (
			<span
				role="img"
				aria-label={marker.label}
				data-kind="me"
				className={cn('block size-4.5 rounded-full bg-marker-me', HALO)}
			/>
		);

	const Icon = statusIcons[marker.kind];
	const avatar = cn(
		'box-content block size-11 rounded-full border-3 border-solid bg-marker-ring',
		RING[marker.kind],
		HALO
	);
	return (
		<span
			role="img"
			aria-label={marker.kind === 'lost' ? `${marker.label}. ${t('lost_area_a11y')}` : marker.label}
			data-kind={marker.kind}
			onClick={press}
			className={cn(
				'grid place-items-center',
				marker.kind === 'lost' && 'size-24 rounded-full bg-marker-area',
				press && 'cursor-pointer'
			)}
		>
			{marker.photoUrl ? (
				// eslint-disable-next-line @next/next/no-img-element -- a 44 px thumbnail inside a map marker
				<img src={marker.photoUrl} alt="" width={44} height={44} className={cn(avatar, 'object-cover')} />
			) : (
				<span className={cn(avatar, 'grid place-items-center')}>
					<Icon weight="fill" aria-hidden="true" className="size-6" />
				</span>
			)}
		</span>
	);
}

function ClusterFace({ count, onPress }: { count: number; onPress: () => void }) {
	const t = useTranslations('map');
	return (
		<span
			role="img"
			aria-label={t('cluster_a11y', { count })}
			data-kind="cluster"
			onClick={onPress}
			className={cn(
				'grid size-10 cursor-pointer place-items-center rounded-full bg-marker-cluster text-[15px] font-bold text-marker-cluster-foreground tabular-nums',
				HALO
			)}
		>
			<span aria-hidden="true">{count}</span>
		</span>
	);
}

/**
 * C6 MapView on MapLibre: the calm `buildMapStyle(mode)` OpenFreeMap map in the map-* tokens, light or dark with the
 * page. maplibre-gl, its CSS and its worker load on mount (`import()`), never in a page's first load.
 *
 * Privacy: it draws only what it is given. Report markers and circles take the public, fuzzed `PublicReport.area`
 * (lost reports always as an area disc, never a pin); the `me` dot is the caller's own position, which never leaves
 * the browser (only tile requests go out, to OpenFreeMap).
 *
 * Accessibility: Tab reaches "Skip map" (to `textAlternative`), then the map itself (arrows pan, + and - zoom);
 * markers are reached through `textAlternative`. The OpenFreeMap attribution is always visible, bottom-right, above
 * `bottomInset`. Renders two siblings: the map box (`height`, default 100 %) and the text alternative.
 *
 * Pass memoised arrays: a new array redraws the data.
 *
 * @example
 * const map = React.useRef<MapViewHandle>(null);
 * <MapView ref={map} cluster markers={markers} onMarkerPress={open} onViewportChange={load}
 *   textAlternative={<p>{t('map.text_alternative', { place })}</p>} />
 * map.current?.moveTo({ lat: 46.05, lng: 14.51 }, 14);
 */
export function MapView({
	markers = NONE,
	cluster = false,
	circles = NONE,
	paths = NONE,
	initialView,
	detail = false,
	onViewportChange,
	onCameraChange,
	onMarkerPress,
	textAlternative,
	label,
	hint,
	height = '100%',
	bottomInset = 0,
	testID,
	children,
	ref,
}: MapViewProps) {
	const t = useTranslations('map');
	const tCommon = useTranslations('common');
	const id = React.useId().replace(/[^\w-]/g, '');
	const container = React.useRef<HTMLDivElement>(null);
	const engine = React.useRef<MapEngine | null>(null);
	const pendingMove = React.useRef<[LatLng, number?]>(undefined);
	const [status, setStatus] = React.useState<'loading' | 'ready' | 'error'>('loading');
	const [items, setItems] = React.useState<MapItem[]>([]);
	const mode = useThemeMode();
	const reports = React.useMemo(() => markers.filter((marker) => marker.kind !== 'me').length, [markers]);
	const clustered = cluster && reports >= CLUSTER_FROM;
	const data = React.useMemo(
		() => ({ markers, circles, paths, cluster: clustered }),
		[markers, circles, paths, clustered]
	);
	const byId = React.useMemo(() => new Map(markers.map((marker) => [marker.id, marker])), [markers]);
	const name = label ?? t('a11y_label', { count: reports });

	// Latest props for the one-time set-up below and its callbacks.
	const latest = React.useRef({ data, mode, name, initialView, detail, onViewportChange, onCameraChange });
	React.useEffect(() => {
		latest.current = { data, mode, name, initialView, detail, onViewportChange, onCameraChange };
	});

	React.useEffect(() => {
		let cancelled = false;
		let created: MapEngine | undefined;
		import('./engine')
			.then(({ createMapEngine }) => {
				if (cancelled || !container.current) return;
				const { data, mode, name, initialView, detail } = latest.current;
				created = createMapEngine({
					container: container.current,
					data,
					mode,
					detail,
					initialView,
					label: name,
					describedBy: `${id}-hint`,
					onItems: setItems,
					onViewportChange: (bbox, zoom) => latest.current.onViewportChange?.(bbox, zoom),
					onCameraChange: (camera) => latest.current.onCameraChange?.(camera),
					onFailed: (failed) => setStatus(failed ? 'error' : 'ready'),
				});
				engine.current = created;
				if (pendingMove.current) created.moveTo(...pendingMove.current);
				setStatus((current) => (current === 'loading' ? 'ready' : current));
			})
			// The chunk did not load (offline) or WebGL is missing: the list still has every report.
			.catch(() => !cancelled && setStatus('error'));
		return () => {
			cancelled = true;
			created?.destroy();
			engine.current = null;
		};
	}, [id]);

	React.useEffect(() => engine.current?.setData(data), [data]);
	React.useEffect(() => engine.current?.setMode(mode), [mode]);
	React.useEffect(() => engine.current?.setLabel(name), [name]);
	React.useImperativeHandle(
		ref,
		() => ({
			moveTo(center, zoom) {
				if (engine.current) engine.current.moveTo(center, zoom);
				else pendingMove.current = [center, zoom];
			},
		}),
		[]
	);

	return (
		<>
			<div
				data-testid={testID}
				data-slot="map-view"
				data-state={status}
				className="relative overflow-hidden bg-map-land"
				style={{ height }}
			>
				<a
					href={`#${id}-alt`}
					className="sr-only z-20 items-center rounded-full bg-card px-4.5 font-bold text-card-foreground shadow-md focus:not-sr-only focus:absolute focus:top-6 focus:left-6 focus:inline-flex focus:min-h-11 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring"
				>
					{tCommon('skip_map')}
				</a>
				{/* The canvas MapLibre puts in here is the focusable map; the ring sits inside the clipped box. */}
				<div
					ref={container}
					className="absolute inset-0 [&_canvas]:outline-none [&_canvas:focus-visible]:outline-3 [&_canvas:focus-visible]:-outline-offset-3 [&_canvas:focus-visible]:outline-ring"
				/>
				<p id={`${id}-hint`} className="sr-only">
					{hint ?? t('keyboard_hint')}
				</p>
				{children}
				<div role="status" className="absolute inset-x-4 top-4 z-10">
					{status === 'loading' && <span className="sr-only">{t('loading')}</span>}
					{status === 'error' && (
						<p className="flex items-center gap-3 rounded-row bg-muted py-4 pr-4 pl-[18px] text-control text-foreground">
							<WarningCircleIcon
								weight="fill"
								aria-hidden="true"
								className="size-[22px] shrink-0 text-destructive"
							/>
							<span className="flex-1">{t('tiles_error')}</span>
						</p>
					)}
				</div>
				<a
					href={OSM_COPYRIGHT}
					target="_blank"
					rel="noopener noreferrer"
					className="absolute right-2 z-10 flex min-h-11 max-w-[min(380px,calc(100%-16px))] items-center justify-end rounded-sm bg-card/88 px-2 py-1 text-right text-xs text-foreground underline underline-offset-2 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring"
					style={{ bottom: bottomInset + 8 }}
				>
					{t('attribution')}
					<span className="sr-only"> {tCommon('opens_new_tab')}</span>
				</a>
				{items.map((item) => {
					if (item.cluster) {
						const clusterId = item.cluster.id;
						return createPortal(
							<ClusterFace
								count={item.cluster.count}
								onPress={() => engine.current?.zoomToCluster(clusterId)}
							/>,
							item.element,
							item.key
						);
					}
					const marker = byId.get(item.id);
					return (
						marker &&
						createPortal(<MarkerFace marker={marker} onPress={onMarkerPress} />, item.element, item.key)
					);
				})}
			</div>
			<div id={`${id}-alt`} tabIndex={-1} className="outline-none">
				{textAlternative}
			</div>
		</>
	);
}
