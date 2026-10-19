'use client';

import * as React from 'react';

import type { BBox, Circle, LatLng, MapViewProps, Marker } from '@/components/map/map-view';

const M_PER_DEG = 111_320;

/** The fuzzed area with a margin around it: 2.5 radii, at least 400 m each way (as on mobile). */
function areaBBox({ lat, lng, radius_m }: LatLng & { radius_m: number }): BBox {
	const span = Math.max(radius_m * 2.5, 400);
	const dLat = span / M_PER_DEG;
	const dLng = span / (M_PER_DEG * Math.cos((lat * Math.PI) / 180));
	return [lng - dLng, lat - dLat, lng + dLng, lat + dLat];
}

/** The map's box and its text alternative: until the map is due and while its code loads, so nothing shifts. */
function MapBox({ textAlternative }: Pick<MapViewProps, 'textAlternative'>) {
	return (
		<>
			<div data-slot="map-view" className="h-(--map-height) bg-map-land" />
			{textAlternative}
		</>
	);
}

// MapView is a chunk of its own and maplibre-gl another behind it (MapView's import()), so neither is in the page's
// first load (TASK-18.6). If the chunk cannot load (offline), the box and the area line stay.
const MapView = React.lazy<React.ComponentType<MapViewProps>>(() =>
	import('@/components/map/map-view').then(
		(m) => ({ default: m.MapView }),
		() => ({ default: MapBox })
	)
);

/**
 * P9 "Kje je bila videna" map: the public, fuzzed area (`PublicReport.area`) as the report's marker on its disc to
 * scale in the status hue, never a point. `own` is the owner's stored, coarsened point (`ReportOwnerView.location`),
 * passed only in the owner's own view and drawn as the "you" dot. MapLibre loads once the map is due (`useMapDue`).
 */
export function AreaMap({
	area,
	type,
	title,
	photoUrl,
	own,
	ownLabel,
	label,
	children,
}: {
	area: LatLng & { radius_m: number };
	type: 'lost' | 'found' | 'sighted';
	/** The report's title, the marker's accessible name. */
	title: string;
	photoUrl?: string;
	own?: LatLng;
	ownLabel: string;
	/** The map's accessible name: "Približno območje okoli kraja Šiška, polmer približno 500 m". */
	label: string;
	/** The text alternative under the map (area line, the owner's pin note). */
	children: React.ReactNode;
}) {
	const { lat, lng, radius_m } = area;
	const markers = React.useMemo<Marker[]>(
		() => [
			{ id: 'report', position: { lat, lng }, kind: type, label: title, photoUrl },
			...(own ? [{ id: 'own', position: own, kind: 'me' as const, label: ownLabel }] : []),
		],
		[lat, lng, type, title, photoUrl, own, ownLabel]
	);
	const circles = React.useMemo<Circle[]>(
		() => [{ id: 'area', center: { lat, lng }, radiusM: radius_m, kind: 'area', status: type }],
		[lat, lng, radius_m, type]
	);
	const initialView = React.useMemo(() => ({ bbox: areaBBox({ lat, lng, radius_m }) }), [lat, lng, radius_m]);
	const [box, due] = useMapDue();
	const placeholder = <MapBox textAlternative={children} />;

	return (
		<div
			ref={box}
			className="[--map-height:280px] lg:[--map-height:400px] [&>[data-slot=map-view]]:rounded-card [&>[data-slot=map-view]]:[clip-path:inset(0_round_var(--radius-card))]"
		>
			<React.Suspense fallback={placeholder}>
				{due ? (
					<MapView
						detail
						markers={markers}
						circles={circles}
						initialView={initialView}
						label={label}
						height="var(--map-height)"
						textAlternative={children}
					/>
				) : (
					placeholder
				)}
			</React.Suspense>
		</div>
	);
}

/**
 * The map is below the fold on phones, so MapLibre (its chunks, WebGL and tiles, about 300 KB of script) stays out of
 * the page's first load: it starts once the box is on screen, or within 400 px of it with the visitor's next scroll.
 * A visitor who reads the top of the page never pays for a map they do not see (TASK-18.6). Without
 * IntersectionObserver it starts at once.
 */
function useMapDue() {
	const ref = React.useRef<HTMLDivElement>(null);
	const [due, setDue] = React.useState(false);
	React.useEffect(() => {
		const box = ref.current;
		if (due) return;
		if (!box || typeof IntersectionObserver === 'undefined') {
			setDue(true);
			return;
		}
		let scroll: AbortController | undefined;
		const observer = new IntersectionObserver(
			([entry]) => {
				scroll?.abort();
				if (!entry?.isIntersecting) return;
				if (entry.boundingClientRect.top < window.innerHeight) {
					setDue(true);
					return;
				}
				scroll = new AbortController();
				window.addEventListener('scroll', () => setDue(true), {
					once: true,
					passive: true,
					signal: scroll.signal,
				});
			},
			{ rootMargin: '400px' }
		);
		observer.observe(box);
		return () => {
			observer.disconnect();
			scroll?.abort();
		};
	}, [due]);
	return [ref, due] as const;
}
