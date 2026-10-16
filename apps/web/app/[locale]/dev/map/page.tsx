import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import type { Circle, Marker, Path } from '@/components/map/map-view';
import { env } from '@/lib/env';

import { MapDemo } from './map-demo';

export const metadata: Metadata = { title: 'MapView', robots: { index: false, follow: false } };

const KINDS = ['lost', 'found', 'sighted', 'reunited'] as const;
const PHOTOS = ['/images/placeholder-dog-aussie-wide.webp', '/images/placeholder-cat-tabby.webp', undefined];
// Seeded around six towns, so every run draws the same map (TASK-15.2 AC#4: 500 markers with clustering).
const TOWNS = [
	[46.0569, 14.5058],
	[46.5547, 15.6459],
	[46.2397, 14.3556],
	[45.5481, 13.7302],
	[46.2309, 15.2604],
	[45.8011, 15.1711],
];

function random(seed: number) {
	return () => {
		seed = (seed + 0x6d2b79f5) | 0;
		let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

/** TASK-15.2: MapView with 500 seeded public points, areas and a path, for e2e and review (SL /dev/map, EN /en/dev/map). */
export default async function MapDevPage() {
	// Dev and staging only (frontend.md: APP_ENV guards dev pages).
	if (env.APP_ENV === 'production') notFound();
	const t = await getTranslations('map');

	const next = random(15);
	const markers: Marker[] = Array.from({ length: 500 }, (_, index) => {
		const [lat, lng] = TOWNS[index % TOWNS.length];
		const kind = KINDS[index % KINDS.length];
		return {
			id: `r${index + 1}`,
			position: { lat: lat + (next() - 0.5) * 0.3, lng: lng + (next() - 0.5) * 0.45 },
			kind,
			label: t('marker_a11y', { title: `#${index + 1}`, status: kind }),
			photoUrl: PHOTOS[index % PHOTOS.length],
		};
	});
	markers.push({ id: 'me', position: { lat: 46.051, lng: 14.469 }, kind: 'me', label: 'You' });
	const circles: Circle[] = [
		{ id: 'a1', center: { lat: 46.07, lng: 14.49 }, radiusM: 800, kind: 'area' },
		{ id: 'a2', center: { lat: 46.04, lng: 14.53 }, radiusM: 400, kind: 'area', status: 'found' },
		{ id: 'h1', center: { lat: 46.051, lng: 14.469 }, radiusM: 3000, kind: 'alert' },
	];
	const paths: Path[] = [
		{
			id: 'p1',
			numbered: true,
			points: [
				{ lat: 46.062, lng: 14.48 },
				{ lat: 46.066, lng: 14.5 },
				{ lat: 46.058, lng: 14.515 },
			],
		},
	];

	return (
		<main className="mx-auto grid w-full max-w-[1200px] gap-6 px-5 py-8">
			<h1 className="font-display text-[34px] leading-10 font-bold tracking-[-0.02em]">MapView</h1>
			<MapDemo markers={markers} circles={circles} paths={paths} />
		</main>
	);
}
