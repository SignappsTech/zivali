// embedding.backfill stub (TASK-40.1): logs and completes; the backfill task (TASK-42.3) replaces it (C20 §Jobs).
import type { JobCtx } from './index.ts';

export async function handle(_data: unknown, ctx: JobCtx): Promise<void> {
	ctx.logger.info('job stub: no handler yet');
}
