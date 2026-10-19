// retention.purge (daily, C1): every time window of data-inventory.json (privacy policy §14), each step in batches of
// 500 and only past its window, so a re-run deletes nothing new. Rate-limit windows after 48 h, idempotency keys after
// 24 h, chat conversations read-only for `retention.chat_months` (6) with their messages (C9), photos (C5): unattached
// for 24 h (pet photos of deleted pets included), of reports ended 12 months ago, the device hashes of anonymous
// reports after 7 days (C7 hold rule), ai_calls after 62 days and ai_results no photo has the image of (C19), the email
// delivery log after 30 days, partner stats snapshots after 90 days, leads after 24 months, moderation flags 12 months
// after resolution, and last the reports ended `retention.report_months` ago that no conversation refers to any more.
// `{ dry_run: true }` runs every step in a transaction that is rolled back: the logged counts are exact and nothing
// changes. Sent with `{ objects }` (DELETE /v1/photos/:id) it deletes just those storage objects.
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
// A dry run holds its row locks until the rollback; the pilot's volumes take seconds.
const DRY_RUN_TIMEOUT_MS = 10 * 60_000;

async function purge(ctx: Ctx) {
	const platform = await PlatformDao.purgeExpired(ctx.now, ctx.tx);
	const conversations = await ChatDomain.purgeExpired(undefined, ctx);
	const photos = await PhotosDomain.purgePhotos(ctx);
	const device_hashes = await ReportsDomain.purgeDeviceHashes(undefined, ctx);
	// After the photo purge, so the results of images just deleted go too.
	const ai = await AiDomain.purgeExpired(ctx);
	const records = await RetentionDomain.purgeRecords(undefined, ctx);
	// Last, after the chats: matches, conversations and alert deliveries cascade from a report (TASK-6.16), so a report
	// goes only once no conversation refers to it any more.
	const reports = await RetentionDomain.purgeReports(undefined, ctx);
	return { ...platform, conversations, photos, device_hashes, ...ai, ...records, reports };
}

type Purged = Awaited<ReturnType<typeof purge>>;

class DryRun extends Error {
	constructor(readonly purged: Purged) {
		super('retention purge dry run: rolled back');
	}
}

async function dryRun(ctx: JobCtx): Promise<Purged> {
	try {
		await ctx.prisma.$transaction(
			async (tx) => {
				throw new DryRun(await purge({ ...ctx, tx }));
			},
			{ timeout: DRY_RUN_TIMEOUT_MS }
		);
	} catch (err) {
		if (err instanceof DryRun) return err.purged;
		throw err;
	}
	throw new Error('retention purge dry run: the transaction was not rolled back');
}

export async function handle(data: unknown, ctx: JobCtx): Promise<void> {
	const targeted = Objects.safeParse(data);
	if (targeted.success) return PhotosDomain.deleteObjects(targeted.data.objects, ctx);
	const { dry_run = false } = Options.parse(data ?? {});
	const purged = dry_run ? await dryRun(ctx) : await purge(ctx);
	ctx.logger.info({ purged, dry_run }, 'retention purge done');
}
