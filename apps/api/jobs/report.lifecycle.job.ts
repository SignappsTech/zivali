// report.lifecycle stub (TASK-6.3): logs and completes; the report lifecycle task (TASK-26.3) replaces it.
import type { JobCtx } from './index.ts';

export async function handle(_data: unknown, ctx: JobCtx): Promise<void> {
	ctx.logger.info('job stub: no handler yet');
}
