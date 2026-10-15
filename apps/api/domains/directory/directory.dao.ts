// Prisma access for the responsible-shelter directory (C18). Geo parts are parameterised $queryRaw (C6).
import { Prisma } from '../../generated/client.ts';
import { prisma } from '../../prisma/prisma.ts';

const shelterPoint = Prisma.sql`extensions.st_setsrid(extensions.st_makepoint(s.lng, s.lat), 4326)::extensions.geography`;

export type ShelterListRow = {
	slug: string;
	name: string;
	city: string;
	phone: string;
	phone_display: string;
	source: string;
	verified_at: Date;
	species: string[];
	area_sl: string | null;
	area_en: string | null;
	municipality_count: number;
};

/** Active shelters with their statistical region (from lat/lng) and the number of confirmed municipalities. */
export async function listActiveShelters(tx?: Prisma.TransactionClient) {
	return (tx ?? prisma).$queryRaw<ShelterListRow[]>`
		select s.slug, s.name, s.city, s.phone, s.phone_display, s.source, s.verified_at, s.species,
			r.name_sl as area_sl, r.name_en as area_en,
			(select count(*)::int from app.municipality_shelters ms
				where ms.shelter_id = s.id and ms.status = 'CONFIRMED') as municipality_count
		from app.shelters s
		left join lateral (
			select name_sl, name_en from app.regions r
			where s.lat is not null and extensions.st_covers(r.geom, ${shelterPoint})
			order by r.id limit 1
		) r on true
		where s.active`;
}

export async function findShelterBySlug(slug: string, tx?: Prisma.TransactionClient) {
	return (tx ?? prisma).shelters.findUnique({
		where: { slug },
		include: { municipality_shelters: { where: { status: 'CONFIRMED' }, select: { municipality_id: true } } },
	});
}

export async function findMunicipality(where: { slug: string } | { id: number }, tx?: Prisma.TransactionClient) {
	return (tx ?? prisma).municipalities.findUnique({ where, select: { id: true, slug: true, name_sl: true } });
}

export async function listMunicipalitiesById(ids: number[], tx?: Prisma.TransactionClient) {
	return (tx ?? prisma).municipalities.findMany({
		where: { id: { in: ids } },
		select: { slug: true, name_sl: true },
	});
}

export async function findAssignment(municipality_id: number, tx?: Prisma.TransactionClient) {
	return (tx ?? prisma).municipality_shelters.findUnique({ where: { municipality_id }, include: { shelter: true } });
}

/** Every municipality with the slug of its confirmed, active shelter (else null). */
export async function listMunicipalityShelters(tx?: Prisma.TransactionClient) {
	return (tx ?? prisma).$queryRaw<{ slug: string; name: string; shelter_slug: string | null }[]>`
		select m.slug, m.name_sl as name,
			case when ms.status = 'CONFIRMED' and s.active then s.slug end as shelter_slug
		from app.municipalities m
		left join app.municipality_shelters ms on ms.municipality_id = m.id
		left join app.shelters s on s.id = ms.shelter_id`;
}

/** Active shelters with a location, nearest first, from a point or from the municipality's centroid (km, 1 decimal). */
export async function shelterDistances(
	from: { lat: number; lng: number } | { municipality_id: number },
	tx?: Prisma.TransactionClient
) {
	const origin =
		'municipality_id' in from
			? Prisma.sql`(select extensions.st_centroid(m.geom) from app.municipalities m where m.id = ${from.municipality_id})`
			: Prisma.sql`extensions.st_setsrid(extensions.st_makepoint(${from.lng}, ${from.lat}), 4326)::extensions.geography`;
	return (tx ?? prisma).$queryRaw<{ slug: string; name: string; phone: string; distance_km: number }[]>`
		select s.slug, s.name, s.phone,
			round((extensions.st_distance(${shelterPoint}, o.origin) / 1000)::numeric, 1)::float8 as distance_km
		from app.shelters s, (select ${origin} as origin) o
		where s.active and s.lat is not null and s.lng is not null
		order by distance_km, s.slug`;
}

// Initial load (seeder 05-directory).

export async function listShelterIds(tx?: Prisma.TransactionClient) {
	return (tx ?? prisma).shelters.findMany({ select: { id: true, slug: true } });
}

export async function listMunicipalityIds(tx?: Prisma.TransactionClient) {
	return (tx ?? prisma).municipalities.findMany({ select: { id: true, slug: true } });
}

export async function listAssignedMunicipalityIds(tx?: Prisma.TransactionClient) {
	const rows = await (tx ?? prisma).municipality_shelters.findMany({ select: { municipality_id: true } });
	return rows.map((row) => row.municipality_id);
}

export async function createShelters(data: Prisma.sheltersCreateManyInput[], tx?: Prisma.TransactionClient) {
	return (tx ?? prisma).shelters.createManyAndReturn({ data });
}

export async function createAssignments(
	data: Prisma.municipality_sheltersCreateManyInput[],
	tx?: Prisma.TransactionClient
) {
	return (tx ?? prisma).municipality_shelters.createManyAndReturn({ data });
}

export async function createChanges(data: Prisma.directory_changesCreateManyInput[], tx?: Prisma.TransactionClient) {
	return (tx ?? prisma).directory_changes.createMany({ data });
}

// Admin edits (TASK-89, C18 §Admin). Updates bump `version`; with an expected version they are optimistic (null or
// false when another write came first).

