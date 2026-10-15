// notify.send stub (TASK-6.3): logs and completes; the notifications task (TASK-22.3) replaces it and resolves
// nearby_lost alerts with AlertsDomain.nearbyAlert() (TASK-23.1), dropping them when it returns null.
import { NotificationJobInput } from '@zivali/validation';

import { AlertsDomain } from '../domains/alerts/index.ts';
import type { JobCtx } from './index.ts';

export async function handle(data: unknown, ctx: JobCtx): Promise<void> {
	const input = NotificationJobInput.safeParse(data).data;
	// C10: a nearby alert whose report was closed or reunited since the fan-out, or whose subscription is paused, is dropped.
	if (input?.type === 'nearby_lost') {
		const alert = await AlertsDomain.nearbyAlert({ user_id: input.user_id, ...input.payload }, ctx);
		if (!alert) return ctx.logger.info('alert dropped');
	}
	ctx.logger.info('job stub: no handler yet');
}
