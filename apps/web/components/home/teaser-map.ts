// The home map teaser's drawing (TASK-115.12): Slovenia, a few towns and the zoom, in the 400 x 300 tile's units, so
// the home page loads no map library and fetches nothing.

export type Point = { x: number; y: number };
/** The tile's centre is the view's centre, `k` times enlarged (1 = the whole country). */
export type View = Point & { k: number };

const LNG = Math.cos((46.15 * Math.PI) / 180) * 125;
/**
 * Equirectangular at 46.15° N, 125 units a degree of latitude: Slovenia (lng 13.37-16.52, lat 45.42-46.86) fills
 * x 64-336, y 60-240, inside the part every crop of the tile shows (x 50-350, y 50-250).
 */
export const project = ({ lat, lng }: { lat: number; lng: number }): Point => ({
	x: 200 + (lng - 14.94) * LNG,
	y: 150 - (lat - 46.144) * 125,
});

// Slovenia from Natural Earth 1:10m Admin 0 (public domain, naturalearthdata.com), projected, simplified 0.5 units.
export const OUTLINE =
	'M87.7 235.6l-1.7-.4-2.9-3.3 .5-3.7-1.5-.6-.9-2 1.9 .4 14.1-2.1-3.6-5.1 4.3-.3 3.4 1.8 4.1-.4 4.1-5.9-3.2-2.2-6.9-11.7-6-2.8-4.2-3.3-4.4-.8-2.5-1.4-1.3-2.6 .3-4.3 3.4-7.7 1.2-5-1.4-2.4-8.4 2.3-4.1-4.9 2.4-2.4-.6-2.4 1.9-2.7 9.7-7.3 2.5-4.6-.7-2.3-6.8-.5-4.2-3.7-3.6-1.2-4-.7 1.3 2.2-2.4 .4-3.9-10.3 2.3-1.4 3.7-6.5 8.3-4.3 6.1-6.8 5.1-.3 1.6-.9 2-8.5 7 1.5 6.8-.9 2.6 .4 8 3.8 5.8-.3 2.7 1 6 4.5 22.2 .1 1.2 1.9 2.6 1.2 4.5-.5 3.3 5 1.5-.7 2.8-6.3 3.6-.8 2.6-2.4 1.6 .1 2.6-4.2 4.4-.4 2.4-1.3 3.9-9.7 2.5-2.6 3-.1 3.1-1.9 1.3 .2 1.7 2.4 3.2-4.6 5-1.6 12.3 1.3 15.9-.8 6.5 3.9 2.6-.5 1.6-1.2 1.6-4.5 1.4-1 5-.1 2-1 .8-4.6 1.4 .8 6.6 1 10.6-2.7 8.2 3.5 3.6 .6 2.5 2.7-.1-2.9-1-1.9-1.9-1.2-1-3.1 .7-8.2-.5-1.5 .8-.9 4.4-1.2 5.3-3.1 3.6 .8 11.8-1 2.6 2.6 2.1 .5 .2 1.7-2.6 6.2 1.4 4.1 2.5 3.6 1.2-.2 .1 2.1 4.1 1.5 .4 2.4-3.6 3.1 .7 1.8 4.6 3.1 3.2 4.9 3 2.5 1.2 5.4-2.9-2.2-3.6 0-2.9-2.5-3.2-.2-1-.8-.6 1-.6-1-1.2 1.5-5.8 2.4-2.5 2.8 1.4 11.1 2.4 2.2-.2 1.8-7.3 .4-4.2-3.1-1 .2-2.2 2.4-4.2-.5 .2 5.7-.7 1.7-2.8 2.4-6.1 1.9-5.7 3.1-5.6 .5-2.6 1.5-1.7 3-1.7 1.1-7.6-.6-1.9 .9-3.1 5.1-1.2 3.6 0 3.1 1.2 2.8 2.4 2.6 4.5 2.4 1.2 1.9-2 5.4 .1 8.5-1.4 4.5 1.4 5.9-.8 1.2-3.5 1.5-8.9-.9-3.3 2.1-2.9-.6-1 .5 .1 3.6-1 .9-10.9 3.6-4.2 2.9-.4 1.9 2.8 3.5 1.9 1 2.2-1.6 3.8 5.6-6.7 1.8-.8 1.9-1.6 1.1 2.4 9.8 1.2 2.2 4.4 2.9-3.1 3.7-3.8 .2-8.5 3.2-3.8-.6-7.2-6.2-4.3-.1-3.8-1.5-3.5-2.8-1.6 .1-.3 2.7-1.7 2.9-3.7 1.3-3.6-.7-1.3-3.6-8.1-3.6-1.7-1.4 .1-3.9-5.8-4.8-.8-1.6-.1-5.9-1-.6-2.1 1.4-5 7.6-1.4 6.7-1.2 2.1-8.3 6-4 .3-9.4-2.7-6.3 2.6-4.6 .3-2.2-.8-4.6-3.5-3.6-.8-.9 2.7 1.8 2.2-1.1 1.5-4.1 1.8-2.9 3.1-6-1.1-5.2-3.8z';

