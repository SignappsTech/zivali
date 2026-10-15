// Public blur (C6, ADR-006): the circle the public sees instead of the stored (already coarsened) point.
// Deterministic per report and stored point: seed = HMAC-SHA256(FUZZ_SECRET, `${report_id}:${lat}:${lng}`) with the
// stored point at 6 decimals, u1/u2 from its first 8 bytes. The offset depends on the type's minimum radius only
// (D = 0.75 × min), never on the requested radius, so a radius change cannot be used to triangulate the stored point:
// distance D × sqrt(0.16 + 0.84 × u1) (area-uniform in the ring 0.4 D…D) at bearing 360° × u2, then the nearest grid
// node that keeps the 0.4 D floor. The stored point stays inside while D + grid / √2 < min (112.5 + 35.4 < 150).
import { createHmac } from 'node:crypto';

import type { ReportType } from '@zivali/types';

import { config } from './config.ts';
import configStore from './config-store.ts';

export type Point = { lat: number; lng: number };
export type FuzzedArea = Point & { radius_m: number };
export type FuzzSettings = { lost_min_radius_m: number; found_min_radius_m: number; grid_m: number };

export const FUZZ_DEFAULTS: FuzzSettings = { lost_min_radius_m: 500, found_min_radius_m: 150, grid_m: 50 };

const M_PER_DEG_LAT = 111_320;
const mPerDegLng = (lat: number) => M_PER_DEG_LAT * Math.cos((lat * Math.PI) / 180);
const round6 = (n: number) => Math.round(n * 1e6) / 1e6;

/** app_config `fuzz.*` (cached 60 s); a missing or broken value falls back to the C6 default. */
export async function fuzzSettings(): Promise<FuzzSettings> {
	const entries = await Promise.all(
		(Object.keys(FUZZ_DEFAULTS) as (keyof FuzzSettings)[]).map(async (key) => {
			const value = await configStore.get(`fuzz.${key}`);
			return [key, typeof value === 'number' && value > 0 ? value : FUZZ_DEFAULTS[key]] as const;
		})
	);
	return Object.fromEntries(entries) as FuzzSettings;
}

const minRadius = (type: ReportType, settings: FuzzSettings) =>
	type === 'lost' ? settings.lost_min_radius_m : settings.found_min_radius_m;

/** public_radius_m = greatest(min_radius(type), coalesce(requested_radius_m, 0)) (C6). */
export function publicRadius(type: ReportType, requested_radius_m: number | null | undefined, settings: FuzzSettings) {
	return Math.max(minRadius(type, settings), requested_radius_m ?? 0);
}

export function fuzzArea(
	input: { report_id: string; type: ReportType; point: Point; requested_radius_m?: number | null },
	settings: FuzzSettings = FUZZ_DEFAULTS,
	secret: string = config.FUZZ_SECRET
): FuzzedArea {
	const { lat, lng } = input.point;
	const seed = createHmac('sha256', secret)
		.update(`${input.report_id}:${lat.toFixed(6)}:${lng.toFixed(6)}`)
		.digest();
	const u1 = seed.readUInt32BE(0) / 2 ** 32;
	const u2 = seed.readUInt32BE(4) / 2 ** 32;
	const d = 0.75 * minRadius(input.type, settings);
	const distance = d * Math.sqrt(0.16 + 0.84 * u1);
	const bearing = 2 * Math.PI * u2;
	const target = {
		lat: lat + (distance * Math.cos(bearing)) / M_PER_DEG_LAT,
		lng: lng + (distance * Math.sin(bearing)) / mPerDegLng(lat),
	};
	const metres = (a: Point, b: Point) =>
		Math.hypot((a.lat - b.lat) * M_PER_DEG_LAT, (a.lng - b.lng) * mPerDegLng(lat));

	// The grid nodes around the target; the lng step comes from the node's (public) latitude, so it reveals nothing
	// about the stored one. They surround the target, so the farthest from the stored point always keeps the floor.
	const latStep = settings.grid_m / M_PER_DEG_LAT;
	const latLow = Math.floor(target.lat / latStep) * latStep;
	const nodes = [latLow, latLow + latStep].flatMap((nodeLat) => {
		const lngStep = settings.grid_m / mPerDegLng(nodeLat);
		const lngLow = Math.floor(target.lng / lngStep) * lngStep;
		return [lngLow, lngLow + lngStep].map((nodeLng) => ({ lat: round6(nodeLat), lng: round6(nodeLng) }));
	});
	nodes.sort((a, b) => metres(a, target) - metres(b, target));
	const centre = nodes.find((node) => metres(node, input.point) >= 0.4 * d) ?? nodes[0]!;
	return { ...centre, radius_m: publicRadius(input.type, input.requested_radius_m, settings) };
}

export default { fuzzArea, fuzzSettings, publicRadius };
