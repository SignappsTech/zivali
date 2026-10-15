// TASK-88.2: seeder 05-directory (versioned initial load) and DirectoryDomain.getResponsibleShelter (C18).
import { beforeAll, describe, expect, it } from 'vitest';

import { DirectoryDomain } from '../../domains/directory/index.ts';
import { systemCtx } from '../../lib/ctx.ts';
import { parseCsv } from '../../lib/csv.ts';
import { prisma } from '../../prisma/prisma.ts';
import seedGeo from '../../prisma/seeders/01-geo.seeder.ts';
import seedDirectory from '../../prisma/seeders/05-directory.seeder.ts';

const ctx = systemCtx();
const responsible = (input: Parameters<typeof DirectoryDomain.getResponsibleShelter>[0]) =>
	DirectoryDomain.getResponsibleShelter(input, ctx);
const assignment = async (slug: string) => {
	const m = await prisma.municipalities.findUniqueOrThrow({ where: { slug } });
	return prisma.municipality_shelters.findUniqueOrThrow({
		where: { municipality_id: m.id },
		include: { shelter: true },
	});
};

// The geo seed is slow (212 polygons): only when the database has none yet.
beforeAll(async () => {
	if (!(await prisma.municipalities.count())) await seedGeo();
	await seedDirectory();
}, 60_000);

describe('parseCsv', () => {
	it('reads quoted commas, doubled quotes, line breaks and CRLF', () => {
		expect(parseCsv('a,b\r\n"x, y","say ""hi""\nthere"\r\n1,\n')).toEqual([
			{ a: 'x, y', b: 'say "hi"\nthere' },
			{ a: '1', b: '' },
		]);
	});
});

describe('seeder 05-directory', () => {
	it('loads 17 shelters and 212 assignments (74 confirmed), each at version 1 with one change row', async () => {
		const [counts] = await prisma.$queryRaw<Record<string, number>[]>`
			select (select count(*)::int from app.shelters where active) as shelters,
				(select count(*)::int from app.municipality_shelters) as assignments,
				(select count(*)::int from app.municipality_shelters where status = 'CONFIRMED') as confirmed,
				(select count(*)::int from app.shelters where lat is null) as unlocated,
				(select count(*)::int from app.directory_changes where version = 1 and actor_id is null
					and entity in ('shelter', 'municipality_shelter')) as changes`;
		expect(counts).toMatchObject({ shelters: 17, assignments: 212, confirmed: 74, unlocated: 0 });
		expect(counts!.changes).toBeGreaterThanOrEqual(229);

		const ljubljana = await prisma.shelters.findUniqueOrThrow({ where: { slug: 'zavetisce-ljubljana' } });
		expect(ljubljana).toMatchObject({ phone: '+38612560279', version: 1, species: ['dog', 'cat'] });
		const change = await prisma.directory_changes.findUniqueOrThrow({
			where: { entity_entity_id_version: { entity: 'shelter', entity_id: ljubljana.id, version: 1 } },
		});
		expect(change.data).toMatchObject({ slug: 'zavetisce-ljubljana', phone: '+38612560279', version: 1 });
		expect(change.source).toBe(ljubljana.source);
		expect((await prisma.shelters.findUniqueOrThrow({ where: { slug: 'macji-dol' } })).species).toEqual(['cat']);
	});

	it('is idempotent: a second run adds no rows or versions', async () => {
		const before = await prisma.directory_changes.count();
		await seedDirectory();
		expect(await prisma.directory_changes.count()).toBe(before);
		expect(await prisma.shelters.count({ where: { version: { not: 1 } } })).toBe(0);
	});

	it('collapses a species split into one unconfirmed row with the suggested shelter as the likely one', async () => {
		const skofjaLoka = await assignment('skofja-loka');
		expect(skofjaLoka).toMatchObject({ status: 'UNCONFIRMED', shelter: { slug: 'zavetisce-horjul' } });
		expect(skofjaLoka.source).toMatch(/^cat: macji-dol\.si.*; dog: ni potrjeno:/);
		expect(await assignment('beltinci')).toMatchObject({
			status: 'UNCONFIRMED',
			shelter: { slug: 'zavetisce-mala-hisa' },
		});
		expect(await assignment('osilnica')).toMatchObject({ status: 'UNCONFIRMED', shelter_id: null });
		expect(await assignment('ljubljana')).toMatchObject({
			status: 'CONFIRMED',
			shelter: { slug: 'zavetisce-ljubljana' },
		});
	});
});

