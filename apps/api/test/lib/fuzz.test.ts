import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import configStore from '../../lib/config-store.ts';
import { FUZZ_DEFAULTS, fuzzArea, fuzzSettings } from '../../lib/fuzz.ts';

const metres = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
	const rad = Math.PI / 180;
	const h =
		Math.sin(((b.lat - a.lat) * rad) / 2) ** 2 +
		Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(((b.lng - a.lng) * rad) / 2) ** 2;
	return 2 * 6371008.8 * Math.asin(Math.sqrt(h));
};
const ljubljana = { lat: 46.051234, lng: 14.505678 };
const types = ['lost', 'found', 'sighted'] as const;

describe('fuzzArea (C6)', () => {
	it('is deterministic per report id and stored point, and differs between reports and locations', () => {
		const input = { report_id: randomUUID(), type: 'lost' as const, point: ljubljana };
		expect(fuzzArea(input)).toEqual(fuzzArea({ ...input }));
		// Sets of 8, not pairs: two draws share a 50 m grid node ~0.6% of the time.
		const centres = (areas: { lat: number; lng: number }[]) => new Set(areas.map((a) => `${a.lat},${a.lng}`));
		const ids = Array.from({ length: 8 }, () => randomUUID());
		expect(centres(ids.map((report_id) => fuzzArea({ ...input, report_id }))).size).toBeGreaterThan(1);
		const secrets = Array.from({ length: 8 }, (_, i) => `another-secret-${i}-0123456789abcdef0123`);
		expect(centres(secrets.map((s) => fuzzArea(input, FUZZ_DEFAULTS, s))).size).toBeGreaterThan(1);
		// A new stored point gets its own offset: the old offset vector cannot be read off the new circle.
		const offset = (point: typeof ljubljana) => {
			const area = fuzzArea({ ...input, point });
			return [area.lat - point.lat, area.lng - point.lng].map((n) => Math.round(n * 1e4));
		};
		const moved = { lat: ljubljana.lat + 0.01, lng: ljubljana.lng + 0.01 };
		const offsets = Array.from({ length: 20 }, (_, i) => offset({ lat: moved.lat + i * 1e-5, lng: moved.lng }));
		expect(new Set([offset(ljubljana), ...offsets].map(String)).size).toBeGreaterThan(15);
	});

	it('keeps the centre when only the radius changes (offset from the minimum radius only)', () => {
		for (let i = 0; i < 500; i++) {
			const input = { report_id: randomUUID(), type: types[i % 3]!, point: ljubljana };
			const base = fuzzArea(input);
			for (const requested_radius_m of [1000, 3000, 20_000]) {
				const area = fuzzArea({ ...input, requested_radius_m });
				expect({ lat: area.lat, lng: area.lng }).toEqual({ lat: base.lat, lng: base.lng });
			}
		}
	});

	it('never puts the centre closer than 0.4 D (D = 0.75 × minimum radius) and keeps the stored point inside', () => {
		for (let i = 0; i < 20_000; i++) {
			const point = { lat: 45.4 + Math.random() * 1.5, lng: 13.4 + Math.random() * 3 };
			const type = types[i % 3]!;
			const d = 0.75 * (type === 'lost' ? 500 : 150);
			const area = fuzzArea({ report_id: randomUUID(), type, point });
			const distance = metres(point, area);
			// 0.2 % margin: lib/fuzz.ts converts with 111 320 m per degree, the haversine here with 111 195.
			expect(distance).toBeGreaterThanOrEqual(0.4 * d * 0.998);
			expect(distance).toBeLessThanOrEqual(area.radius_m);
		}
	});

	it('keeps the stored point inside the circle (5000 random reports, all types and radii)', () => {
		for (let i = 0; i < 5000; i++) {
			const point = { lat: 45.4 + Math.random() * 1.5, lng: 13.4 + Math.random() * 3 };
			const type = types[i % 3]!;
			const requested_radius_m = type === 'lost' && i % 2 ? 200 + Math.floor(Math.random() * 19_800) : null;
			const area = fuzzArea({ report_id: randomUUID(), type, point, requested_radius_m });
			expect(metres(point, area)).toBeLessThanOrEqual(area.radius_m);
		}
	});

	it('uses the 500 m (lost) and 150 m (found, sighted) minima, or a larger requested radius', () => {
		const id = randomUUID();
		expect(fuzzArea({ report_id: id, type: 'lost', point: ljubljana }).radius_m).toBe(500);
		expect(fuzzArea({ report_id: id, type: 'lost', point: ljubljana, requested_radius_m: 200 }).radius_m).toBe(500);
		expect(fuzzArea({ report_id: id, type: 'lost', point: ljubljana, requested_radius_m: 2000 }).radius_m).toBe(
			2000
		);
		expect(fuzzArea({ report_id: id, type: 'found', point: ljubljana }).radius_m).toBe(150);
		expect(fuzzArea({ report_id: id, type: 'sighted', point: ljubljana }).radius_m).toBe(150);
	});

	it('snaps the centre to the 50 m grid and never returns the stored point', () => {
		for (let i = 0; i < 200; i++) {
			const area = fuzzArea({ report_id: randomUUID(), type: 'found', point: ljubljana });
			const latCells = (area.lat * 111_320) / 50;
			expect(Math.abs(latCells - Math.round(latCells))).toBeLessThan(0.01);
			expect(area).not.toMatchObject(ljubljana);
		}
	});

	it('reads the minima and the grid from app_config (defaults inserted by the migration)', async () => {
		configStore.invalidate();
		expect(await fuzzSettings()).toEqual({ lost_min_radius_m: 500, found_min_radius_m: 150, grid_m: 50 });
	});
});
