// retention.purge windows of data-inventory.json that no other area owns (privacy policy §14). Each step deletes only
// past its window and in batches, so a re-run finds nothing new. Reports, then anonymous accounts, go last.
import { z } from 'zod';

import configStore from '../../lib/config-store.ts';
import type { Ctx } from '../../lib/ctx.ts';
import { inBatches, monthsAgo } from '../../lib/purge.ts';
import { prisma, type Prisma } from '../../prisma/prisma.ts';
import { photoObjects } from '../photos/photo-objects.ts';
import { UsersDomain } from '../users/index.ts';
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
/** Privacy policy §14 and ADR-005: anonymous accounts without an open report. */
const ANONYMOUS_ACCOUNT_DAYS = 30;
/** A batch holds its account locks while it calls the Auth admin API once per account (up to 10 s each). */
const ACCOUNT_BATCH = 50;
const ACCOUNT_BATCH_TIMEOUT_MS = 10 * 60_000;

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
 * Deletes each Auth user through the admin API; returns the ids done. One converted to a full account since it was
 * picked is left alone (no longer idle, it is not picked again); a failure goes to `failed`, skipped from then on.
 */
async function deleteAuthUsers(ids: string[], failed: string[], tx?: Prisma.TransactionClient): Promise<string[]> {
	const done: string[] = [];
	for (const id of ids) {
		try {
			if (await RetentionDao.isConvertedAuthUser(id, tx)) continue;
			await UsersDomain.deleteAuthUser(id);
			done.push(id);
		} catch {
			failed.push(id);
		}
	}
	return done;
}

/**
 * Anonymous Supabase Auth users that never got a profile, then anonymous accounts idle for ANONYMOUS_ACCOUNT_DAYS
 * (RetentionDao.lockIdleAnonymous). The profile-less ones come first, so a not-live run counts them before the
 * rolled-back profile deletes would make those accounts profile-less too. Accounts go a transaction per batch of
 * ACCOUNT_BATCH: (live only) the Supabase Auth user first, inside the locks, then for the accounts whose Auth delete
 * went through their photos (a storage delete queued) and the profile, which takes managers, alerts, closed abuse
 * reports and notifications along (its reports stay, created_by cleared). The profile is the retry marker: an Auth
 * user already gone counts as deleted, so the next run completes a batch that did not commit. A failed Auth delete
 * keeps that account for the next run and does not hold up the others; the job fails after the commit
 * (`auth_delete_failures`). Not live (a dry run, or retention.purge_live not true) the Auth admin API is never
 * called, as it cannot be rolled back: only counts.
 */
export async function purgeAnonymousAccounts(input: { live: boolean }, ctx: Ctx) {
	const before = daysAgo(ctx.now, ANONYMOUS_ACCOUNT_DAYS);
	const failed: string[] = [];

	let anonymous_auth_users = 0;
	if (input.live) {
		await inBatches(async (limit) => {
			const ids = await RetentionDao.listProfilelessAnonymous(before, limit, failed, ctx.tx);
			anonymous_auth_users += (await deleteAuthUsers(ids, failed, ctx.tx)).length;
			return ids.length;
		}, ACCOUNT_BATCH);
	} else anonymous_auth_users = await RetentionDao.countProfilelessAnonymous(before, ctx.tx);

	let anonymous_accounts = 0;
	const batch = async (limit: number, tx: Prisma.TransactionClient) => {
		const ids = await RetentionDao.lockIdleAnonymous(before, limit, failed, tx);
		const done = input.live ? await deleteAuthUsers(ids, failed, tx) : ids;
		if (done.length) {
			const photos = await RetentionDao.removeOwnedPhotos(done, tx);
			if (photos.length)
				await ctx.jobs.send('retention.purge', { objects: photos.flatMap(photoObjects) }, { tx });
			anonymous_accounts += await RetentionDao.deleteProfiles(done, tx);
		}
		return ids.length;
	};
	await inBatches(
		(limit) =>
			ctx.tx
				? batch(limit, ctx.tx)
				: prisma.$transaction((tx) => batch(limit, tx), { timeout: ACCOUNT_BATCH_TIMEOUT_MS }),
		ACCOUNT_BATCH
	);
	return { anonymous_accounts, anonymous_auth_users, auth_delete_failures: failed.length };
}

/**
 * app_config `retention.purge_live` (false from the migration): until it is true, retention.purge only counts what
 * purgeRecords, purgeReports and purgeAnonymousAccounts would delete and rolls them back. The lead sets it after
 * checking the staging counts.
 */
export async function purgeIsLive(): Promise<boolean> {
	return (await configStore.get('retention.purge_live')) === true;
}

export default { purgeRecords, purgeReports, purgeAnonymousAccounts, purgeIsLive };
