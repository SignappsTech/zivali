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

// --- Lifecycle (C4 status machine and the report.lifecycle job, domains/reports/lifecycle.domain.ts) ---

/** findWithRole with the report row locked until the transaction ends: one status change at a time. */
export async function lockWithRole(short_code: string, user_id: string, tx: Prisma.TransactionClient) {
	await tx.$queryRaw`select 1 from app.reports where short_code = ${short_code} for update`;
	return findWithRole(short_code, user_id, tx);
}

/** The report row, locked until the transaction ends (the other side of a reunite). */
/** Locks the row; with `skipLocked` a row another transaction holds comes back null instead of waiting. */
export async function lockById(id: string, tx: Prisma.TransactionClient, skipLocked = false) {
	const locked = skipLocked
		? await tx.$queryRaw<unknown[]>`select 1 from app.reports where id = ${id}::uuid for update skip locked`
		: await tx.$queryRaw<unknown[]>`select 1 from app.reports where id = ${id}::uuid for update`;
	if (skipLocked && !locked.length) return null;
	return tx.reports.findUnique({ where: { id } });
}

export async function listManagers(report_ids: string[], tx?: Prisma.TransactionClient) {
	const db = tx ?? prisma;
	return db.report_managers.findMany({
		where: { report_id: { in: report_ids } },
		select: { report_id: true, user_id: true },
	});
}

/** Closing ends the manage link (C7): the finder email goes with it. */
export async function deleteContacts(report_ids: string[], tx?: Prisma.TransactionClient): Promise<void> {
	const db = tx ?? prisma;
	await db.report_contacts.deleteMany({ where: { report_id: { in: report_ids } } });
}

/** The report when the user manages it (notify.send variables of the report_* notifications). */
export async function findManaged(id: string, user_id: string, tx?: Prisma.TransactionClient) {
	const db = tx ?? prisma;
	return db.reports.findFirst({
		where: { id, managers: { some: { user_id } } },
		select: {
			short_code: true,
			type: true,
			status: true,
			close_reason: true,
			moderation_state: true,
			species: true,
			name: true,
			reminder_day: true,
			last_owner_update_at: true,
			closed_at: true,
		},
	});
}

/**
 * Up to `take` searching LOST reports created before `createdBefore` that have not had the reminder for `day` (or a
 * later one) yet: marks them reminded (claimed once, skip locked) and returns their ids.
 */
export async function claimReminders(
	input: { day: number; createdBefore: Date; take: number },
	tx: Prisma.TransactionClient
): Promise<{ id: string }[]> {
	const { day, createdBefore, take } = input;
	return tx.$queryRaw`
		update app.reports set reminder_day = ${day}
		where id in (
			select id from app.reports
			where type = 'lost' and status in ('open', 'matched') and moderation_state <> 'removed'
				and created_at <= ${createdBefore} and coalesce(reminder_day, 0) < ${day}
			limit ${take} for update skip locked)
		returning id::text as id`;
}

/** Searching (open or matched) reports idle since before the cut-off of their type; organisation intakes never expire (C4). */
const idleSince = (lostBefore: Date, foundBefore: Date) => Prisma.sql`
	status in ('open', 'matched') and moderation_state <> 'removed' and (
		(type = 'lost' and last_owner_update_at <= ${lostBefore})
		or (type <> 'lost' and source <> 'organisation' and last_owner_update_at <= ${foundBefore}))`;

type IdleCutoffs = { lostBefore: Date; foundBefore: Date; now: Date; take: number };

/** Up to `take` idle reports not yet warned in their current idle period: marks them warned and returns their ids. */
export async function claimExpiryWarnings(input: IdleCutoffs, tx: Prisma.TransactionClient): Promise<{ id: string }[]> {
	const { lostBefore, foundBefore, now, take } = input;
	return tx.$queryRaw`
		update app.reports set expiry_warned_at = ${now}
		where id in (
			select id from app.reports
			where ${idleSince(lostBefore, foundBefore)}
				and (expiry_warned_at is null or expiry_warned_at < last_owner_update_at)
			limit ${take} for update skip locked)
		returning id::text as id`;
}

