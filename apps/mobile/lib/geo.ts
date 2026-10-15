export type Point = { lat: number; lng: number };

/** Equirectangular distance in km: accurate to metres at the 10 km scale. */
export const distanceKm = (a: Point, b: Point): number =>
	Math.hypot((b.lng - a.lng) * Math.cos(((a.lat + b.lat) * Math.PI) / 360), b.lat - a.lat) * 111.32;
