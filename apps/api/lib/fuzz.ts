// Public blur (C6, ADR-006): the circle the public sees instead of the stored (already coarsened) point.
// Deterministic per report and stored point: seed = HMAC-SHA256(report_id, FUZZ_SECRET), u1/u2 from its first 8 bytes,
// offset 0.8 × radius × sqrt(u1) at bearing 360° × u2, centre snapped to the grid. The stored point stays inside.
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

/**
 * Of the two grid lines around `value`, the one nearer `toward` (the stored point). Rounding to the nearest line could
 * push the centre up to half a cell diagonal (35 m) further out; this way each axis moves at most max(offset, grid/2)
 * from the stored point, so the distance stays below sqrt((0.8 r)² + (grid/2)²) < r.
 */
function snap(value: number, toward: number, step: number): number {
	const low = Math.floor(value / step) * step;
	const high = low + step;
	return Math.abs(toward - low) <= Math.abs(toward - high) ? low : high;
}

export function fuzzArea(
	input: { report_id: string; type: ReportType; point: Point; requested_radius_m?: number | null },
	settings: FuzzSettings = FUZZ_DEFAULTS,
	secret: string = config.FUZZ_SECRET
): FuzzedArea {
	const min = input.type === 'lost' ? settings.lost_min_radius_m : settings.found_min_radius_m;
	const radius_m = Math.max(min, input.requested_radius_m ?? 0);
	const seed = createHmac('sha256', secret).update(input.report_id).digest();
	const u1 = seed.readUInt32BE(0) / 2 ** 32;
	const u2 = seed.readUInt32BE(4) / 2 ** 32;
	const distance = 0.8 * radius_m * Math.sqrt(u1);
	const bearing = 2 * Math.PI * u2;
	const { lat, lng } = input.point;
	const latStep = settings.grid_m / M_PER_DEG_LAT;
	const snappedLat = snap(lat + (distance * Math.cos(bearing)) / M_PER_DEG_LAT, lat, latStep);
	// The lng step comes from the snapped (public) latitude, so it reveals nothing about the stored one.
	const lngStep = settings.grid_m / mPerDegLng(snappedLat);
	const snappedLng = snap(lng + (distance * Math.sin(bearing)) / mPerDegLng(lat), lng, lngStep);
	return { lat: round6(snappedLat), lng: round6(snappedLng), radius_m };
}

export default { fuzzArea, fuzzSettings };