export type ExpiredRow = {
	id: string;
	/** The status it had before the expiry (open or matched). */
	from_status: string;
	short_code: string;
	type: REPORT_TYPE;
	species: string;
	name: string | null;
	last_owner_update_at: Date;
	closed_at: Date;
	/** The finder email of an anonymous report (deleted by the caller in the same transaction). */
	email: string | null;
	/** The creator's profile locale, for that email. */
	locale: string | null;
};

/** Up to `take` idle reports closed as expired, manage token cleared (C4 `expire`). */
export async function expireIdle(input: IdleCutoffs, tx: Prisma.TransactionClient): Promise<ExpiredRow[]> {
	const { lostBefore, foundBefore, now, take } = input;
	return tx.$queryRaw`
		with picked as (
			select id, status::text as from_status from app.reports where ${idleSince(lostBefore, foundBefore)}
			limit ${take} for update skip locked),
		expired as (
			update app.reports r set status = 'closed', close_reason = 'expired', closed_at = ${now},
				manage_token_hash = null, updated_at = now()
			from picked
			where r.id = picked.id
			returning r.id, picked.from_status, r.short_code, r.type, r.species, r.name, r.last_owner_update_at,
				r.closed_at, r.created_by)
		select e.id::text as id, e.from_status, e.short_code, e.type::text as type, e.species::text as species, e.name,
			e.last_owner_update_at, e.closed_at, c.email, p.locale
		from expired e
		left join app.report_contacts c on c.report_id = e.id
		left join app.profiles p on p.id = e.created_by`;
}

/**
 * retention.blur_location (ADR-006): up to `take` reports closed or reunited at or before `endedBefore` whose stored
 * point is not their public centre yet get exact_point = public_point (skip locked). The circle and the area stay.
 * submission_hash goes too: a keyed digest of the body, it would let the received point be guessed inside the circle.
 */
export async function blurEnded(
	input: { endedBefore: Date; take: number },
	tx?: Prisma.TransactionClient
): Promise<number> {
	const db = tx ?? prisma;
	const { endedBefore, take } = input;
	return db.$executeRaw`
		update app.reports set exact_point = public_point, submission_hash = null, updated_at = now()
		where id in (
			select id from app.reports
			where ((status = 'closed' and closed_at <= ${endedBefore})
					or (status = 'reunited' and reunited_at <= ${endedBefore}))
				and (not extensions.st_equals(exact_point::extensions.geometry, public_point::extensions.geometry)
					or submission_hash is not null)
			limit ${take} for update skip locked)`;
}

/** Adds the manager; an existing manager row stays as it is (a repeated manage-link claim). */
export async function addManager(
	data: { report_id: string; user_id: string; role: 'owner' | 'finder' | 'staff' },
	tx?: Prisma.TransactionClient
): Promise<void> {
	const db = tx ?? prisma;
	await db.report_managers.createMany({ data: [data], skipDuplicates: true });
}

/** The finder email of an anonymous report (manage link, C7). */
export async function addContact(data: { report_id: string; email: string }, tx?: Prisma.TransactionClient) {
	const db = tx ?? prisma;
	await db.report_contacts.create({ data });
}

export async function getContactEmail(report_id: string, tx?: Prisma.TransactionClient): Promise<string | null> {
	const db = tx ?? prisma;
	return (await db.report_contacts.findUnique({ where: { report_id }, select: { email: true } }))?.email ?? null;
}

export async function findByManageToken(manage_token_hash: Uint8Array<ArrayBuffer>, tx?: Prisma.TransactionClient) {
	const db = tx ?? prisma;
	return db.reports.findUnique({
		where: { manage_token_hash },
		select: {
			id: true,
			short_code: true,
			status: true,
			moderation_state: true,
			closed_at: true,
			reunited_at: true,
		},
	});
}

/** The creator's report from an earlier submission with this client id (POST /v1/reports repeats, C17 outbox). */
export async function findBySubmission(created_by: string, submission_id: string, tx?: Prisma.TransactionClient) {
	const db = tx ?? prisma;
	return db.reports.findFirst({
		where: { created_by, submission_id },
		select: {
			id: true,
			short_code: true,
			type: true,
			species: true,
			moderation_state: true,
			manage_token_hash: true,
			submission_hash: true,
			event_at: true,
			created_at: true,
		},
	});
}

/** Reports sent from this device (anonymous reports carry the device hash) since the given time. */
export async function countByDevice(device_hash: string, since: Date, tx?: Prisma.TransactionClient) {
	const db = tx ?? prisma;
	return db.reports.count({ where: { device_hash, created_at: { gte: since } } });
}

