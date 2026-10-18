// photo.embed { photo_id } (C20 §Jobs): one vector per photo and active model (EmbeddingsDomain.embedPhoto). Retried
// 5× with backoff; the last attempt tells the domain to log photo.embed.dead_letter.
import { z } from 'zod';

import { EmbeddingsDomain } from '../domains/embeddings/index.ts';
import type { JobCtx } from './index.ts';

const Data = z.object({ photo_id: z.uuid() });

export async function handle(data: unknown, ctx: JobCtx): Promise<void> {
	const parsed = Data.safeParse(data);
	// Bad data stays bad: retrying cannot help.
	if (!parsed.success) return ctx.logger.error('photo.embed: invalid job dropped');
	await EmbeddingsDomain.embedPhoto({ ...parsed.data, last_attempt: ctx.lastAttempt }, ctx);
}