/** Every shelter, inactive ones too, with the number of confirmed municipalities. */
export async function listAllShelters(tx?: Prisma.TransactionClient) {
	return (tx ?? prisma).shelters.findMany({
		include: { _count: { select: { municipality_shelters: { where: { status: 'CONFIRMED' } } } } },
	});
}

export async function createShelter(data: Prisma.sheltersUncheckedCreateInput, tx?: Prisma.TransactionClient) {
	return (tx ?? prisma).shelters.create({ data });
}

export async function updateShelter(
	id: string,
	expectedVersion: number | undefined,
	data: Prisma.sheltersUpdateManyMutationInput,
	tx?: Prisma.TransactionClient
) {
	const db = tx ?? prisma;
	const where = expectedVersion === undefined ? { id } : { id, version: expectedVersion };
	const { count } = await db.shelters.updateMany({ where, data: { ...data, version: { increment: 1 } } });
	return count ? db.shelters.findUniqueOrThrow({ where: { id } }) : null;
}

export async function listConfirmedMunicipalityIds(shelter_id: string, tx?: Prisma.TransactionClient) {
	const rows = await (tx ?? prisma).municipality_shelters.findMany({
		where: { shelter_id, status: 'CONFIRMED' },
		select: { municipality_id: true },
	});
	return rows.map((row) => row.municipality_id);
}

export async function listAllAssignments(tx?: Prisma.TransactionClient) {
	return (tx ?? prisma).municipality_shelters.findMany();
}

export type AdminAssignmentRow = {
	slug: string;
	name: string;
	shelter_slug: string | null;
	status: 'CONFIRMED' | 'UNCONFIRMED';
	source: string;
	verified_at: Date;
	version: number;
};

/** Assignments with the municipality and the shelter slug (confirmed or likely); one municipality when given. */
export async function listAdminAssignments(municipality_id?: number, tx?: Prisma.TransactionClient) {
	return (tx ?? prisma).$queryRaw<AdminAssignmentRow[]>`
		select m.slug, m.name_sl as name, s.slug as shelter_slug, ms.status::text as status, ms.source, ms.verified_at,
			ms.version
		from app.municipality_shelters ms
		join app.municipalities m on m.id = ms.municipality_id
		left join app.shelters s on s.id = ms.shelter_id
		${municipality_id === undefined ? Prisma.empty : Prisma.sql`where ms.municipality_id = ${municipality_id}`}`;
}

type AssignmentData = Omit<Prisma.municipality_sheltersUncheckedCreateInput, 'version'>;

/** Creates the assignment (version 1) or overwrites it (version bumped). */
export async function saveAssignment(data: AssignmentData, tx?: Prisma.TransactionClient) {
	const { municipality_id, ...fields } = data;
	return (tx ?? prisma).municipality_shelters.upsert({
		where: { municipality_id },
		create: data,
		update: { ...fields, version: { increment: 1 } },
	});
}

export async function updateAssignment(
	municipality_id: number,
	expectedVersion: number,
	data: Omit<AssignmentData, 'municipality_id'>,
	tx?: Prisma.TransactionClient
) {
	const db = tx ?? prisma;
	const { count } = await db.municipality_shelters.updateMany({
		where: { municipality_id, version: expectedVersion },
		data: { ...data, version: { increment: 1 } },
	});
	return count ? db.municipality_shelters.findUniqueOrThrow({ where: { municipality_id } }) : null;
}

export async function listChanges(entity: string, entity_id: string, tx?: Prisma.TransactionClient) {
	return (tx ?? prisma).directory_changes.findMany({ where: { entity, entity_id }, orderBy: { version: 'desc' } });
}

/** Active shelters and assignments last verified before `before`, by name. */
export async function listStaleEntries(before: Date, tx?: Prisma.TransactionClient) {
	const db = tx ?? prisma;
	const shelters = await db.shelters.findMany({
		where: { active: true, verified_at: { lt: before } },
		select: { name: true, verified_at: true },
	});
	const municipalities = await db.$queryRaw<{ name: string; verified_at: Date }[]>`
		select m.name_sl as name, ms.verified_at
		from app.municipality_shelters ms join app.municipalities m on m.id = ms.municipality_id
		where ms.verified_at < ${before}`;
	return { shelters, municipalities };
}

/** Email addresses of the admins whose address is confirmed (auth.users, never user_metadata). */
export async function listAdminEmails(tx?: Prisma.TransactionClient): Promise<string[]> {
	const rows = await (tx ?? prisma).$queryRaw<{ email: string }[]>`
		select u.email
		from app.profiles p join auth.users u on u.id = p.id
		where p.role = 'ADMIN' and u.email is not null and u.email_confirmed_at is not null`;
	return rows.map((row) => row.email);
}

export default {
	listActiveShelters,
	findShelterBySlug,
	findMunicipality,
	listMunicipalitiesById,
	findAssignment,
	listMunicipalityShelters,
	shelterDistances,
	listShelterIds,
	listMunicipalityIds,
	listAssignedMunicipalityIds,
	createShelters,
	createAssignments,
	createChanges,
	listAllShelters,
	createShelter,
	updateShelter,
	listConfirmedMunicipalityIds,
	listAllAssignments,
	listAdminAssignments,
	saveAssignment,
	updateAssignment,
	listChanges,
	listStaleEntries,
	listAdminEmails,
};
