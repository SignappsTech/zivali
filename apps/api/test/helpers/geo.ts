// Loads the GURS reference data the geo tests need: 01-geo always (fast), 02-geo-places only when the counts differ
// from the snapshot (a full run takes about half a minute).
import { prisma } from '../../prisma/prisma.ts';
import seedGeo from '../../prisma/seeders/01-geo.seeder.ts';
import seedGeoPlaces from '../../prisma/seeders/02-geo-places.seeder.ts';

/** supabase/seed/geo/LICENSE.md: 6,035 settlements + 65 districts + 10,498 streets; 580,251 house numbers. */
export const SNAPSHOT = { places: 16_598, addresses: 580_251 };
export const SEED_TIMEOUT_MS = 600_000;

export async function geoCounts(): Promise<{ places: number; addresses: number }> {
	const [counts] = await prisma.$queryRaw<{ places: number; addresses: number }[]>`
		select (select count(*)::int from app.geo_places) as places,
			(select count(*)::int from app.geo_addresses) as addresses`;
	return counts!;
}

export async function ensureGeoPlaces(): Promise<void> {
	await seedGeo();
	const counts = await geoCounts();
	if (counts.places !== SNAPSHOT.places || counts.addresses !== SNAPSHOT.addresses) await seedGeoPlaces();
}
