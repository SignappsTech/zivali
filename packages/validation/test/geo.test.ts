import { describe, expect, it } from 'vitest';

import { coarsenPoint } from '../src/geo.ts';

const dist = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
	const R = 6371008.8;
	const rad = Math.PI / 180;
	const h =
		Math.sin(((b.lat - a.lat) * rad) / 2) ** 2 +
		Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(((b.lng - a.lng) * rad) / 2) ** 2;
	return 2 * R * Math.asin(Math.sqrt(h));
};
const seq =
	(...v: number[]) =>
	() =>
		v.shift()!;

describe('coarsenPoint', () => {
	const p = { lat: 46.05, lng: 14.51 };
	it('moves 20-30 m for random inputs', () => {
		for (let i = 0; i < 2000; i++) {
			const d = dist(p, coarsenPoint(p));
			expect(d).toBeGreaterThanOrEqual(19.7);
			expect(d).toBeLessThanOrEqual(30.3);
		}
	});
	it('hits bounds with injected source and is deterministic', () => {
		expect(dist(p, coarsenPoint(p, seq(0.25, 0)))).toBeCloseTo(20, 0);
		expect(dist(p, coarsenPoint(p, seq(0.6, 0.99999)))).toBeCloseTo(30, 0);
		expect(coarsenPoint(p, seq(0.1, 0.5))).toEqual(coarsenPoint(p, seq(0.1, 0.5)));
	});
	it('rounds to 6 decimals', () => {
		const c = coarsenPoint(p);
		expect(c.lat).toBe(Math.round(c.lat * 1e6) / 1e6);
		expect(c.lng).toBe(Math.round(c.lng * 1e6) / 1e6);
	});
});
