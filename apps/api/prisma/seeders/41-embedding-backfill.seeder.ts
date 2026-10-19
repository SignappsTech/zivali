// Seeder 41-embedding-backfill (C20 §Jobs, TASK-42.3): after a deploy, queues embedding.backfill when the embedder is
// on and an eligible photo lacks a vector for embedding.model (photos from before M3). Runs in every environment; with
// the embedder off (EMBEDDER_PROVIDER off, or unset or mock outside APP_ENV=local) it queues nothing. Never embeds
// itself: the worker runs the pass, at embedding.backfill_per_minute.
import { EmbeddingsDomain } from '../../domains/embeddings/index.ts';
import { systemCtx } from '../../lib/ctx.ts';
import { logger } from '../../lib/logger.ts';

export default async function queueEmbeddingBackfill(): Promise<void> {
	// A failure must not stop the deploy (remote.sh runs with set -e): the next deploy, or a backfill by hand, retries.
	try {
		if (await EmbeddingsDomain.queueBackfill(systemCtx())) logger.info('embedding backfill queued');
	} catch (err) {
		logger.error({ err }, 'embedding backfill not queued; the next deploy retries it');
	}
}
