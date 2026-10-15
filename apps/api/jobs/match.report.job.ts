// match.report { report_id } (C8): runs the matching engine for one new or changed report (ids-only payload).
import { z } from 'zod';

import { MatchingDomain } from '../domains/matching/index.ts';
import type { JobCtx } from './index.ts';

const Payload = z.object({ report_id: z.uuid() });

export async function handle(data: unknown, ctx: JobCtx): Promise<void> {
	const payload = Payload.safeParse(data);
	// A malformed payload never succeeds on retry: drop it.
	if (!payload.success) return ctx.logger.warn('match.report: invalid payload, dropped');
	await MatchingDomain.matchReport(payload.data, ctx);
}
