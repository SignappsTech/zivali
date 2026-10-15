// partners.stats (hourly, C14): masked counts into partner_stats_snapshot, DB-only (GA enrichment flag off).
import { PartnersDomain } from '../domains/partners/index.ts';
import type { JobCtx } from './index.ts';

export async function handle(_data: unknown, ctx: JobCtx): Promise<void> {
	const stats = await PartnersDomain.computeStats(undefined, ctx);
	ctx.logger.info({ regions: stats.by_region.length, pilot: stats.pilot }, 'partner stats snapshot stored');
}
