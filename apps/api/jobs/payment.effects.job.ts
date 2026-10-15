// payment.effects stub (TASK-6.3): logs and completes; the payments task (TASK-32.1) replaces it.
import type { JobCtx } from './index.ts';

export async function handle(_data: unknown, ctx: JobCtx): Promise<void> {
	ctx.logger.info('job stub: no handler yet');
}
