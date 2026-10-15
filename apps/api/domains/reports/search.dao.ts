// Public report search (C4 ReportSearch: GET /v1/reports and /v1/reports/map) as parameterised $queryRaw (Prisma.sql;
// TypedSQL needs a live database at build time, CH-117). Viewport, distance and map areas use public_point only, never
// exact_point (CH-148), so moving the query point cannot narrow down the stored point; GiST reports_public_point_idx.
import type { BBox, Colour, ReportManagerRole, ReportSort, ReportType, Size, Species } from '@zivali/types';

import { Prisma } from '../../generated/client.ts';
import { prisma } from '../../prisma/prisma.ts';

export type SearchFilters = {
	bbox?: BBox;
	near?: { lat: number; lng: number; km: number };
	types?: ReportType[];
	species?: Species[];
	colours?: Colour[];
	sizes?: Size[];
	from?: string;
	to?: string;
	include_closed?: boolean;
};

export type MapRow = {
	id: string;
	short_code: string;
	type: ReportType;
	species: Species;
	lat: number;
	lng: number;
	radius_m: number;
	boosted: boolean;
	thumb_url: string | null;
};

const point = ({ lat, lng }: { lat: number; lng: number }) =>
	Prisma.sql`extensions.st_setsrid(extensions.st_makepoint(${lng}, ${lat}), 4326)::extensions.geography`;
const boosted = (t: Prisma.Sql, now: Date) => Prisma.sql`coalesce(${t}.boosted_until > ${now}, false)`;
const R = Prisma.raw('r');
const C = Prisma.raw('c');

/**
 * Visible reports only; open and matched, plus with include_closed those closed or reunited after `closedSince`
 * (closed ≤ 30 days, as GET /v1/reports/:code). Expired reports are closed, so they follow the same rule.
 */
export function searchWhere(f: SearchFilters, closedSince: Date): Prisma.Sql {
	const conds = [
		Prisma.sql`r.moderation_state = 'visible'`,
		f.include_closed
			? Prisma.sql`(r.status in ('open', 'matched') or (r.status = 'closed' and r.closed_at > ${closedSince})
				or (r.status = 'reunited' and r.reunited_at > ${closedSince}))`
			: Prisma.sql`r.status in ('open', 'matched')`,
	];
	if (f.bbox) {
		const [w, s, e, n] = f.bbox;
		conds.push(
			Prisma.sql`extensions.st_intersects(r.public_point,
				extensions.st_makeenvelope(${w}, ${s}, ${e}, ${n}, 4326)::extensions.geography)`
		);
	}
	if (f.near) conds.push(Prisma.sql`extensions.st_dwithin(r.public_point, ${point(f.near)}, ${f.near.km * 1000})`);
	if (f.types) conds.push(Prisma.sql`r.type = any(${f.types}::app."REPORT_TYPE"[])`);
	if (f.species) conds.push(Prisma.sql`r.species = any(${f.species}::app."SPECIES"[])`);
	if (f.colours) conds.push(Prisma.sql`r.colours && ${f.colours}::app."COLOUR"[]`);
	if (f.sizes) conds.push(Prisma.sql`r.size = any(${f.sizes}::app."SIZE"[])`);
	if (f.from) conds.push(Prisma.sql`r.event_at >= ${new Date(f.from)}`);
	if (f.to) conds.push(Prisma.sql`r.event_at <= ${new Date(f.to)}`);
	return Prisma.join(conds, ' and ');
}

export async function countReports(
	f: SearchFilters,
	closedSince: Date,
	tx?: Prisma.TransactionClient
): Promise<number> {
	const db = tx ?? prisma;
	const [row] = await db.$queryRaw<{ n: number }[]>`
		select count(*)::int as n from app.reports r where ${searchWhere(f, closedSince)}`;
	return row?.n ?? 0;
}

/**
 * One page of ids. Boosted first; then `recent` = event_at desc, id desc, or `distance` (needs `near`) = distance of
 * the public centre asc, id asc. Keyset: `cursor` is the previous page's last id, whose sort keys are recomputed.
 */
export async function searchIds(
	input: SearchFilters & { sort: ReportSort; cursor?: string; take: number; now: Date; closedSince: Date },
	tx?: Prisma.TransactionClient
): Promise<string[]> {
	const db = tx ?? prisma;
	const { sort, cursor, take, now, near } = input;
	const dist = (t: Prisma.Sql) => Prisma.sql`extensions.st_distance(${t}.public_point, ${point(near!)})`;
	// Row comparisons need one direction: recent is all descending, distance all ascending (not boosted first).
	const key = (t: Prisma.Sql) =>
		sort === 'distance'
			? Prisma.sql`not ${boosted(t, now)}, ${dist(t)}, ${t}.id`
			: Prisma.sql`${boosted(t, now)}, ${t}.event_at, ${t}.id`;
	const order =
		sort === 'distance'
			? Prisma.sql`not ${boosted(R, now)}, ${dist(R)}, r.id`
			: Prisma.sql`${boosted(R, now)} desc, r.event_at desc, r.id desc`;
	// An unknown cursor id makes the subquery empty, so the page is empty.
	const after = cursor
		? Prisma.sql`and (${key(R)}) ${Prisma.raw(sort === 'distance' ? '>' : '<')}
			(select ${key(C)} from app.reports c where c.id = ${cursor}::uuid)`
		: Prisma.empty;
	const rows = await db.$queryRaw<{ id: string }[]>`
		select r.id::text as id from app.reports r
		where ${searchWhere(input, input.closedSince)} ${after}
		order by ${order}
		limit ${take}`;
	return rows.map((row) => row.id);
}

/** Minimal map items in the viewport, boosted first, then the latest events; thumb = first published photo. */
export async function mapReports(
	input: SearchFilters & { bbox: BBox; take: number; now: Date; closedSince: Date },
	tx?: Prisma.TransactionClient
): Promise<MapRow[]> {
	const db = tx ?? prisma;
	const { take, now } = input;
	return db.$queryRaw<MapRow[]>`
		select r.id::text as id, r.short_code, r.type::text as type, r.species::text as species,
			extensions.st_y(r.public_point::extensions.geometry) as lat,
			extensions.st_x(r.public_point::extensions.geometry) as lng,
			r.public_radius_m as radius_m, ${boosted(R, now)} as boosted,
			(select p.public_thumb_url from app.photos p
				where p.report_id = r.id and p.status = 'published' and p.public_thumb_url is not null
				order by p.position limit 1) as thumb_url
		from app.reports r
		where ${searchWhere(input, input.closedSince)}
		order by ${boosted(R, now)} desc, r.event_at desc, r.id desc
		limit ${take}`;
}

/** The user's manager role per report, for those of `ids` they manage (is_mine on public list items). */
export async function managerRoles(
	ids: string[],
	user_id: string,
	tx?: Prisma.TransactionClient
): Promise<Map<string, ReportManagerRole>> {
	const db = tx ?? prisma;
	const rows = await db.report_managers.findMany({
		where: { report_id: { in: ids }, user_id },
		select: { report_id: true, role: true },
	});
	return new Map(rows.map((row) => [row.report_id, row.role as ReportManagerRole]));
}

export default { countReports, searchIds, mapReports, managerRoles };
