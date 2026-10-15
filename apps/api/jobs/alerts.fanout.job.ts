// alerts.fanout stub (TASK-6.3): logs and completes; the nearby alerts task (TASK-23.1) replaces it.
import type { JobCtx } from './index.ts';

export async function handle(_data: unknown, ctx: JobCtx): Promise<void> {
	ctx.logger.info('job stub: no handler yet');
}
