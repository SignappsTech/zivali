// Seeder 01-geo (C6): 12 GURS statistical regions and 212 municipalities from supabase/seed/geo/*.geojson, as the
// SQL scripts/geo-to-sql.mjs generates (EWKT, `on conflict (id) do update`), so every run is idempotent.
// Runs in every environment: static reference data, licence in supabase/seed/geo/LICENSE.md.
import { prisma } from '../prisma.ts';

type Generator = {
	geoToSql: (regions: unknown[], municipalities: unknown[]) => string;
	loadFeatures: (name: 'regions' | 'municipalities') => unknown[];
};

const generator = new URL('../../../../scripts/geo-to-sql.mjs', import.meta.url).href;

export default async function seedGeo(): Promise<void> {
	const { geoToSql, loadFeatures } = (await import(generator)) as Generator;
	// No parameters, so node-postgres sends a simple query: both statements run in one implicit transaction.
	await prisma.$executeRawUnsafe(geoToSql(loadFeatures('regions'), loadFeatures('municipalities')));
}
