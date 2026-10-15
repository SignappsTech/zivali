// Prisma access for ad serving, impressions and administration (C14). Every function takes an optional transaction
// client (ADR-020). Targeting arrays (region_ids, municipality_ids, species) that are NULL or empty mean "every".
import type { Prisma } from '../../generated/client.ts';
import type { AD_SLOT, SPECIES } from '../../generated/enums.ts';
import { prisma } from '../../prisma/prisma.ts';

type Tx = Prisma.TransactionClient;

export type LiveAdFilter = {
	slot: AD_SLOT;
	locale: string;
	now: Date;
	region_id?: number;
	municipality_id?: number;
	species?: SPECIES;
};

/** Active, in-date ads (house and sponsor) for the slot, locale and targeting context. */
export async function listLive({ slot, locale, now, region_id, municipality_id, species }: LiveAdFilter, tx?: Tx) {
	return (tx ?? prisma).ads.findMany({
		where: {
			deleted_at: null,
			status: 'active',
			slots: { has: slot },
			locales: { has: locale },
			AND: [
				{ OR: [{ starts_at: null }, { starts_at: { lte: now } }] },
				{ OR: [{ ends_at: null }, { ends_at: { gt: now } }] },
				{
					OR: [
						{ region_ids: { equals: null } },
						{ region_ids: { isEmpty: true } },
						...(region_id === undefined ? [] : [{ region_ids: { has: region_id } }]),
					],
				},
				{
					OR: [
						{ municipality_ids: { equals: null } },
						{ municipality_ids: { isEmpty: true } },
						...(municipality_id === undefined ? [] : [{ municipality_ids: { has: municipality_id } }]),
					],
				},
				{
					OR: [
						{ species: { equals: null } },
						{ species: { isEmpty: true } },
						...(species === undefined ? [] : [{ species: { has: species } }]),
					],
				},
			],
		},
	});
}

export type AdRow = Awaited<ReturnType<typeof listLive>>[number];

export async function regionOfMunicipality(id: number, tx?: Tx): Promise<number | undefined> {
	const row = await (tx ?? prisma).municipalities.findUnique({ where: { id }, select: { region_id: true } });
	return row?.region_id;
}

/**
 * Another live-or-scheduled exclusive ad sharing a slot, a region (NULL or empty = every region) and dates
 * (NULL = open-ended) with the given one. Service check only: no exclusion constraint on arrays (C14).
 */
export async function findExclusiveOverlap(
	ad: { id?: string; slots: AD_SLOT[]; region_ids?: number[] | null; starts_at: Date | null; ends_at: Date | null },
	tx?: Tx
) {
	return (tx ?? prisma).ads.findFirst({
		where: {
			...(ad.id && { id: { not: ad.id } }),
			deleted_at: null,
			exclusive: true,
			status: { not: 'ended' },
			slots: { hasSome: ad.slots },
			AND: [
				ad.region_ids?.length
					? {
							OR: [
								{ region_ids: { equals: null } },
								{ region_ids: { isEmpty: true } },
								{ region_ids: { hasSome: ad.region_ids } },
							],
						}
					: {},
				ad.ends_at ? { OR: [{ starts_at: null }, { starts_at: { lt: ad.ends_at } }] } : {},
				ad.starts_at ? { OR: [{ ends_at: null }, { ends_at: { gt: ad.starts_at } }] } : {},
			],
		},
		select: { id: true, title: true },
	});
}

/**
 * +1 impression in ad_stats_daily in one INSERT … ON CONFLICT (concurrent posts never lose a count). An unknown
 * region id is stored as 0. Returns 0 when the ad does not exist, is deleted or does not run in the slot.
 */
export async function addImpression(
	{ day, ad_id, slot, region_id }: { day: string; ad_id: string; slot: AD_SLOT; region_id: number },
	tx?: Tx
): Promise<number> {
	return (tx ?? prisma).$executeRaw`
		insert into app.ad_stats_daily (day, ad_id, slot, region_id, impressions)
		select ${day}::date, a.id, ${slot}::app."AD_SLOT",
			coalesce((select r.id from app.regions r where r.id = ${region_id}::int), 0), 1
		from app.ads a
		where a.id = ${ad_id}::uuid and a.deleted_at is null and ${slot}::app."AD_SLOT" = any(a.slots)
		on conflict (day, ad_id, slot, region_id) do update set impressions = app.ad_stats_daily.impressions + 1`;
}

