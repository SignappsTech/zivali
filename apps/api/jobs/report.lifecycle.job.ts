// report.lifecycle (hourly, C4): LOST reminders, expiry warnings and the automatic expiry of idle reports.
import { LifecycleDomain } from '../domains/reports/index.ts';
import type { JobCtx } from './index.ts';

export async function handle(_data: unknown, ctx: JobCtx): Promise<void> {
	ctx.logger.info(await LifecycleDomain.tick(undefined, ctx), 'report.lifecycle done');
}
