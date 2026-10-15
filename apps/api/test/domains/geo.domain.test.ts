// TASK-6.4: seeder 01-geo and GeoDomain.lookup (geoLookupQuery) against the local database (C6).
import { beforeAll, describe, expect, it } from 'vitest';

import { GeoDomain } from '../../domains/geo/index.ts';
import { systemCtx } from '../../lib/ctx.ts';
import { geoLookupQuery } from '../../lib/geo.ts';
import { prisma } from '../../prisma/prisma.ts';
import seedGeo from '../../prisma/seeders/01-geo.seeder.ts';

const ctx = systemCtx();
const lookup = (lat: number, lng: number) => GeoDomain.lookup({ lat, lng }, ctx);
const inside = (municipality_id: number, municipality_slug: string, region_id: number, region_slug: string) => ({
	in_slovenia: true,
	municipality_id,
	municipality_slug,
	region_id,
	region_slug,
});
const outside = {
	in_slovenia: false,
	municipality_id: null,
	municipality_slug: null,
	region_id: null,
	region_slug: null,
};

beforeAll(async () => {
	await seedGeo();
});

describe('seeder 01-geo', () => {
	it('loads 12 regions and 212 valid municipalities, idempotently', async () => {
		await seedGeo();
		const [counts] = await prisma.$queryRaw<{ regions: number; municipalities: number; valid: boolean }[]>`
			select (select count(*)::int from app.regions) as regions,
				(select count(*)::int from app.municipalities) as municipalities,
				(select bool_and(extensions.st_isvalid(geom::extensions.geometry)) from app.municipalities) as valid`;
		expect(counts).toEqual({ regions: 12, municipalities: 212, valid: true });
		expect(await prisma.municipalities.findUnique({ where: { id: 61 }, include: { region: true } })).toEqual({
			id: 61,
			slug: 'ljubljana',
			name_sl: 'Ljubljana',
			name_en: 'Ljubljana',
			region_id: 8,
			region: { id: 8, slug: 'osrednjeslovenska', name_sl: 'Osrednjeslovenska', name_en: 'Central Slovenia' },
		});
	});
});

describe('GeoDomain.lookup', () => {
	it('returns municipality and region for points inside Slovenia', async () => {
		expect(await lookup(46.0514, 14.5061)).toEqual(inside(61, 'ljubljana', 8, 'osrednjeslovenska'));
		expect(await lookup(46.5576, 15.6456)).toEqual(inside(70, 'maribor', 2, 'podravska'));
		expect(await lookup(45.5481, 13.7302)).toEqual(inside(50, 'koper', 12, 'obalno-kraska'));
	});

	it('breaks the Ivančna Gorica / Žužemberk overlap by the lower id', async () => {
		const [both] = await prisma.$queryRaw<{ ids: number[] }[]>`
			select array_agg(id order by id)::int[] as ids from app.municipalities
			where extensions.st_covers(geom, extensions.st_setsrid(extensions.st_makepoint(14.857229, 45.85705), 4326)::extensions.geography)`;
		expect(both).toEqual({ ids: [39, 193] });
		expect(await lookup(45.85705, 14.857229)).toEqual(inside(39, 'ivancna-gorica', 8, 'osrednjeslovenska'));
	});

	it('tells apart points about 5 m either side of the national border at Nova Gorica', async () => {
		expect(await lookup(45.95678, 13.63522)).toEqual(inside(84, 'nova-gorica', 11, 'goriska'));
		expect(await lookup(45.95688, 13.63512)).toEqual(outside);
	});

	it('rejects out-of-range coordinates instead of wrapping them', async () => {
		await expect(lookup(46.05, 374.5)).rejects.toThrow();
		await expect(lookup(91, 14.5)).rejects.toThrow();
	});

	it('returns in_slovenia = false outside Slovenia', async () => {
		expect(await lookup(45.815, 15.9819)).toEqual(outside); // Zagreb
		expect(await lookup(45.6495, 13.7768)).toEqual(outside); // Trieste
		expect(await lookup(47.0707, 15.4395)).toEqual(outside); // Graz
		expect(await lookup(0, 0)).toEqual(outside);
	});

	it('uses the GiST index and runs in under 5 ms', async () => {
		// EXPLAIN the real query; database time, so a busy test machine does not skew it.
		const explain = (lat: number, lng: number) =>
			prisma.$queryRaw<
				{ 'QUERY PLAN': [{ 'Execution Time': number }] }[]
			>`explain (analyze, format json) ${geoLookupQuery(lat, lng)}`;
		const runs = [];
		for (let i = 0; i < 5; i++) runs.push((await explain(46.0514 + i * 0.01, 14.5061))[0]['QUERY PLAN'][0]);
		expect(JSON.stringify(runs[0])).toContain('"Index Name":"municipalities_geom_idx"');
		const ms = runs.map((run) => run['Execution Time']).sort((a, b) => a - b);
		expect(ms[2]).toBeLessThan(5);
	});
});
