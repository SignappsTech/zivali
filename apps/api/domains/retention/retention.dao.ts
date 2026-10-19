// Prisma access for the retention.purge windows no other area owns (data-inventory.json), in batches (lib/purge.ts).
import { Prisma } from '../../generated/client.ts';
import { purgeWhere } from '../../lib/purge.ts';

type Tx = Prisma.TransactionClient;

export const purgeEmailOutbox = (before: Date, tx?: Tx) =>
	purgeWhere(Prisma.sql`app.email_outbox`, Prisma.sql`created_at < ${before}`, tx);

export const purgePartnerStats = (before: Date, tx?: Tx) =>
	purgeWhere(Prisma.sql`app.partner_stats_snapshot`, Prisma.sql`generated_at < ${before}`, tx);

export const purgeLeads = (before: Date, tx?: Tx) =>
	purgeWhere(Prisma.sql`app.leads`, Prisma.sql`created_at < ${before}`, tx);

/** Open and closed alike: privacy policy §14 keeps abuse reports up to 24 months. */
export const purgeAbuseReports = (before: Date, tx?: Tx) =>
	purgeWhere(Prisma.sql`app.abuse_reports`, Prisma.sql`created_at < ${before}`, tx);

/** Resolved before the cutoff, and flags of a report that is gone, open ones too ("delete with the target"). */
export const purgeModerationFlags = (resolvedBefore: Date, tx?: Tx) =>
	purgeWhere(
		Prisma.sql`app.moderation_flags`,
		Prisma.sql`(resolved_at < ${resolvedBefore}
			or (target_type = 'report' and not exists (select 1 from app.reports r where r.id = moderation_flags.target_id)))`,
		tx
	);

/**
 * Reports closed or reunited before `endedBefore` that no conversation refers to any more (each chat goes first, at
 * its own window). Matches, alert deliveries, managers and contacts cascade; photos and sightings are detached.
 */
export const purgeReports = (endedBefore: Date, tx?: Tx) =>
	purgeWhere(
		Prisma.sql`app.reports`,
		Prisma.sql`((status = 'closed' and closed_at < ${endedBefore}) or (status = 'reunited' and reunited_at < ${endedBefore}))
			and not exists (
				select 1 from app.conversations c
				where reports.id in (c.lost_report_id, c.other_report_id, c.about_report_id))`,
		tx
	);

export default {
	purgeEmailOutbox,
	purgePartnerStats,
	purgeLeads,
	purgeAbuseReports,
	purgeModerationFlags,
	purgeReports,
};
