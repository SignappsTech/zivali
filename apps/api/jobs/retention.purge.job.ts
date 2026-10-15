// retention.purge (daily, C1): rate-limit windows older than 48 h, idempotency keys older than 24 h, chat
// conversations read-only for `retention.chat_months` (6) with their messages (C9), and photos (C5): unattached for
// 24 h (pet photos of deleted pets included), of reports ended 12 months ago, and the device hashes of anonymous
// reports after 7 days (C7 hold rule). Sent with `{ objects }`
// (DELETE /v1/photos/:id) it deletes just those storage objects.
import { z } from 'zod';

import { ChatDomain } from '../domains/chat/index.ts';
import { PhotosDomain } from '../domains/photos/index.ts';
import { PlatformDao } from '../domains/platform/index.ts';
import { ReportsDomain } from '../domains/reports/index.ts';
import type { JobCtx } from './index.ts';

const Objects = z.object({
	objects: z.array(z.object({ bucket: z.enum(['private', 'media']), key: z.string() })).min(1),
});

export async function handle(data: unknown, ctx: JobCtx): Promise<void> {
	const targeted = Objects.safeParse(data);
	if (targeted.success) return PhotosDomain.deleteObjects(targeted.data.objects, ctx);
	const purged = await PlatformDao.purgeExpired(ctx.now);
	const conversations = await ChatDomain.purgeExpired(undefined, ctx);
	const photos = await PhotosDomain.purgePhotos(ctx);
	const device_hashes = await ReportsDomain.purgeDeviceHashes(undefined, ctx);
	ctx.logger.info({ purged: { ...purged, conversations, photos, device_hashes } }, 'retention purge done');
}
