// Prisma access for reports (C4). Points are geography columns, so they are written and read with $queryRaw
// (Prisma.sql, parameterised) and only ever hold the coarsened point and the fuzzed centre (C6, ADR-006).
import type { REPORT_TYPE } from '../../generated/enums.ts';
import { Prisma } from '../../generated/client.ts';
import type { FuzzedArea, Point } from '../../lib/fuzz.ts';
import { prisma } from '../../prisma/prisma.ts';

export type LocationColumns = {
	exact: Point;
	area: FuzzedArea;
	requested_radius_m: number | null;
	municipality_id: number | null;
	region_id: number | null;
	in_slovenia: boolean;
};

export type StoredLocation = {
	type: REPORT_TYPE;
	requested_radius_m: number | null;
	exact: Point;
	public: Point;
	public_radius_m: number;
};

const point = ({ lat, lng }: Point) =>
	Prisma.sql`extensions.st_setsrid(extensions.st_makepoint(${lng}, ${lat}), 4326)::extensions.geography`;

/** The row with its point columns; false when the short code is taken (the caller draws a new one). */
export async function insertReport(
	row: { id: string; short_code: string; type: REPORT_TYPE; species: string; event_at: Date } & LocationColumns,
	tx?: Prisma.TransactionClient
): Promise<boolean> {
	const db = tx ?? prisma;
	const inserted = await db.$executeRaw`
		insert into app.reports (id, short_code, type, species, event_at, exact_point, public_point, public_radius_m,
			requested_radius_m, municipality_id, region_id, in_slovenia)
		values (${row.id}::uuid, ${row.short_code}, ${row.type}::app."REPORT_TYPE", ${row.species}::app."SPECIES",
			${row.event_at}, ${point(row.exact)}, ${point(row.area)}, ${row.area.radius_m}, ${row.requested_radius_m},
			${row.municipality_id}, ${row.region_id}, ${row.in_slovenia})
		on conflict (short_code) do nothing`;
	return inserted === 1;
}

export async function setLocation(id: string, cols: LocationColumns, tx?: Prisma.TransactionClient): Promise<void> {
	const db = tx ?? prisma;
	await db.$executeRaw`
		update app.reports set exact_point = ${point(cols.exact)}, public_point = ${point(cols.area)},
			public_radius_m = ${cols.area.radius_m}, requested_radius_m = ${cols.requested_radius_m},
			municipality_id = ${cols.municipality_id}, region_id = ${cols.region_id}, in_slovenia = ${cols.in_slovenia},
			updated_at = now()
		where id = ${id}::uuid`;
}

/** Stored points of several reports by id (one query for a list page). */
export async function getLocations(ids: string[], tx?: Prisma.TransactionClient): Promise<Map<string, StoredLocation>> {
	const db = tx ?? prisma;
	const rows = await db.$queryRaw<
		(Omit<StoredLocation, 'exact' | 'public'> & { id: string } & Record<
				'exact_lat' | 'exact_lng' | 'public_lat' | 'public_lng',
				number
			>)[]
	>`
		select id::text as id, type::text as type, requested_radius_m, public_radius_m,
			extensions.st_y(exact_point::extensions.geometry) as exact_lat,
			extensions.st_x(exact_point::extensions.geometry) as exact_lng,
			extensions.st_y(public_point::extensions.geometry) as public_lat,
			extensions.st_x(public_point::extensions.geometry) as public_lng
		from app.reports where id = any(${ids}::uuid[])`;
	return new Map(
		rows.map((row) => [
			row.id,
			{
				type: row.type,
				requested_radius_m: row.requested_radius_m,
				public_radius_m: row.public_radius_m,
				exact: { lat: row.exact_lat, lng: row.exact_lng },
				public: { lat: row.public_lat, lng: row.public_lng },
			},
		])
	);
}

export async function getLocation(id: string, tx?: Prisma.TransactionClient): Promise<StoredLocation | null> {
	return (await getLocations([id], tx)).get(id) ?? null;
}

export async function updateReport(
	id: string,
	data: Prisma.reportsUncheckedUpdateInput,
	tx?: Prisma.TransactionClient
): Promise<void> {
	const db = tx ?? prisma;
	await db.reports.update({ where: { id }, data, select: { id: true } });
}

export async function addManager(
	data: { report_id: string; user_id: string; role: 'owner' | 'finder' | 'staff' },
	tx?: Prisma.TransactionClient
): Promise<void> {
	const db = tx ?? prisma;
	await db.report_managers.create({ data });
}

/** What the read model needs; `managers` holds only the caller's row (none when signed out). */
const readInclude = (userId: string | undefined) =>
	({
		managers: { where: { user_id: { in: userId ? [userId] : [] } }, select: { role: true } },
		photos: {
			where: { status: 'published' },
			orderBy: { position: 'asc' },
			select: { public_display_url: true, public_thumb_url: true, width: true, height: true },
		},
		municipality: { select: { slug: true } },
		region: { select: { slug: true } },
		linked_report: { select: { short_code: true } },
	}) satisfies Prisma.reportsInclude;

export async function findByCode(short_code: string, userId: string | undefined, tx?: Prisma.TransactionClient) {
	const db = tx ?? prisma;
	return db.reports.findUnique({ where: { short_code }, include: readInclude(userId) });
}

