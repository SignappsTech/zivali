// C6 privacy: stored points are coarsened ONCE at write by a random 20-30 m offset (raw is never stored).
// Pure and dependency-free; same function runs on device and server. Inject `random` for tests.
export const COARSEN_MIN_M = 20;
export const COARSEN_MAX_M = 30;
declare const crypto: { getRandomValues(a: Uint32Array): Uint32Array }; // web + RN (polyfilled) + Node
const M_PER_DEG_LAT = 111_320;

/** Uniform [0,1) from crypto (no Math.random for privacy-relevant offsets). */
function cryptoRandom(): number {
	const a = new Uint32Array(1);
	crypto.getRandomValues(a);
	return a[0]! / 2 ** 32;
}

export function coarsenPoint(
	point: { lat: number; lng: number },
	random: () => number = cryptoRandom
): { lat: number; lng: number } {
	const bearing = random() * 2 * Math.PI;
	const dist = COARSEN_MIN_M + random() * (COARSEN_MAX_M - COARSEN_MIN_M);
	const dLat = (dist * Math.cos(bearing)) / M_PER_DEG_LAT;
	const dLng = (dist * Math.sin(bearing)) / (M_PER_DEG_LAT * Math.cos((point.lat * Math.PI) / 180));
	const r = (n: number) => Math.round(n * 1e6) / 1e6;
	return { lat: r(point.lat + dLat), lng: r(point.lng + dLng) };
}
