// Prisma access for the public homepage numbers (TASK-115.4). Raw totals only; the domain rounds and thresholds them.
import { prisma, type Prisma } from '../../prisma/prisma.ts';

export type RawStats = { reunited_total: number; open_reports: number; alert_subscribers: number };

/**
 * Visible reports only, as the public search: reunited ones, and open or matched ones (all types). Subscribers are
 * subscriptions (one per user) that are not paused and keep at least one species.
 */
export async function countPublic(tx?: Prisma.TransactionClient): Promise<RawStats> {
	const [row] = await (tx ?? prisma).$queryRaw<RawStats[]>`
		select
			(select count(*)::int from app.reports
				where status = 'reunited' and moderation_state = 'visible') as reunited_total,
			(select count(*)::int from app.reports
				where status in ('open', 'matched') and moderation_state = 'visible') as open_reports,
			(select count(*)::int from app.alert_subscriptions
				where not paused and cardinality(species) > 0) as alert_subscribers`;
	return row!;
}

export default { countPublic };