/**
 * +1 click in ad_stats_daily and the ad's stored link in one statement. Only an active, not deleted ad that runs in
 * the slot counts; otherwise nothing is written and undefined is returned. An unknown region id is stored as 0.
 */
export async function addClick(
	{ day, ad_id, slot, region_id }: { day: string; ad_id: string; slot: AD_SLOT; region_id: number },
	tx?: Tx
): Promise<string | undefined> {
	const rows = await (tx ?? prisma).$queryRaw<{ link_url: string }[]>`
		with ad as (
			select a.id, a.link_url from app.ads a
			where a.id = ${ad_id}::uuid and a.deleted_at is null and a.status = 'active'
				and ${slot}::app."AD_SLOT" = any(a.slots)
		), counted as (
			insert into app.ad_stats_daily (day, ad_id, slot, region_id, clicks)
			select ${day}::date, ad.id, ${slot}::app."AD_SLOT",
				coalesce((select r.id from app.regions r where r.id = ${region_id}::int), 0), 1
			from ad
			on conflict (day, ad_id, slot, region_id) do update set clicks = app.ad_stats_daily.clicks + 1
		)
		select link_url from ad`;
	return rows[0]?.link_url;
}

/** Per-slot advisory locks until the transaction ends (sorted, so two saves never wait on each other in a cycle). */
export async function lockSlots(slots: AD_SLOT[], tx: Tx): Promise<void> {
	for (const slot of [...new Set(slots)].sort())
		await tx.$executeRaw`select pg_advisory_xact_lock(hashtext(${`app.ads.exclusive:${slot}`}))`;
}

/** An ad that is not soft-deleted. */
export async function findById(id: string, tx?: Tx) {
	return (tx ?? prisma).ads.findFirst({ where: { id, deleted_at: null } });
}

/** An ad including a soft-deleted one (admin stats stay readable). */
export async function findAnyById(id: string, tx?: Tx) {
	return (tx ?? prisma).ads.findUnique({ where: { id } });
}

/** Admin list, newest first, keyset-paginated on (created_at desc, id desc); the cursor is the last item's id. */
export async function listAdmin({ status, cursor, take }: { status?: string; cursor?: string; take: number }, tx?: Tx) {
	return (tx ?? prisma).ads.findMany({
		where: { deleted_at: null, ...(status && { status }) },
		orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
		take,
		...(cursor && { cursor: { id: cursor }, skip: 1 }),
	});
}

export async function create(data: Prisma.adsUncheckedCreateInput, tx?: Tx) {
	return (tx ?? prisma).ads.create({ data });
}

export async function update(id: string, data: Prisma.adsUncheckedUpdateInput, tx?: Tx) {
	return (tx ?? prisma).ads.update({ where: { id }, data });
}

export type AdStatsRow = { day: string; slot: string; region_slug: string | null; impressions: number; clicks: number };

/** Daily rows of one ad between two days (inclusive); region 0 (unknown) has no slug. */
export async function stats({ ad_id, from, to }: { ad_id: string; from: string; to: string }, tx?: Tx) {
	return (tx ?? prisma).$queryRaw<AdStatsRow[]>`
		select to_char(s.day, 'YYYY-MM-DD') as day, lower(s.slot::text) as slot, r.slug as region_slug,
			s.impressions, s.clicks
		from app.ad_stats_daily s left join app.regions r on r.id = s.region_id
		where s.ad_id = ${ad_id}::uuid and s.day between ${from}::date and ${to}::date
		order by s.day, s.slot, r.slug nulls first`;
}

export default {
	listLive,
	regionOfMunicipality,
	findExclusiveOverlap,
	addImpression,
	addClick,
	lockSlots,
	findById,
	findAnyById,
	listAdmin,
	create,
	update,
	stats,
};
