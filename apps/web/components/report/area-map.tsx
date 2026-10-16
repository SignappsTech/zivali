'use client';

import * as React from 'react';

import { type BBox, type Circle, type LatLng, type Marker, MapView } from '@/components/map/map-view';

const M_PER_DEG = 111_320;

/** The fuzzed area with a margin around it: 2.5 radii, at least 400 m each way (as on mobile). */
function areaBBox({ lat, lng, radius_m }: LatLng & { radius_m: number }): BBox {
	const span = Math.max(radius_m * 2.5, 400);
	const dLat = span / M_PER_DEG;
	const dLng = span / (M_PER_DEG * Math.cos((lat * Math.PI) / 180));
	return [lng - dLng, lat - dLat, lng + dLng, lat + dLat];
}

/**
 * P9 "Kje je bila videna" map: the public, fuzzed area (`PublicReport.area`) as the report's marker on its disc to
 * scale in the status hue, never a point. `own` is the owner's stored, coarsened point (`ReportOwnerView.location`),
 * passed only in the owner's own view and drawn as the "you" dot. maplibre-gl loads on mount (MapView's import()).
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
	const [box, near] = useNearViewport();

	return (
		<div
			ref={box}
			className="[--map-height:280px] lg:[--map-height:400px] [&>[data-slot=map-view]]:rounded-card [&>[data-slot=map-view]]:[clip-path:inset(0_round_var(--radius-card))]"
		>
			{near ? (
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
				<>
					{/* The map's box until it is near the viewport, so nothing shifts when it mounts. */}
					<div data-slot="map-view" className="h-(--map-height) bg-map-land" />
					{children}
				</>
			)}
		</div>
	);
}

/**
 * The map sits below the fold, so MapLibre (its chunk, WebGL and tiles) starts only once the box comes within 400 px
 * of the viewport, keeping it out of the page's first load. Without IntersectionObserver it starts at once.
 */
function useNearViewport() {
	const ref = React.useRef<HTMLDivElement>(null);
	const [seen, setSeen] = React.useState(false);
	React.useEffect(() => {
		const box = ref.current;
		if (!box || typeof IntersectionObserver === 'undefined') {
			setSeen(true);
			return;
		}
		const observer = new IntersectionObserver(
			(entries) => {
				if (!entries.some((entry) => entry.isIntersecting)) return;
				setSeen(true);
				observer.disconnect();
			},
			{ rootMargin: '400px' }
		);
		observer.observe(box);
		return () => observer.disconnect();
	}, []);
	return [ref, seen] as const;
}