/** Whether any of these photos has the same image (sha256) as a photo of a held or removed report. */
export async function photosMatchHeld(photo_ids: string[], tx?: Prisma.TransactionClient): Promise<boolean> {
	const db = tx ?? prisma;
	const photos = await db.photos.findMany({ where: { id: { in: photo_ids } }, select: { sha256: true } });
	if (!photos.length) return false;
	const match = await db.photos.findFirst({
		where: {
			sha256: { in: photos.map((p) => p.sha256) },
			report: { moderation_state: { in: ['held', 'removed'] } },
		},
		select: { id: true },
	});
	return match !== null;
}

/** An `anon_hold` moderation flag (C11) with the reasons the submission guard held the report for. */
export async function flagHeld(report_id: string, reasons: string[], tx?: Prisma.TransactionClient) {
	const db = tx ?? prisma;
	await db.moderation_flags.create({
		data: { kind: 'anon_hold', target_type: 'report', target_id: report_id, details: { reasons } },
	});
}

/** Retention: device hashes are only needed for the 7-day hold rule. */
export async function clearDeviceHashes(before: Date, tx?: Prisma.TransactionClient): Promise<number> {
	const db = tx ?? prisma;
	const { count } = await db.reports.updateMany({
		where: { device_hash: { not: null }, created_at: { lt: before } },
		data: { device_hash: null },
	});
	return count;
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

/** Several reports with the read model's relations, as a signed-out caller sees them (no manager row). */
export async function findByIds(ids: string[], tx?: Prisma.TransactionClient) {
	const db = tx ?? prisma;
	return db.reports.findMany({ where: { id: { in: ids } }, include: readInclude(undefined) });
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

/** Largest public radius (C6: the lost requested radius caps at 20 km); lets the area filter use the gist index. */
const MAX_PUBLIC_RADIUS_M = 20_000;

export type SyncRow = { id: string; updated_at: string; live: boolean };

/**
 * One page of the sync feed (C4): reports whose public circle meets one of the areas, keyset on (updated_at, id)
 * after the cursor; `live` = open or matched and visible. Without a cursor (first sync) only live reports.
 * `updated_at` comes back as text with microseconds so the cursor is exact.
 */
export async function syncPage(
	input: {
		areas: (Point & { radius_m: number })[];
		after: { at: string; id: string } | null;
		take: number;
	},
	tx?: Prisma.TransactionClient
): Promise<SyncRow[]> {
	const db = tx ?? prisma;
	const { areas, after, take } = input;
	const inArea = Prisma.join(
		areas.map(
			(
				a
			) => Prisma.sql`(extensions.st_dwithin(r.public_point, ${point(a)}, ${a.radius_m + MAX_PUBLIC_RADIUS_M}::float8)
				and extensions.st_dwithin(r.public_point, ${point(a)}, ${a.radius_m}::float8 + r.public_radius_m))`
		),
		' or '
	);
	const live = Prisma.sql`(r.status in ('open', 'matched') and r.moderation_state = 'visible')`;
	return db.$queryRaw<SyncRow[]>`
		select r.id::text as id, ${live} as live,
			to_char(r.updated_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') as updated_at
		from app.reports r
		where (${inArea})
			and ${after ? Prisma.sql`(r.updated_at, r.id) > (${after.at}::timestamptz, ${after.id}::uuid)` : live}
		order by r.updated_at, r.id
		limit ${take}`;
}

export type ReportRow = NonNullable<Awaited<ReturnType<typeof findByCode>>>;

export default {
	insertReport,
	setLocation,
	getLocations,
	getLocation,
	updateReport,
	lockWithRole,
	lockById,
	listManagers,
	deleteContacts,
	findManaged,
	claimReminders,
	claimExpiryWarnings,
	expireIdle,
	blurEnded,
	addManager,
	addContact,
	getContactEmail,
	findByManageToken,
	findBySubmission,
	countByDevice,
	photosMatchHeld,
	flagHeld,
	clearDeviceHashes,
	findByCode,
	findByIds,
	findWithRole,
	listByManager,
	lockOwnPet,
	findOpenLostByPet,
	findType,
	setPhotos,
	releaseHeld,
	syncPage,
};
