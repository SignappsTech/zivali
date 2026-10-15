// Seeder 02-geo-places (C6 §Geocoder, TASK-15.8): the GURS snapshot loads completely, idempotently, within budget.
import { beforeAll, describe, expect, it } from 'vitest';

import { prisma } from '../../prisma/prisma.ts';
import seedGeoPlaces from '../../prisma/seeders/02-geo-places.seeder.ts';
import { ensureGeoPlaces, geoCounts, SEED_TIMEOUT_MS, SNAPSHOT } from '../helpers/geo.ts';

beforeAll(ensureGeoPlaces, SEED_TIMEOUT_MS);

// Order-independent checksum of every row: changes when a run adds, drops or alters anything.
async function checksum() {
	const [sums] = await prisma.$queryRaw<{ places: string; addresses: string }[]>`
		select (select sum(hashtext((p.*)::text)::bigint)::text from app.geo_places p) as places,
			(select sum(hashtext((a.*)::text)::bigint)::text from app.geo_addresses a) as addresses`;
	return sums;
}

describe('seeder 02-geo-places', () => {
	it('loads every settlement, district, street and house number of the snapshot', async () => {
		expect(await geoCounts()).toEqual(SNAPSHOT);
		const kinds = await prisma.$queryRaw<{ kind: number; count: number; with_geom: number }[]>`
			select kind::int, count(*)::int as count, count(geom)::int as with_geom from app.geo_places group by kind order by kind`;
		expect(kinds).toEqual([
			{ kind: 1, count: 6035, with_geom: 6035 },
			{ kind: 2, count: 65, with_geom: 65 },
			{ kind: 3, count: 10498, with_geom: 0 },
		]);
		const [valid] = await prisma.$queryRaw<{ valid: boolean }[]>`
			select bool_and(extensions.st_isvalid(geom::extensions.geometry)) as valid from app.geo_places where geom is not null`;
		expect(valid).toEqual({ valid: true });
		expect(
			await prisma.geo_places.findMany({
				where: { search_alt: 'capodistria' },
				select: { id: true, kind: true, name: true, alt_name: true, search: true, municipality_id: true },
			})
		).toEqual([
			{
				id: 110300000101017436n,
				kind: 1,
				name: 'Koper',
				alt_name: 'Capodistria',
				search: 'koper',
				municipality_id: 50,
			},
		]);
		const [house] = await prisma.$queryRaw<{ lat: number; lng: number }[]>`
			select extensions.st_y(a.point::extensions.geometry) as lat, extensions.st_x(a.point::extensions.geometry) as lng
			from app.geo_addresses a join app.geo_places p on p.id = a.place_id
			where p.name = 'Trubarjeva cesta' and p.municipality_id = 61 and a.number = 5 and a.suffix = ''`;
		expect(house).toEqual({ lat: 46.05198, lng: 14.50705 });
	});

	it(
		'is idempotent: a second run changes no row',
		async () => {
			const before = await checksum();
			await seedGeoPlaces();
			expect(await geoCounts()).toEqual(SNAPSHOT);
			expect(await checksum()).toEqual(before);
		},
		SEED_TIMEOUT_MS
	);

	it('keeps both tables within the 70 MB budget (ADR-007)', async () => {
		const [size] = await prisma.$queryRaw<{ bytes: number }[]>`
			select (pg_total_relation_size('app.geo_places') + pg_total_relation_size('app.geo_addresses'))::int as bytes`;
		expect(size!.bytes).toBeLessThan(70 * 1024 * 1024);
	});
});