/**
 * The report's columns and the user's manager role (null when not a manager), without relation includes: Prisma runs
 * those concurrently, which one transaction connection does not allow.
 */
export async function findWithRole(short_code: string, user_id: string, tx: Prisma.TransactionClient) {
	const report = await tx.reports.findUnique({ where: { short_code } });
	if (!report) return null;
	const manager = await tx.report_managers.findUnique({
		where: { report_id_user_id: { report_id: report.id, user_id } },
		select: { role: true },
	});
	return { report, role: manager?.role ?? null };
}

/** Reports the user manages, newest first, keyset on (created_at, id); the cursor is the last item's id. */
export async function listByManager(
	input: { user_id: string; cursor?: string; take: number },
	tx?: Prisma.TransactionClient
) {
	const db = tx ?? prisma;
	const { user_id, cursor, take } = input;
	const mine = { managers: { some: { user_id } } };
	const after = cursor
		? await db.reports.findFirst({ where: { id: cursor, ...mine }, select: { id: true, created_at: true } })
		: null;
	if (cursor && !after) return [];
	return db.reports.findMany({
		where: {
			...mine,
			...(after && {
				OR: [{ created_at: { lt: after.created_at } }, { created_at: after.created_at, id: { lt: after.id } }],
			}),
		},
		orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
		take,
		include: readInclude(user_id),
	});
}

/** The caller's own pet (not archived), row-locked until the transaction ends: one open lost report per pet. */
export async function lockOwnPet(id: string, owner_id: string, tx: Prisma.TransactionClient) {
	await tx.$queryRaw`select 1 from app.pets where id = ${id}::uuid for update`;
	return tx.pets.findFirst({ where: { id, owner_id, archived_at: null } });
}

/** An open or matched lost report of the pet, other than `exceptId`. */
export async function findOpenLostByPet(pet_id: string, exceptId: string | undefined, tx?: Prisma.TransactionClient) {
	const db = tx ?? prisma;
	return db.reports.findFirst({
		where: {
			pet_id,
			type: 'lost',
			status: { in: ['open', 'matched'] },
			...(exceptId && { id: { not: exceptId } }),
		},
		select: { id: true, short_code: true },
	});
}

export async function findType(id: string, tx?: Prisma.TransactionClient): Promise<REPORT_TYPE | null> {
	const db = tx ?? prisma;
	return (await db.reports.findUnique({ where: { id }, select: { type: true } }))?.type ?? null;
}

/** A photo that had public copies, as photo-objects' publicObjects needs it. */
type PublicPhoto = {
	id: string;
	report_id: string;
	public_display_url: string | null;
	public_thumb_url: string | null;
};

/**
 * Sets the report's photos in order (position = index): the owner's unattached uploads or photos already on this
 * report; photos left out are detached (and unpublished). Returns how many of `photo_ids` were attached and the photos that
 * were public.
 */
export async function setPhotos(
	input: { report_id: string; owner_id: string; photo_ids: string[] },
	tx: Prisma.TransactionClient
): Promise<{ attached: number; unpublished: PublicPhoto[] }> {
	const { report_id, owner_id, photo_ids } = input;
	// Detached photos that were public go back to unpublished; their public copies are deleted by the caller.
	const detached = await tx.photos.findMany({
		where: { report_id, id: { notIn: photo_ids } },
		select: { id: true, status: true, public_display_url: true, public_thumb_url: true },
	});
	const ids = detached.map((p) => p.id);
	await tx.photos.updateMany({
		where: { id: { in: ids }, status: 'published' },
		data: { status: 'unpublished' },
	});
	await tx.photos.updateMany({
		where: { id: { in: ids } },
		data: { report_id: null, public_display_url: null, public_thumb_url: null },
	});
	let attached = 0;
	for (const [position, id] of photo_ids.entries()) {
		const { count } = await tx.photos.updateMany({
			where: { id, OR: [{ report_id }, { owner_id, report_id: null, pet_id: null }] },
			data: { report_id, position },
		});
		attached += count;
	}
	const unpublished = detached
		.filter((p) => p.public_display_url || p.public_thumb_url)
		.map(({ id, public_display_url, public_thumb_url }) => ({
			id,
			report_id,
			public_display_url,
			public_thumb_url,
		}));
	return { attached, unpublished };
}

/** held → visible; the report type, or null when the report is missing or not held. */
export async function releaseHeld(id: string, tx?: Prisma.TransactionClient): Promise<REPORT_TYPE | null> {
	const db = tx ?? prisma;
	const [row] = await db.$queryRaw<{ type: REPORT_TYPE }[]>`
		update app.reports set moderation_state = 'visible', updated_at = now()
		where id = ${id}::uuid and moderation_state = 'held'
		returning type::text as type`;
	return row?.type ?? null;
}

export type ReportRow = NonNullable<Awaited<ReturnType<typeof findByCode>>>;

export default {
	insertReport,
	setLocation,
	getLocations,
	getLocation,
	updateReport,
	addManager,
	findByCode,
	findWithRole,
	listByManager,
	lockOwnPet,
	findOpenLostByPet,
	findType,
	setPhotos,
	releaseHeld,
};
