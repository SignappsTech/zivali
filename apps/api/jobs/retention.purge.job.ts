// retention.purge (daily, C1): rate-limit windows older than 48 h, idempotency keys older than 24 h, and chat
// conversations read-only for `retention.chat_months` (6) with their messages (C9).
import { ChatDomain } from '../domains/chat/index.ts';
import { PlatformDao } from '../domains/platform/index.ts';
import type { JobCtx } from './index.ts';

export async function handle(_data: unknown, ctx: JobCtx): Promise<void> {
	const purged = await PlatformDao.purgeExpired(ctx.now);
	const conversations = await ChatDomain.purgeExpired(undefined, ctx);
	ctx.logger.info({ purged: { ...purged, conversations } }, 'retention purge done');
}
