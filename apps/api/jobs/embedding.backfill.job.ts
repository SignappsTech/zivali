// embedding.backfill { model?, prune?, after? } (C20 §Jobs): one page of the backfill pass (EmbeddingsDomain.backfill),
// which re-queues itself for the next page. Sent by seeder 41-embedding-backfill and by hand (`jobs:send`).
import { z } from 'zod';

import { EmbeddingsDomain } from '../domains/embeddings/index.ts';
import type { JobCtx } from './index.ts';

const Data = z.object({
	model: z.string().trim().min(1).max(200).optional(),
	prune: z.boolean().optional(),
	after: z.uuid().optional(),
});

export async function handle(data: unknown, ctx: JobCtx): Promise<void> {
	const parsed = Data.safeParse(data ?? {});
	// Bad data stays bad: retrying cannot help.
	if (!parsed.success) return ctx.logger.error('embedding.backfill: invalid job dropped');
	await EmbeddingsDomain.backfill(parsed.data, ctx);
}