/**
 * The towns the teaser names, at their rough centres (owner, 2026-10-19), with the side their label takes: right,
 * except where it would run into a neighbour (Murska Sobota into Maribor, Nova Gorica into Ljubljana).
 */
export const TOWNS = (
	[
		['Ljubljana', 46.051, 14.506],
		['Maribor', 46.557, 15.646],
		['Celje', 46.231, 15.26],
		['Kranj', 46.239, 14.356],
		['Koper', 45.548, 13.73],
		['Novo mesto', 45.801, 15.171],
		['Murska Sobota', 46.662, 16.166, 'above'],
		['Nova Gorica', 45.956, 13.648, 'below'],
	] as const
).map(([name, lat, lng, side = 'right' as const]) => ({ name, side, ...project({ lat, lng }) }));

/** A point of the view on the tile. */
export const onTile = (point: Point, view: View): Point => ({
	x: 200 + view.k * (point.x - view.x),
	y: 150 + view.k * (point.y - view.y),
});

/** Inside every crop of the tile, with room for a town's dot and label (x 55-345, y 58-242). */
export const inView = ({ x, y }: Point) => x >= 55 && x <= 345 && y >= 58 && y <= 242;

/** The outline's corners as absolute points (M x y, then relative l steps). */
const [x0, y0, ...steps] = OUTLINE.match(/-?(?:\d+\.?\d*|\.\d+)/g)!.map(Number);
export const EDGE: Point[] = [{ x: x0!, y: y0! }];
for (let i = 0; i < steps.length; i += 2)
	EDGE.push({ x: EDGE.at(-1)!.x + steps[i]!, y: EDGE.at(-1)!.y + steps[i + 1]! });

const COUNTRY: View = { x: 200, y: 150, k: 1 };
/**
 * The whole country, unless some pins overlap there (closer than `gap`), all of them fit the crop-safe box (274 x 174)
 * at least twice enlarged, and the zoom keeps some geography: the border at least 30 units inside every crop
 * (x 80-320, y 80-220), or three towns in view (the set's and two more). Then the largest whole zoom up to 3 that fits
 * them, centred on them. A set in mid-Ljubljana stays a counted disc on the whole country; pins still close at the zoom
 * cluster there too.
 */
export function zoomFor(points: Point[], gap: number): View {
	const overlap = points.some((p, i) => points.slice(i + 1).some((q) => Math.hypot(p.x - q.x, p.y - q.y) < gap));
	if (!overlap) return COUNTRY;
	const xs = points.map(({ x }) => x);
	const ys = points.map(({ y }) => y);
	const [left, right, top, bottom] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
	const k = Math.min(3, Math.floor(Math.min(274 / (right - left), 174 / (bottom - top))));
	if (k < 2) return COUNTRY;
	const view = { x: Math.round((left + right) / 2), y: Math.round((top + bottom) / 2), k };
	const border = EDGE.map((point) => onTile(point, view)).some(
		({ x, y }) => x >= 80 && x <= 320 && y >= 80 && y <= 220
	);
	return border || TOWNS.filter((town) => inView(onTile(town, view))).length >= 3 ? view : COUNTRY;
}