describe('DirectoryDomain.getResponsibleShelter', () => {
	it('confirmed: the responsible shelter, by point or municipality', async () => {
		const byPoint = await responsible({ lat: 46.05, lng: 14.51 });
		expect(byPoint).toMatchObject({
			status: 'confirmed',
			municipality: { slug: 'ljubljana', name: 'Ljubljana' },
			shelter: { slug: 'zavetisce-ljubljana', phone: '+38612560279' },
		});
		expect(await responsible({ municipality: 'ljubljana' })).toEqual(byPoint);
	});

	it('likely: the suggested shelter with its phone and distance, never as the responsible one', async () => {
		const result = await responsible({ municipality: 'beltinci' });
		expect(result).toEqual({
			status: 'likely',
			municipality: { slug: 'beltinci', name: 'Beltinci' },
			likely_shelter: {
				slug: 'zavetisce-mala-hisa',
				name: 'Zavetišče Mala hiša',
				phone: '+38631732700',
				distance_km: expect.any(Number),
			},
		});
		expect(result).not.toHaveProperty('shelter');
	});

	it('unconfirmed: the 2 nearest shelters, no phone', async () => {
		const result = await responsible({ municipality: 'osilnica' });
		expect(result.status).toBe('unconfirmed');
		if (result.status !== 'unconfirmed') return;
		expect(result.municipality).toEqual({ slug: 'osilnica', name: 'Osilnica' });
		expect(result.nearest).toHaveLength(2);
		expect(result.nearest[0]!.distance_km).toBeLessThanOrEqual(result.nearest[1]!.distance_km);
		expect(JSON.stringify(result)).not.toMatch(/phone|\+386/);
	});

	it('Ivančna Gorica / Žužemberk overlap: the point resolves to Ivančna Gorica (lower id), Žužemberk stays unconfirmed', async () => {
		expect(await responsible({ lat: 45.85705, lng: 14.857229 })).toMatchObject({
			status: 'confirmed',
			municipality: { slug: 'ivancna-gorica' },
			shelter: { slug: 'zavetisce-meli-trebnje' },
		});
		const zuzemberk = await responsible({ municipality: 'zuzemberk' });
		expect(zuzemberk).toMatchObject({ status: 'unconfirmed', municipality: { slug: 'zuzemberk' } });
		expect(JSON.stringify(zuzemberk)).not.toContain('phone');
	});

	it('outside Slovenia, unknown municipality, out-of-range point', async () => {
		expect(await responsible({ lat: 45.815, lng: 15.9819 })).toEqual({ status: 'outside_slovenia' });
		await expect(responsible({ municipality: 'atlantida' })).rejects.toMatchObject({ code: 'NOT_FOUND' });
		await expect(responsible({ lat: 46.05, lng: 374.5 })).rejects.toThrow();
	});

	it('distances come from the point when one is given, else from the municipality centroid', async () => {
		// Lukačevci (Moravske Toplice), about 1 km from Mala hiša.
		const near = await responsible({ lat: 46.67, lng: 16.21 });
		expect(near).toMatchObject({ status: 'likely', municipality: { slug: 'moravske-toplice' } });
		const fromPoint = near.status === 'likely' ? near.likely_shelter.distance_km : NaN;
		expect(fromPoint).toBeLessThan(2);
		const fromCentroid = await responsible({ municipality: 'moravske-toplice' });
		expect(fromCentroid.status === 'likely' && fromCentroid.likely_shelter.distance_km).not.toBe(fromPoint);
	});
});
