// Responsible-shelter directory (C18). getResponsibleShelter is the one rule for "which shelter is responsible here",
// shared by the public endpoint, report checklists and the worker. Only a CONFIRMED assignment names the responsible
// shelter; an UNCONFIRMED one may name a likely shelter (shown as unconfirmed) or none (then the 2 nearest, no phone).
import { randomUUID } from 'node:crypto';

import { z } from 'zod';

import { OpeningHours } from '@zivali/validation';

import { parseCsv } from '../../lib/csv.ts';
import type { Ctx } from '../../lib/ctx.ts';
import { AppError } from '../../lib/errors.ts';
import type { Prisma, shelters } from '../../generated/client.ts';
import { prisma } from '../../prisma/prisma.ts';
import { GeoDomain } from '../geo/index.ts';
import DirectoryDao, { type ShelterListRow } from './directory.dao.ts';

type MunicipalityRef = { slug: string; name: string };
type Distance = { slug: string; name: string; distance_km: number };

export type ResponsibleResult =
	| { status: 'confirmed'; municipality: MunicipalityRef; shelter: shelters }
	| { status: 'likely'; municipality: MunicipalityRef; likely_shelter: Distance & { phone: string } }
	| { status: 'unconfirmed'; municipality: MunicipalityRef; nearest: Distance[] }
	| { status: 'outside_slovenia' };

export type ShelterListItem = Omit<ShelterListRow, 'area_sl' | 'area_en'> & { area: string };

const bySlName = <T extends { name: string }>(a: T, b: T) => a.name.localeCompare(b.name, 'sl');

export async function getResponsibleShelter(
	input: { lat: number; lng: number } | { municipality: string },
	ctx: Ctx,
	tx?: Prisma.TransactionClient
): Promise<ResponsibleResult> {
	let municipality;
	if ('municipality' in input) {
		municipality = await DirectoryDao.findMunicipality({ slug: input.municipality }, tx);
		if (!municipality) throw new AppError('NOT_FOUND', 'Unknown municipality');
	} else {
		const geo = await GeoDomain.lookup(input, ctx, tx);
		if (!geo.in_slovenia) return { status: 'outside_slovenia' };
		municipality = await DirectoryDao.findMunicipality({ id: geo.municipality_id }, tx);
		if (!municipality) throw new AppError('INTERNAL', 'Geo lookup returned an unknown municipality');
	}
	const ref = { slug: municipality.slug, name: municipality.name_sl };
	const assignment = await DirectoryDao.findAssignment(municipality.id, tx);
	const shelter = assignment?.shelter?.active ? assignment.shelter : null;
	if (shelter && assignment?.status === 'CONFIRMED') return { status: 'confirmed', municipality: ref, shelter };

	const distances = await DirectoryDao.shelterDistances(
		'municipality' in input ? { municipality_id: municipality.id } : input,
		tx
	);
	// A likely shelter without a location has no distance, so it falls back to the nearest list.
	const likely = shelter && distances.find((d) => d.slug === shelter.slug);
	if (likely) return { status: 'likely', municipality: ref, likely_shelter: likely };
	return {
		status: 'unconfirmed',
		municipality: ref,
		nearest: distances.slice(0, 2).map(({ slug, name, distance_km }) => ({ slug, name, distance_km })),
	};
}

/** Active shelters sorted by name; `area` is the statistical region in the request locale. */
export async function listShelters(_input: void, ctx: Ctx): Promise<ShelterListItem[]> {
	const rows = await DirectoryDao.listActiveShelters(ctx.tx);
	return rows
		.map(({ area_sl, area_en, ...row }) => ({ ...row, area: (ctx.locale === 'en' ? area_en : area_sl) ?? '' }))
		.sort(bySlName);
}

/** An active shelter with its confirmed municipalities; NOT_FOUND for unknown or inactive slugs. */
export async function getShelter(slug: string, ctx: Ctx) {
	const shelter = await DirectoryDao.findShelterBySlug(slug, ctx.tx);
	if (!shelter?.active) throw new AppError('NOT_FOUND', 'Unknown shelter');
	const ids = shelter.municipality_shelters.map((m) => m.municipality_id);
	const municipalities = (await DirectoryDao.listMunicipalitiesById(ids, ctx.tx))
		.map((m) => ({ slug: m.slug, name: m.name_sl }))
		.sort(bySlName);
	return { shelter, municipalities };
}

/** All 212 municipalities; `shelter_slug` only for a confirmed, active shelter. */
export async function listMunicipalities(_input: void, ctx: Ctx) {
	return (await DirectoryDao.listMunicipalityShelters(ctx.tx)).sort(bySlName);
}

// Initial load from the CSVs in prisma/seeders/data (README there): creates the rows that do not exist yet, each
// with version 1 and a directory_changes entry. Existing rows are left alone (later edits go through TASK-89).

