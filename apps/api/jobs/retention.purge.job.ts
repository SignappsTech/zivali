// retention.purge (daily, C1): every time window of data-inventory.json (privacy policy §14), each step in batches of
// 500 and only past its window, so a re-run deletes nothing new. Rate-limit windows after 48 h, idempotency keys after
// 24 h, chat conversations read-only for `retention.chat_months` (6) with their messages (C9), photos (C5): unattached
// for 24 h (pet photos of deleted pets included), of reports ended 12 months ago, the device hashes of anonymous
// reports after 7 days (C7 hold rule), ai_calls after 62 days and ai_results no photo has the image of (C19), the email
// delivery log after 30 days, partner stats snapshots after 90 days, leads and abuse reports after 24 months,
// moderation flags 12 months after resolution or once their report is gone, and last the reports ended
// `retention.report_months` ago that no conversation refers to any more. The steps added by TASK-114.33 (records,
// reports) only count, in a transaction that is rolled back, until app_config `retention.purge_live` is true (the lead
// sets it after checking the staging counts). `{ dry_run: true }` runs every step that way: the logged counts are exact
// and nothing changes. Sent with `{ objects }` (DELETE /v1/photos/:id) it deletes just those storage objects.
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

/** The steps TASK-114.33 added: live only once `retention.purge_live` is true. */
async function purgeAdded(ctx: Ctx) {
	const records = await RetentionDomain.purgeRecords(undefined, ctx);
	// Last, after the chats: matches, conversations and alert deliveries cascade from a report (TASK-6.16), so a report
	// goes only once no conversation refers to it any more.
	const reports = await RetentionDomain.purgeReports(undefined, ctx);
	return { ...records, reports };
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
		? await rolledBack(ctx, async (c) => ({ ...(await purgeEstablished(c)), ...(await purgeAdded(c)) }))
		: {
				...(await purgeEstablished(ctx)),
				...(purge_live ? await purgeAdded(ctx) : await rolledBack(ctx, purgeAdded)),
			};
	// Counts only. Without purge_live the records and reports counts are what would go; dry_run: all of them.
	ctx.logger.info({ purged, dry_run, purge_live }, 'retention purge done');
}
