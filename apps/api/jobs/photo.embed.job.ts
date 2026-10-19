// photo.embed { photo_id } (C20 §Jobs): one vector per photo and active model (EmbeddingsDomain.embedPhoto). Retried
// 5× with backoff; the last attempt tells the domain to log photo.embed.dead_letter. A new vector of a photo on an
// open report sends match.report for it (C20 §Jobs 4, C8 §Visual similarity 5).
import { z } from 'zod';

import { EmbeddingsDomain } from '../domains/embeddings/index.ts';
import { MatchingDomain } from '../domains/matching/index.ts';
import type { JobCtx } from './index.ts';

const Data = z.object({ photo_id: z.uuid() });

export async function handle(data: unknown, ctx: JobCtx): Promise<void> {
	const parsed = Data.safeParse(data);
	// Bad data stays bad: retrying cannot help.
	if (!parsed.success) return ctx.logger.error('photo.embed: invalid job dropped');
	// A vector matching already had (an embedding.model row before this run) is not new.
	const had = await MatchingDomain.embeddedReport(parsed.data, ctx);
	try {
		await EmbeddingsDomain.embedPhoto({ ...parsed.data, last_attempt: ctx.lastAttempt }, ctx);
	} finally {
		// Also when a later model (embedding.next_model) failed after embedding.model's vector was stored.
		const report_id = had ? null : await MatchingDomain.embeddedReport(parsed.data, ctx);
		if (report_id) await MatchingDomain.rematchReport({ report_id }, ctx);
	}
}
