// Prisma access for ad serving and impressions (C14). Every function takes an optional transaction client (ADR-020).
// Targeting arrays (region_ids, municipality_ids, species) that are NULL or empty mean "every".
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

export default { listLive, regionOfMunicipality, findExclusiveOverlap, addImpression };
