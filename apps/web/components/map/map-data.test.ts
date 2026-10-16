import { describe, expect, it } from 'vitest';

import { circleFeatures, markerFeatures, pathFeatures } from './map-data';

const center = { lat: 46.05, lng: 14.5 };

/** Great-circle distance in metres. */
function distance([lng1, lat1]: [number, number], [lng2, lat2]: [number, number]) {
	const rad = Math.PI / 180;
	const a =
		Math.sin(((lat2 - lat1) * rad) / 2) ** 2 +
		Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(((lng2 - lng1) * rad) / 2) ** 2;
	return 2 * 6_371_008.8 * Math.asin(Math.sqrt(a));
}

describe('markerFeatures', () => {
	it('draws report markers at their public points and leaves the "you" dot out of the clustered source', () => {
		const { features } = markerFeatures([
			{ id: 'r1', position: center, kind: 'lost', label: 'Maks, Izgubljena' },
			{ id: 'me', position: { lat: 46.1, lng: 14.6 }, kind: 'me', label: 'You' },
		]);
		expect(features).toEqual([
			{
				type: 'Feature',
				geometry: { type: 'Point', coordinates: [14.5, 46.05] },
				properties: { id: 'r1', kind: 'lost' },
			},
		]);
	});
});

describe('circleFeatures', () => {
	it('draws a closed 64-gon to scale around the public centre', () => {
		const [feature] = circleFeatures([{ id: 'a', center, radiusM: 500, kind: 'area' }]).features;
		const [ring] = feature.geometry.coordinates;
		expect(ring).toHaveLength(65);
		expect(ring[64]).toEqual(ring[0]);
		for (const vertex of ring) expect(distance([center.lng, center.lat], vertex)).toBeCloseTo(500, -1);
	});

	it('tones areas by status (lost by default) and alert areas apart', () => {
		const tones = circleFeatures([
			{ id: 'a', center, radiusM: 500, kind: 'area' },
			{ id: 'b', center, radiusM: 150, kind: 'area', status: 'found' },
			{ id: 'c', center, radiusM: 150, kind: 'area', status: 'sighted' },
			{ id: 'd', center, radiusM: 3000, kind: 'alert' },
		]).features.map((feature) => feature.properties.tone);
		expect(tones).toEqual(['lost', 'found', 'sighted', 'alert']);
	});
});

describe('pathFeatures', () => {
	it('draws each path as a line and numbers its points only when asked', () => {
		const points = [center, { lat: 46.06, lng: 14.51 }];
		const { lines, points: dots } = pathFeatures([
			{ id: 'p1', points, numbered: true },
			{ id: 'p2', points },
		]);
		expect(lines.features.map((feature) => feature.geometry.coordinates)).toEqual([
			[
				[14.5, 46.05],
				[14.51, 46.06],
			],
			[
				[14.5, 46.05],
				[14.51, 46.06],
			],
		]);
		expect(dots.features.map((feature) => feature.properties.n)).toEqual(['1', '2', '', '']);
	});
});
