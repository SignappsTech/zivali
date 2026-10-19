// retention.purge (daily, C1): every time window of data-inventory.json (privacy policy §14), each step in batches of
// 500 and only past its window, so a re-run deletes nothing new. Rate-limit windows after 48 h, idempotency keys after
// 24 h, chat conversations read-only for `retention.chat_months` (6) with their messages (C9), photos (C5): unattached
// for 24 h (pet photos of deleted pets included), of reports ended 12 months ago, the device hashes of anonymous
// reports after 7 days (C7 hold rule), ai_calls after 62 days and ai_results no photo has the image of (C19), the email
// delivery log after 30 days, partner stats snapshots after 90 days, leads and abuse reports after 24 months,
// moderation flags 12 months after resolution or once their report is gone, the reports ended
// `retention.report_months` ago that no conversation refers to any more, and last the anonymous accounts idle for 30
// days (TASK-28.8: with their Supabase Auth user; also anonymous Auth users that never got a profile; a failed Auth
// delete fails the job after the rest has committed). The steps added by TASK-114.33 and TASK-28.8 (records, reports,
// accounts) only count, in a transaction that is rolled back and without calling the Auth admin API, until app_config
// `retention.purge_live` is true (the lead sets it after checking the staging counts). `{ dry_run: true }` runs every
// step that way: the logged counts are exact and nothing changes. Sent with `{ objects }` (DELETE /v1/photos/:id) it
// deletes just those storage objects.
import { z } from 'zod';

import { AiDomain } from '../domains/ai/index.ts';
import { ChatDomain } from '../domains/chat/index.ts';
import { PhotosDomain } from '../domains/photos/index.ts';
import { PlatformDao } from '../domains/platform/index.ts';
import { ReportsDomain } from '../domains/reports/index.ts';
import { RetentionDomain } from '../domains/retention/index.ts';
import type { Ctx } from '../lib/ctx.ts';
import type { JobCtx } from './index.ts';

const Objects = z.object({
	objects: z.array(z.object({ bucket: z.enum(['private', 'media']), key: z.string() })).min(1),
});
// A dry_run that is not a boolean (`"yes"`, `"true"`) fails the job instead of purging for real.
const Options = z.object({ dry_run: z.boolean().optional() });
// A rolled-back run holds its row locks until the rollback; the pilot's volumes take seconds.
const ROLLBACK_TIMEOUT_MS = 10 * 60_000;

/** The steps that purged before TASK-114.33: always live. */
async function purgeEstablished(ctx: Ctx) {
	const platform = await PlatformDao.purgeExpired(ctx.now, ctx.tx);
	const conversations = await ChatDomain.purgeExpired(undefined, ctx);
	const photos = await PhotosDomain.purgePhotos(ctx);
	const device_hashes = await ReportsDomain.purgeDeviceHashes(undefined, ctx);
	// After the photo purge, so the results of images just deleted go too.
	const ai = await AiDomain.purgeExpired(ctx);
	return { ...platform, conversations, photos, device_hashes, ...ai };
}

/** The steps TASK-114.33 and TASK-28.8 added: live only once `retention.purge_live` is true. */
async function purgeAdded(ctx: Ctx, live: boolean) {
	const records = await RetentionDomain.purgeRecords(undefined, ctx);
	// Last, after the chats: matches, conversations and alert deliveries cascade from a report (TASK-6.16), so a report
	// goes only once no conversation refers to it any more.
	const reports = await RetentionDomain.purgeReports(undefined, ctx);
	// `live` false: the Auth users stay (the admin API is not transactional), the rest is rolled back.
	const accounts = await RetentionDomain.purgeAnonymousAccounts({ live }, ctx);
	return { ...records, reports, ...accounts };
}

class Rollback extends Error {
	constructor(readonly result: unknown) {
		super('retention purge: rolled back');
	}
}

/** Runs `fn` in a transaction that is always rolled back and returns its result: exact counts, nothing changes. */
async function rolledBack<T>(ctx: JobCtx, fn: (ctx: Ctx) => Promise<T>): Promise<T> {
	try {
		await ctx.prisma.$transaction(
			async (tx) => {
				throw new Rollback(await fn({ ...ctx, tx }));
			},
			{ timeout: ROLLBACK_TIMEOUT_MS }
		);
	} catch (err) {
		if (err instanceof Rollback) return err.result as T;
		throw err;
	}
	throw new Error('retention purge: the transaction was not rolled back');
}

export async function handle(data: unknown, ctx: JobCtx): Promise<void> {
	const targeted = Objects.safeParse(data);
	if (targeted.success) return PhotosDomain.deleteObjects(targeted.data.objects, ctx);
	const { dry_run = false } = Options.parse(data ?? {});
	const purge_live = await RetentionDomain.purgeIsLive();
	const purged = dry_run
		? await rolledBack(ctx, async (c) => ({ ...(await purgeEstablished(c)), ...(await purgeAdded(c, false)) }))
		: {
				...(await purgeEstablished(ctx)),
				...(purge_live ? await purgeAdded(ctx, true) : await rolledBack(ctx, (c) => purgeAdded(c, false))),
			};
	// Counts only. Without purge_live the records, reports and accounts counts are what would go; dry_run: all of them.
	ctx.logger.info({ purged, dry_run, purge_live }, 'retention purge done');
	// After every step has committed: the accounts whose Auth delete failed stay for the next run, and the job fails.
	if (purged.auth_delete_failures)
		throw new Error(`retention purge: ${purged.auth_delete_failures} Supabase Auth deletes failed`);
}
