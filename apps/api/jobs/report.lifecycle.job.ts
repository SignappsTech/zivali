// report.lifecycle (hourly, C4): LOST reminders, expiry warnings, the automatic expiry of idle reports and the end of
// the 30-day public window of closed and reunited ones (photo.publish).
import { LifecycleDomain } from '../domains/reports/index.ts';
import type { JobCtx } from './index.ts';

export async function handle(_data: unknown, ctx: JobCtx): Promise<void> {
	ctx.logger.info(await LifecycleDomain.tick(undefined, ctx), 'report.lifecycle done');
}
