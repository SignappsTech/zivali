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
};
