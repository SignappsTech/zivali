// alerts.fanout { report_id } (C10): nearby_lost alerts to the subscribers around a visible lost report, sent by the
// report service when a visible lost report is created (TASK-29.2).
import { z } from 'zod';

import { AlertsDomain } from '../domains/alerts/index.ts';
import type { JobCtx } from './index.ts';

const Data = z.object({ report_id: z.uuid() });

export async function handle(data: unknown, ctx: JobCtx): Promise<void> {
	const parsed = Data.safeParse(data);
	// A malformed payload never becomes valid: complete it instead of retrying.
	if (!parsed.success) return ctx.logger.warn('alerts.fanout: invalid payload, skipped');
	const queued = await AlertsDomain.fanout(parsed.data, ctx);
	ctx.logger.info({ report_id: parsed.data.report_id, queued }, 'nearby alerts queued');
}
