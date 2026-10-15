// Small planar geometry helpers for the GURS geo data (TASK-6.1, TASK-15.7): point in polygon and a validity check.
export const polygonsOf = (g) => (g.type === 'Polygon' ? [g.coordinates] : g.coordinates);

// Even-odd ray casting over all rings, so holes count as outside.
export const contains = (geometry, [lng, lat]) => {
	let inside = false;
	for (const ring of polygonsOf(geometry).flat()) {
		for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
			const [xi, yi] = ring[i];
			const [xj, yj] = ring[j];
			if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
		}
	}
	return inside;
};

const orient = (p, q, r) => Math.sign((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]));
const within = (p, q, r) =>
	Math.min(p[0], r[0]) <= q[0] &&
	q[0] <= Math.max(p[0], r[0]) &&
	Math.min(p[1], r[1]) <= q[1] &&
	q[1] <= Math.max(p[1], r[1]);
const segmentsTouch = (a, b, c, d) => {
	const [o1, o2, o3, o4] = [orient(a, b, c), orient(a, b, d), orient(c, d, a), orient(c, d, b)];
	if (o1 !== o2 && o3 !== o4) return true;
	return (
		(o1 === 0 && within(a, c, b)) ||
		(o2 === 0 && within(a, d, b)) ||
		(o3 === 0 && within(c, a, d)) ||
		(o4 === 0 && within(c, b, d))
	);
};

// Problems that make a polygon invalid in PostGIS: open or short rings, repeated points,
// rings that cross or touch themselves or each other. Sweep over segments sorted by min x.
export const polygonProblem = (polygon) => {
	const segments = [];
	for (const [r, ring] of polygon.entries()) {
		if (ring.length < 4) return `ring ${r} has ${ring.length} positions`;
		if (ring[0].join() !== ring.at(-1).join()) return `ring ${r} is not closed`;
		for (let i = 0; i < ring.length - 1; i++) {
			const [a, b] = [ring[i], ring[i + 1]];
			if (!a.every(Number.isFinite)) return `ring ${r} has a non-numeric position`;
			if (a.join() === b.join()) return `ring ${r} repeats position ${i}`;
			segments.push({
				r,
				i,
				last: ring.length - 2,
				a,
				b,
				minX: Math.min(a[0], b[0]),
				maxX: Math.max(a[0], b[0]),
			});
		}
	}
	segments.sort((s, t) => s.minX - t.minX);
	for (let x = 0; x < segments.length; x++) {
		const s = segments[x];
		for (let y = x + 1; y < segments.length && segments[y].minX <= s.maxX; y++) {
			const t = segments[y];
			const gap = Math.abs(s.i - t.i);
			if (s.r === t.r && (gap === 1 || gap === s.last)) continue; // neighbours share a vertex
			if (segmentsTouch(s.a, s.b, t.a, t.b)) return `ring ${s.r} segment ${s.i} meets ring ${t.r} segment ${t.i}`;
		}
	}
	return null;
};
