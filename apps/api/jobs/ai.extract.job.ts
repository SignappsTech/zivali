// ai.extract stub (TASK-40.1): logs and completes; the extraction task (TASK-40.3) replaces it (C19 §Pipeline).
import type { JobCtx } from './index.ts';

export async function handle(_data: unknown, ctx: JobCtx): Promise<void> {
	ctx.logger.info('job stub: no handler yet');
}
