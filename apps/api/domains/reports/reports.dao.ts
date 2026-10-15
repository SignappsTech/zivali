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

export async function getLocation(id: string, tx?: Prisma.TransactionClient): Promise<StoredLocation | null> {
	const db = tx ?? prisma;
	const [row] = await db.$queryRaw<
		(Omit<StoredLocation, 'exact' | 'public'> &
			Record<'exact_lat' | 'exact_lng' | 'public_lat' | 'public_lng', number>)[]
	>`
		select type::text as type, requested_radius_m, public_radius_m,
			extensions.st_y(exact_point::extensions.geometry) as exact_lat,
			extensions.st_x(exact_point::extensions.geometry) as exact_lng,
			extensions.st_y(public_point::extensions.geometry) as public_lat,
			extensions.st_x(public_point::extensions.geometry) as public_lng
		from app.reports where id = ${id}::uuid`;
	if (!row) return null;
	return {
		type: row.type,
		requested_radius_m: row.requested_radius_m,
		public_radius_m: row.public_radius_m,
		exact: { lat: row.exact_lat, lng: row.exact_lng },
		public: { lat: row.public_lat, lng: row.public_lng },
	};
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

/** A report with what its read model needs; `managers` holds only the caller's row (none when signed out). */
export async function findByCode(short_code: string, userId: string | undefined, tx?: Prisma.TransactionClient) {
	const db = tx ?? prisma;
	return db.reports.findUnique({
		where: { short_code },
		include: {
			managers: { where: { user_id: { in: userId ? [userId] : [] } }, select: { role: true } },
			photos: {
				where: { status: 'published' },
				orderBy: { position: 'asc' },
				select: { public_display_url: true, public_thumb_url: true, width: true, height: true },
			},
			municipality: { select: { slug: true } },
			region: { select: { slug: true } },
			linked_report: { select: { short_code: true } },
		},
	});
}

export type ReportRow = NonNullable<Awaited<ReturnType<typeof findByCode>>>;

export default { insertReport, setLocation, getLocation, updateReport, addManager, findByCode };
