'use client';

import { WarningCircleIcon } from '@phosphor-icons/react/dist/ssr/WarningCircle';
import { useTranslations } from 'next-intl';
import * as React from 'react';
import { createPortal } from 'react-dom';

import type { MapMode } from '@zivali/tokens/map-style';
import { statusIcons } from '@/components/ui/status-label';
import { cn } from '@/lib/utils';

import type { MapEngine, MapItem } from './engine';
import type { BBox, Circle, InitialView, Marker, Path } from './map-data';

export type { BBox, Circle, InitialView, LatLng, Marker, Path } from './map-data';

type MapViewProps = {
	markers?: Marker[];
	cluster?: boolean;
	circles?: Circle[];
	paths?: Path[];
	initialView?: InitialView;
	/** Debounced 300 ms; also once after the first load. */
	onViewportChange?(bbox: BBox, zoom: number): void;
	onMarkerPress?(id: string): void;
	/** Required: the list for screen reader and keyboard users, rendered right after the map (the "Skip map" target). */
	textAlternative: React.ReactNode;
	height?: number | string;
	testID?: string;
};

const NONE: never[] = [];
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
 * Markers per system §9: photo avatar with a status ring (a status icon when there is no photo), lost reports on a
 * fuzzed-area disc, the "you" dot. The accessible name carries the status, so it is never colour alone.
 */
function MarkerFace({ marker, onPress }: { marker: Marker; onPress?: (id: string) => void }) {
	const t = useTranslations('map');
	const press = onPress && (() => onPress(marker.id));
	if (marker.kind === 'me')
		return (
			<span
				role="img"
				aria-label={marker.label}
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
				marker.kind === 'lost' && 'size-26 rounded-full bg-marker-area',
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
 * C6 MapView on MapLibre with the calm OpenFreeMap style in the map-* tokens. The map library loads on mount
 * (import()), never in a page's first load. Keyboard: Tab reaches "Skip map", then the map (arrows pan, + and -
 * zoom); markers are reached through `textAlternative`. Attribution sits bottom-right; a sheet over the map sets
 * `--map-attribution-bottom` on an ancestor to keep it clear. Pass memoised arrays: a new array redraws the data.
 */
export function MapView({
	markers = NONE,
	cluster = false,
	circles = NONE,
	paths = NONE,
	initialView,
	onViewportChange,
	onMarkerPress,
	textAlternative,
	height = '100%',
	testID,
}: MapViewProps) {
	const t = useTranslations('map');
	const tCommon = useTranslations('common');
	const id = React.useId();
	const container = React.useRef<HTMLDivElement>(null);
	const engine = React.useRef<MapEngine | null>(null);
	const [status, setStatus] = React.useState<'loading' | 'ready' | 'error'>('loading');
	const [items, setItems] = React.useState<MapItem[]>([]);
	const mode = useThemeMode();
	const data = React.useMemo(() => ({ markers, circles, paths, cluster }), [markers, circles, paths, cluster]);
	const byId = React.useMemo(() => new Map(markers.map((marker) => [marker.id, marker])), [markers]);
	const title = t('label');

	// Latest props for the one-time set-up below and for its callbacks.
	const latest = React.useRef({ data, mode, initialView, onViewportChange, title });
	React.useEffect(() => {
		latest.current = { data, mode, initialView, onViewportChange, title };
	});

	React.useEffect(() => {
		let cancelled = false;
		let created: MapEngine | undefined;
		import('./engine')
			.then(({ createMapEngine }) => {
				if (cancelled || !container.current) return;
				const { data, mode, initialView, title } = latest.current;
				created = createMapEngine({
					container: container.current,
					data,
					mode,
					initialView,
					title,
					describedBy: `${id}-hint`,
					onItems: setItems,
					onViewportChange: (bbox, zoom) => latest.current.onViewportChange?.(bbox, zoom),
					onError: () => setStatus('error'),
				});
				engine.current = created;
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
				<div ref={container} className="absolute inset-0" />
				<p id={`${id}-hint`} className="sr-only">
					{t('keyboard_hint')}
				</p>
				{status === 'loading' && (
					<p role="status" className="sr-only">
						{t('loading')}
					</p>
				)}
				{status === 'error' && (
					<div
						role="status"
						className="absolute inset-x-4 top-4 z-10 flex items-center gap-3 rounded-row bg-muted py-4 pr-4 pl-[18px] text-control leading-[22px] text-foreground"
					>
						<WarningCircleIcon
							weight="fill"
							aria-hidden="true"
							className="size-[22px] shrink-0 text-destructive"
						/>
						<p className="flex-1">{t('tiles_error')}</p>
					</div>
				)}
				<a
					href={OSM_COPYRIGHT}
					target="_blank"
					rel="noopener noreferrer"
					className="absolute right-2 bottom-[var(--map-attribution-bottom,8px)] z-10 flex min-h-11 max-w-[min(380px,calc(100%-16px))] items-center justify-end rounded-xl bg-card/88 px-2 py-1 text-right text-xs leading-4 text-foreground underline underline-offset-2 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring"
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
