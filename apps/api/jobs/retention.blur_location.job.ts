// retention.blur_location (daily, ADR-006 CH-24): the stored point of reports closed or reunited more than
// app_config retention.exact_point_blur_days (30) ago becomes their public centre. Logs the count only, never a point.
import { LifecycleDomain } from '../domains/reports/index.ts';
import type { JobCtx } from './index.ts';

export async function handle(_data: unknown, ctx: JobCtx): Promise<void> {
	const blurred = await LifecycleDomain.blurEndedLocations(undefined, ctx);
	ctx.logger.info({ blurred }, 'retention.blur_location done');
}
