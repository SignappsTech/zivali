// retention.purge windows of data-inventory.json that no other area owns (privacy policy §14). Each step deletes only
// past its window and in batches, so a re-run finds nothing new. Reports go last (purgeReports).
import { z } from 'zod';

import configStore from '../../lib/config-store.ts';
import type { Ctx } from '../../lib/ctx.ts';
import { monthsAgo } from '../../lib/purge.ts';
import RetentionDao from './retention.dao.ts';

const DAY_MS = 86_400_000;
/** The email delivery log (email_outbox): privacy policy §14 promises 30 days. */
const EMAIL_OUTBOX_DAYS = 30;
const PARTNER_STATS_DAYS = 90;
const LEADS_MONTHS = 24;
/** Privacy policy §14: "up to 24 months". */
const ABUSE_REPORT_MONTHS = 24;
/** After resolution; open flags stay while their target does. */
const MODERATION_FLAG_MONTHS = 12;

const daysAgo = (now: Date, days: number) => new Date(now.getTime() - days * DAY_MS);

export async function purgeRecords(_input: void, ctx: Ctx) {
	return {
		email_outbox: await RetentionDao.purgeEmailOutbox(daysAgo(ctx.now, EMAIL_OUTBOX_DAYS), ctx.tx),
		partner_stats_snapshot: await RetentionDao.purgePartnerStats(daysAgo(ctx.now, PARTNER_STATS_DAYS), ctx.tx),
		leads: await RetentionDao.purgeLeads(monthsAgo(ctx.now, LEADS_MONTHS), ctx.tx),
		abuse_reports: await RetentionDao.purgeAbuseReports(monthsAgo(ctx.now, ABUSE_REPORT_MONTHS), ctx.tx),
		moderation_flags: await RetentionDao.purgeModerationFlags(monthsAgo(ctx.now, MODERATION_FLAG_MONTHS), ctx.tx),
	};
}

const Months = z.number().int().positive();

/**
 * The last step: reports closed or reunited `retention.report_months` ago, once no conversation refers to them (a
 * report takes its matches, conversations and alert deliveries with it, TASK-6.16). Without that app_config key no
 * window is decided and every report stays: null.
 */
export async function purgeReports(_input: void, ctx: Ctx): Promise<number | null> {
	const months = Months.safeParse(await configStore.get('retention.report_months'));
	if (!months.success) return null;
	return RetentionDao.purgeReports(monthsAgo(ctx.now, months.data), ctx.tx);
}

/**
 * app_config `retention.purge_live` (false from the migration): until it is true, retention.purge only counts what
 * purgeRecords and purgeReports would delete and rolls them back. The lead sets it after checking the staging counts.
 */
export async function purgeIsLive(): Promise<boolean> {
	return (await configStore.get('retention.purge_live')) === true;
}

export default { purgeRecords, purgeReports, purgeIsLive };
