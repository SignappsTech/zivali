// C6 shared map types (same names and props on web and mobile) and the GeoJSON the map engine draws from them.

export type LatLng = { lat: number; lng: number };
/** [west, south, east, north] */
export type BBox = [number, number, number, number];
export type MarkerKind = 'lost' | 'found' | 'sighted' | 'reunited' | 'me';
/**
 * `position` is the public point: for reports the centre of the fuzzed public circle (`PublicReport.area`), never an
 * exact point. `label` is the accessible name (`map.marker_a11y`). `photoUrl` (thumbnail) draws the photo avatar.
 */
export type Marker = {
	id: string;
	position: LatLng;
	kind: MarkerKind;
	label: string;
	boosted?: boolean;
	photoUrl?: string;
};
/** `status` picks the area hue (system §9): lost `marker-area` (default), found and sighted their marker hue. */
export type Circle = {
	id: string;
	center: LatLng;
	radiusM: number;
	kind: 'area' | 'alert';
	status?: 'lost' | 'found' | 'sighted';
};
export type Path = { id: string; points: LatLng[]; numbered?: boolean };
export type InitialView = { center: LatLng; zoom: number } | { bbox: BBox };

type Point = { type: 'Point'; coordinates: [number, number] };
type Feature<G, P> = { type: 'Feature'; geometry: G; properties: P };
type Collection<G, P> = { type: 'FeatureCollection'; features: Feature<G, P>[] };

/** Slovenia, for maps without an initial view. */
export const SLOVENIA: BBox = [13.38, 45.42, 16.61, 46.88];
const EARTH_RADIUS_M = 6_371_008.8;
const STEPS = 64;

const lngLat = ({ lat, lng }: LatLng): [number, number] => [lng, lat];

/** Report markers for the clustered source; the "you" dot is never clustered, so it is left out. */
export function markerFeatures(markers: Marker[]): Collection<Point, { id: string; kind: MarkerKind }> {
	return {
		type: 'FeatureCollection',
		features: markers
			.filter((marker) => marker.kind !== 'me')
			.map((marker) => ({
				type: 'Feature',
				geometry: { type: 'Point', coordinates: lngLat(marker.position) },
				properties: { id: marker.id, kind: marker.kind },
			})),
	};
}

/** Circles to scale: a 64-sided polygon `radiusM` metres around the (public) centre. */
export function circleFeatures(
	circles: Circle[]
): Collection<{ type: 'Polygon'; coordinates: [number, number][][] }, { tone: string }> {
	return {
		type: 'FeatureCollection',
		features: circles.map(({ center, radiusM, kind, status }) => {
			const angular = radiusM / EARTH_RADIUS_M;
			const lat = (center.lat * Math.PI) / 180;
			const ring = Array.from({ length: STEPS + 1 }, (_, step): [number, number] => {
				const bearing = (2 * Math.PI * (step % STEPS)) / STEPS;
				return [
					center.lng + ((angular * Math.sin(bearing)) / Math.cos(lat)) * (180 / Math.PI),
					center.lat + angular * Math.cos(bearing) * (180 / Math.PI),
				];
			});
			return {
				type: 'Feature',
				geometry: { type: 'Polygon', coordinates: [ring] },
				properties: { tone: kind === 'alert' ? 'alert' : (status ?? 'lost') },
			};
		}),
	};
}

/** Paths as lines plus their points; numbered points carry their 1-based order. */
export function pathFeatures(paths: Path[]): {
	lines: Collection<{ type: 'LineString'; coordinates: [number, number][] }, Record<string, never>>;
	points: Collection<Point, { n: string }>;
} {
	return {
		lines: {
			type: 'FeatureCollection',
			features: paths.map((path) => ({
				type: 'Feature',
				geometry: { type: 'LineString', coordinates: path.points.map(lngLat) },
				properties: {},
			})),
		},
		points: {
			type: 'FeatureCollection',
			features: paths.flatMap((path) =>
				path.points.map((point, index) => ({
					type: 'Feature' as const,
					geometry: { type: 'Point' as const, coordinates: lngLat(point) },
					properties: { n: path.numbered ? String(index + 1) : '' },
				}))
			),
		},
	};
}
