// C6 map props, the same names on web and mobile, and their GeoJSON for the MapLibre sources.

export type LatLng = { lat: number; lng: number };
export type Marker = {
	id: string;
	position: LatLng;
	kind: 'lost' | 'found' | 'sighted' | 'reunited' | 'me';
	/** Accessible name ("Maks, Izgubljena"). */
	label: string;
	boosted?: boolean;
};
export type Circle = { id: string; center: LatLng; radiusM: number; kind: 'area' | 'alert' };
export type Path = { id: string; points: LatLng[]; numbered?: boolean };
export type BBox = [west: number, south: number, east: number, north: number];

type Position = [lng: number, lat: number];
type Geometry =
	| { type: 'Point'; coordinates: Position }
	| { type: 'LineString'; coordinates: Position[] }
	| { type: 'Polygon'; coordinates: Position[][] };
type Feature = { type: 'Feature'; geometry: Geometry; properties: Record<string, string | number> };
export type FeatureCollection = { type: 'FeatureCollection'; features: Feature[] };

const collection = (features: Feature[]): FeatureCollection => ({ type: 'FeatureCollection', features });
const pos = (p: LatLng): Position => [p.lng, p.lat];

/** Markers as points. Positions are the public (fuzzed) points the API returns; nothing else is drawn. */
export const markerFeatures = (markers: Marker[]) =>
	collection(
		markers.map((m) => ({
			type: 'Feature',
			geometry: { type: 'Point', coordinates: pos(m.position) },
			properties: { id: m.id, kind: m.kind },
		}))
	);

const EARTH_RADIUS_M = 6371008.8;
const STEPS = 64;

/** A to-scale disc as a 64-gon (system §9 area disc), good to a metre at the 200 m to 25 km radii C6 allows. */
export function circlePolygon(center: LatLng, radiusM: number): Position[] {
	const d = radiusM / EARTH_RADIUS_M;
	const cosLat = Math.cos((center.lat * Math.PI) / 180);
	const ring = Array.from({ length: STEPS }, (_, i): Position => {
		const a = (2 * Math.PI * i) / STEPS;
		return [center.lng + (d * Math.sin(a) * 180) / Math.PI / cosLat, center.lat + (d * Math.cos(a) * 180) / Math.PI];
	});
	return [...ring, ring[0]];
}

export const circleFeatures = (circles: Circle[]) =>
	collection(
		circles.map((c) => ({
			type: 'Feature',
			geometry: { type: 'Polygon', coordinates: [circlePolygon(c.center, c.radiusM)] },
			properties: { id: c.id, kind: c.kind },
		}))
	);

/** Paths (FR-017) as lines plus one point per stop; `n` (1-based) is set when the path is numbered. */
export const pathFeatures = (paths: Path[]) =>
	collection(
		paths.flatMap((p): Feature[] => [
			{
				type: 'Feature',
				geometry: { type: 'LineString', coordinates: p.points.map(pos) },
				properties: { id: p.id },
			},
			...p.points.map(
				(point, i): Feature => ({
					type: 'Feature',
					geometry: { type: 'Point', coordinates: pos(point) },
					properties: p.numbered ? { id: p.id, n: i + 1 } : { id: p.id },
				})
			),
		])
	);