const ShelterCsvRow = z.object({
	slug: z.string().min(1),
	name: z.string().min(1),
	address: z.string().min(1),
	postal_code: z.string().min(1),
	city: z.string().min(1),
	lat: z.string(),
	lng: z.string(),
	phone: z.string().regex(/^\+\d{8,15}$/),
	phone_display: z.string().min(1),
	email: z.string(),
	website: z.string(),
	opening_hours: z.string(),
	registry_id: z.string(),
	species: z.enum(['', 'cat', 'dog']),
	source: z.string().min(1),
	verified_at: z.iso.date(),
});
type AssignmentCsvRow = Record<
	'municipality_slug' | 'species' | 'shelter_slug' | 'status' | 'suggested_shelter' | 'source' | 'verified_at',
	string
>;

const orNull = (value: string) => value || null;

function toShelterData(raw: Record<string, string>): Prisma.sheltersCreateManyInput {
	const row = ShelterCsvRow.parse(raw);
	return {
		id: randomUUID(),
		...row,
		lat: row.lat ? Number(row.lat) : null,
		lng: row.lng ? Number(row.lng) : null,
		email: orNull(row.email),
		website: orNull(row.website),
		opening_hours: z.array(OpeningHours).parse(JSON.parse(row.opening_hours)),
		registry_id: orNull(row.registry_id),
		species: row.species ? [row.species] : ['dog', 'cat'],
		verified_at: new Date(row.verified_at),
	};
}

/**
 * C18 keeps one assignment per municipality, the CSV may split it by species: CONFIRMED only when cats and dogs
 * resolve to the same confirmed shelter, else UNCONFIRMED with the first suggested shelter as the likely one.
 */
function toAssignment(
	rows: AssignmentCsvRow[],
	municipalityId: number,
	shelterId: (slug: string) => string
): Prisma.municipality_sheltersCreateManyInput {
	const ordered = [...rows].sort((a, b) => a.species.localeCompare(b.species)); // '' (all animals) first
	const pick = (species: string) => ordered.find((r) => r.species === species) ?? ordered.find((r) => !r.species);
	const [cat, dog] = [pick('cat'), pick('dog')];
	const confirmed =
		cat?.status === 'CONFIRMED' && dog?.status === 'CONFIRMED' && cat.shelter_slug === dog.shelter_slug;
	const shelterSlug = confirmed ? cat.shelter_slug : ordered.find((r) => r.suggested_shelter)?.suggested_shelter;
	return {
		municipality_id: municipalityId,
		shelter_id: shelterSlug ? shelterId(shelterSlug) : null,
		status: confirmed ? 'CONFIRMED' : 'UNCONFIRMED',
		source: ordered.length === 1 ? ordered[0]!.source : ordered.map((r) => `${r.species}: ${r.source}`).join('; '),
		verified_at: new Date(ordered.map((r) => r.verified_at).sort()[0]!),
	};
}

export async function loadInitialDirectory(
	csv: { shelters: string; municipalities: string },
	ctx: Ctx
): Promise<{ shelters: number; municipalities: number }> {
	const shelterRows = parseCsv(csv.shelters).map(toShelterData);
	const assignmentRows = new Map<string, AssignmentCsvRow[]>();
	for (const row of parseCsv(csv.municipalities) as AssignmentCsvRow[])
		assignmentRows.set(row.municipality_slug, [...(assignmentRows.get(row.municipality_slug) ?? []), row]);
	return prisma.$transaction(async (tx) => {
		const shelterIds = new Map((await DirectoryDao.listShelterIds(tx)).map((s) => [s.slug, s.id]));
		const newShelters = shelterRows.filter((s) => !shelterIds.has(s.slug));
		for (const s of newShelters) shelterIds.set(s.slug, s.id!);
		const shelterId = (slug: string) => {
			const id = shelterIds.get(slug);
			if (!id) throw new AppError('VALIDATION', `Unknown shelter ${slug}`);
			return id;
		};
		const municipalityIds = new Map((await DirectoryDao.listMunicipalityIds(tx)).map((m) => [m.slug, m.id]));
		const assigned = new Set(await DirectoryDao.listAssignedMunicipalityIds(tx));
		const newAssignments = [...assignmentRows].flatMap(([slug, rows]) => {
			const id = municipalityIds.get(slug);
			if (id === undefined) throw new AppError('VALIDATION', `Unknown municipality ${slug} (run seeder 01-geo)`);
			return assigned.has(id) ? [] : [toAssignment(rows, id, shelterId)];
		});

		const created = await DirectoryDao.createShelters(newShelters, tx);
		const createdAssignments = await DirectoryDao.createAssignments(newAssignments, tx);
		const change = (entity: string, entity_id: string, row: { version: number; source: string }) => ({
			entity,
			entity_id,
			version: row.version,
			data: JSON.parse(JSON.stringify(row)) as Prisma.InputJsonValue,
			source: row.source,
			actor_id: ctx.actor?.user_id ?? null,
		});
		await DirectoryDao.createChanges(
			[
				...created.map((s) => change('shelter', s.id, s)),
				...createdAssignments.map((a) => change('municipality_shelter', String(a.municipality_id), a)),
			],
			tx
		);
		return { shelters: created.length, municipalities: createdAssignments.length };
	});
}

export default { getResponsibleShelter, listShelters, getShelter, listMunicipalities, loadInitialDirectory };
