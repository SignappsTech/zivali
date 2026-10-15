import type { Marker } from '@/components/map/features';

const KINDS = ['lost', 'found', 'sighted'] as const;
const LJUBLJANA = { lat: 46.0569, lng: 14.5058 };

/** Deterministic sample markers around Ljubljana (no real reports) for the dev map and tests. */
export function seedMarkers(count: number): Marker[] {
	let seed = 1;
	const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
	return Array.from({ length: count }, (_, i) => ({
		id: `seed-${i + 1}`,
		position: { lat: LJUBLJANA.lat + (random() - 0.5) * 0.3, lng: LJUBLJANA.lng + (random() - 0.5) * 0.45 },
		kind: KINDS[i % KINDS.length],
		label: `Vzorec ${i + 1}, ${KINDS[i % KINDS.length]}`,
	}));
}
