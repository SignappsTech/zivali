// Seeder 41-embedding-backfill (C20 §Jobs, TASK-42.3): after a deploy, queues embedding.backfill when the embedder is
// on and an eligible photo lacks a vector for embedding.model (photos from before M3). Runs in every environment; with
// the embedder off it queues nothing. Never embeds itself: the worker runs the pass, at embedding.backfill_per_minute.
import { EmbeddingsDomain } from '../../domains/embeddings/index.ts';
import { systemCtx } from '../../lib/ctx.ts';
import { stopJobs } from '../../lib/jobs.ts';
import { logger } from '../../lib/logger.ts';

export default async function queueEmbeddingBackfill(): Promise<void> {
	// A failure must not stop the deploy (remote.sh runs with set -e): the next deploy, or a backfill by hand, retries.
	try {
		if (await EmbeddingsDomain.queueBackfill(systemCtx())) logger.info('embedding backfill queued');
	} catch (err) {
		logger.error({ err }, 'embedding backfill not queued; the next deploy retries it');
	} finally {
		// The send started pg-boss in the seed process; its timers are never unref'd, so the seed would not exit and the
		// deploy would hang. A no-op when pg-boss never started.
		await stopJobs().catch((err: unknown) =>
			logger.error({ err }, 'pg-boss stop failed after the embedding backfill')
		);
	}
}
