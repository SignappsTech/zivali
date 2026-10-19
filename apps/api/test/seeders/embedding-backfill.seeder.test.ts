// Seeder 41-embedding-backfill (TASK-42.3): the deploy queues the backfill through EmbeddingsDomain.queueBackfill
// (behaviour in test/domains/embeddings.backfill.test.ts), never fails the seed, and always stops pg-boss again: its
// timers would keep the seed process, and so the deploy, from exiting.
import { afterEach, describe, expect, it, vi } from 'vitest';

import { EmbeddingsDomain } from '../../domains/embeddings/index.ts';
import { startJobs, stopJobs } from '../../lib/jobs.ts';
import { logger } from '../../lib/logger.ts';
import queueEmbeddingBackfill from '../../prisma/seeders/41-embedding-backfill.seeder.ts';

afterEach(async () => {
	vi.restoreAllMocks();
	await stopJobs();
});

/** Runs the seeder with pg-boss started (as a send leaves it) and returns whether the seeder stopped it. */
async function stopsPgboss(): Promise<boolean> {
	const before = await startJobs();
	await queueEmbeddingBackfill();
	// startJobs() hands back the running instance; a new one means the seeder stopped the old.
	return (await startJobs()) !== before;
}

describe('seeder 41-embedding-backfill', () => {
	it('embedder on: queues the backfill, logs it and stops pg-boss', async () => {
		const queue = vi.spyOn(EmbeddingsDomain, 'queueBackfill').mockResolvedValue(true);
		const info = vi.spyOn(logger, 'info').mockImplementation(() => undefined);
		expect(await stopsPgboss()).toBe(true);
		expect(queue).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ adapters: expect.anything() }));
		expect(info).toHaveBeenCalledWith('embedding backfill queued');
	});

	it('embedder off or nothing missing: queues nothing and still stops pg-boss', async () => {
		vi.spyOn(EmbeddingsDomain, 'queueBackfill').mockResolvedValue(false);
		const info = vi.spyOn(logger, 'info').mockImplementation(() => undefined);
		expect(await stopsPgboss()).toBe(true);
		expect(info).not.toHaveBeenCalledWith('embedding backfill queued');
	});

	it('logs a failure instead of throwing, so the deploy goes on and the next one retries; stops pg-boss', async () => {
		vi.spyOn(EmbeddingsDomain, 'queueBackfill').mockRejectedValue(new Error('database gone'));
		const error = vi.spyOn(logger, 'error').mockImplementation(() => undefined);
		expect(await stopsPgboss()).toBe(true);
		expect(error).toHaveBeenCalledExactlyOnceWith(
			{ err: expect.any(Error) },
			'embedding backfill not queued; the next deploy retries it'
		);
	});

	it('without pg-boss started, the stop is a no-op', async () => {
		vi.spyOn(EmbeddingsDomain, 'queueBackfill').mockResolvedValue(false);
		await expect(queueEmbeddingBackfill()).resolves.toBeUndefined();
	});
});
