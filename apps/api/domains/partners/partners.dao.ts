// Prisma access for partner stats and leads (C14). Every function takes an optional transaction client (ADR-020).
// Counts: users = signed-up (non-anonymous) profiles, by region through their home point; active reports = open or
// matched and visible; reunions = lost reports reunited since `since`. Reports count in their region_id (derived from
// the public point, C6). Leads are keyset-paginated on (created_at desc, id desc); the cursor is the last item's id.
import type { PartnerStats } from '@zivali/types';

import type { Prisma } from '../../generated/client.ts';
import { prisma } from '../../prisma/prisma.ts';

type Tx = Prisma.TransactionClient;

export type RawCounts = { users: number; active_reports: number; reunions_90d: number };

export async function countTotals(since: Date, tx?: Tx): Promise<RawCounts> {
	const [row] = await (tx ?? prisma).$queryRaw<RawCounts[]>`
		select
			(select count(*)::int from app.profiles where not is_anonymous) as users,
			(select count(*)::int from app.reports
				where status in ('open', 'matched') and moderation_state = 'visible') as active_reports,
			(select count(*)::int from app.reports
				where type = 'lost' and status = 'reunited' and moderation_state = 'visible' and reunited_at >= ${since})
				as reunions_90d`;
	return row!;
}

/** Every statistical region (zeros included), in GURS order. */
export async function countByRegion(since: Date, tx?: Tx): Promise<(RawCounts & { region_slug: string })[]> {
	return (tx ?? prisma).$queryRaw`
		select r.slug as region_slug,
			(select count(*)::int from app.profiles p
				where not p.is_anonymous and p.home_point is not null and extensions.st_covers(r.geom, p.home_point))
				as users,
			(select count(*)::int from app.reports x
				where x.region_id = r.id and x.status in ('open', 'matched') and x.moderation_state = 'visible')
				as active_reports,
			(select count(*)::int from app.reports x
				where x.region_id = r.id and x.type = 'lost' and x.status = 'reunited' and x.moderation_state = 'visible'
					and x.reunited_at >= ${since}) as reunions_90d
		from app.regions r
		order by r.id`;
}

export async function insertSnapshot(input: { generated_at: Date; data: PartnerStats }, tx?: Tx) {
	return (tx ?? prisma).partner_stats_snapshot.create({
		data: { generated_at: input.generated_at, data: input.data as Prisma.InputJsonObject },
	});
}

export async function latestSnapshot(tx?: Tx) {
	return (tx ?? prisma).partner_stats_snapshot.findFirst({ orderBy: { generated_at: 'desc' } });
}

/** Retention (data inventory): snapshots older than `before` go. */
export async function deleteSnapshotsBefore(before: Date, tx?: Tx): Promise<number> {
	return (await (tx ?? prisma).partner_stats_snapshot.deleteMany({ where: { generated_at: { lt: before } } })).count;
}

export async function insertLead(data: Prisma.leadsCreateInput, tx?: Tx) {
	return (tx ?? prisma).leads.create({ data, select: { id: true } });
}

export async function listLeads(input: { cursor?: string; take: number }, tx?: Tx) {
	return (tx ?? prisma).leads.findMany({
		orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
		take: input.take,
		...(input.cursor && { cursor: { id: input.cursor }, skip: 1 }),
	});
}

export default {
	countTotals,
	countByRegion,
	insertSnapshot,
	latestSnapshot,
	deleteSnapshotsBefore,
	insertLead,
	listLeads,
};
