import { describe, expect, it } from 'vitest';

import { EDGE, onTile, OUTLINE, project, TOWNS, zoomFor } from './teaser-map';

const round = ({ x, y }: { x: number; y: number }) => [Math.round(x), Math.round(y)];
const GAP = 29;

describe('project (lat/lng to the 400 x 300 tile)', () => {
	it("puts Slovenia's box in x 64-336, y 60-240, north up and east right", () => {
		expect(round(project({ lat: 46.864, lng: 13.365 }))).toEqual([64, 60]);
		expect(round(project({ lat: 45.424, lng: 16.515 }))).toEqual([336, 240]);
		expect(round(project({ lat: 46.05, lng: 14.51 }))).toEqual([163, 162]);
	});

	it('keeps the outline (a few KB, no fetch) and the towns inside that box', () => {
		expect(OUTLINE.length).toBeLessThan(2048);
		const [xs, ys] = [EDGE.map(({ x }) => x), EDGE.map(({ y }) => y)];
		expect([Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)].map(Math.round)).toEqual([
			64, 336, 60, 240,
		]);

		expect(TOWNS.map(({ name }) => name)).toEqual([
			'Ljubljana',
			'Maribor',
			'Celje',
			'Kranj',
			'Koper',
			'Novo mesto',
			'Murska Sobota',
			'Nova Gorica',
		]);
		for (const { x, y } of TOWNS) expect(x > 64 && x < 336 && y > 60 && y < 240).toBe(true);
	});
});

describe('zoomFor (the zoom choice)', () => {
	const at = (lat: number, lng: number) => project({ lat, lng });
	const ljubljana = at(46.05, 14.51);
	const koper = at(45.55, 13.73);
	const maribor = at(46.56, 15.64);

	it('the whole country for no pins, one pin, or pins that do not overlap', () => {
		const country = { x: 200, y: 150, k: 1 };
		expect(zoomFor([], GAP)).toEqual(country);
		expect(zoomFor([ljubljana], GAP)).toEqual(country);
		expect(zoomFor([ljubljana, koper, maribor], GAP)).toEqual(country);
	});

	it('the whole country when some overlap but the set spans more than half of it', () => {
		expect(zoomFor([ljubljana, at(46.06, 14.5), koper, maribor], GAP)).toEqual({ x: 200, y: 150, k: 1 });
	});

	it('a concentrated set near the border: 3 times at most, centred on it, the coast still in view', () => {
		// Koper and Sežana, 23 units apart at the whole view: they fit 8 times, but the zoom stops at 3.
		expect(zoomFor([koper, at(45.71, 13.87)], GAP)).toEqual({ x: 101, y: 214, k: 3 });
	});

	it('a concentrated set with no border and fewer than three towns in view keeps the whole country', () => {
		const country = { x: 200, y: 150, k: 1 };
		// Three points in Ljubljana about 4 km apart, or one point six times: at 3 times only Ljubljana and Kranj show.
		const city = [at(46.05, 14.45), at(46.05, 14.55), at(46.08, 14.5)];
		expect(zoomFor(city, GAP)).toEqual(country);
		expect(zoomFor(Array(6).fill(ljubljana), GAP)).toEqual(country);
		// Ljubljana and Kranj: the northern border would only touch the top edge, a sliver, not enough.
		expect(zoomFor([ljubljana, at(46.239, 14.356)], GAP)).toEqual(country);
	});

	it('a set with three towns in view zooms though no border shows', () => {
		// Two points near Trojane, 8 units apart: Ljubljana, Kranj and Celje stay in view at 3 times.
		expect(zoomFor([at(46.144, 14.767), at(46.144, 14.859)], GAP)).toEqual({ x: 189, y: 150, k: 3 });
	});

	it('onTile: the view centre lands mid-tile and distances grow k times', () => {
		const view = { x: 162, y: 160, k: 8 };
		expect(onTile({ x: 162, y: 160 }, view)).toEqual({ x: 200, y: 150 });
		expect(onTile({ x: 167, y: 158 }, view)).toEqual({ x: 240, y: 134 });
		expect(onTile({ x: 7, y: 9 }, { x: 200, y: 150, k: 1 })).toEqual({ x: 7, y: 9 });
	});
});
