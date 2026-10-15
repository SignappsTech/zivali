// partners.stats stub (TASK-6.3): logs and completes; the partner stats task (TASK-38.2) replaces it.
import type { JobCtx } from './index.ts';

export async function handle(_data: unknown, ctx: JobCtx): Promise<void> {
	ctx.logger.info('job stub: no handler yet');
}
