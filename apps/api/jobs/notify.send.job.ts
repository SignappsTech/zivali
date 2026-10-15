// notify.send stub (TASK-6.3): logs and completes; the notifications task (TASK-22.3) replaces it and keeps the
// nearby-alert gate (TASK-23.1) as its first step.
import { AlertsDomain } from '../domains/alerts/index.ts';
import type { NotificationInput } from '../domains/notifications/index.ts';
import type { JobCtx } from './index.ts';

export async function handle(data: unknown, ctx: JobCtx): Promise<void> {
	// C10: a queued nearby alert whose report was closed or reunited (or whose subscription is paused) is dropped.
	if (!(await AlertsDomain.shouldDeliver(data as NotificationInput, ctx))) return ctx.logger.info('alert dropped');
	ctx.logger.info('job stub: no handler yet');
}
