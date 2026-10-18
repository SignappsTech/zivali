// ai.extract { photo_id } (C19 §Pipeline): one capped, cached extraction per photo (AiDomain.extractPhoto). Retried
// 2× after 2 s; the last attempt records a failure as outcome failed instead of throwing.
import { z } from 'zod';

import { AiDomain } from '../domains/ai/index.ts';
import type { JobCtx } from './index.ts';

const Data = z.object({ photo_id: z.uuid() });

export async function handle(data: unknown, ctx: JobCtx): Promise<void> {
	const parsed = Data.safeParse(data);
	// Bad data stays bad: retrying cannot help.
	if (!parsed.success) return ctx.logger.error('ai.extract: invalid job dropped');
	await AiDomain.extractPhoto({ ...parsed.data, last_attempt: ctx.lastAttempt }, ctx);
}
