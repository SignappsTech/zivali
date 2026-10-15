// retention.purge (daily, C1): rate-limit windows older than 48 h, idempotency keys older than 24 h.
import { PlatformDao } from '../domains/platform/index.ts';
import type { JobCtx } from './index.ts';

export async function handle(_data: unknown, ctx: JobCtx): Promise<void> {
	const purged = await PlatformDao.purgeExpired(ctx.now);
	ctx.logger.info({ purged }, 'retention purge done');
}
