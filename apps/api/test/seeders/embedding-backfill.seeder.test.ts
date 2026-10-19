// Seeder 41-embedding-backfill (TASK-42.3): the deploy queues the backfill through EmbeddingsDomain.queueBackfill
// (behaviour in test/domains/embeddings.backfill.test.ts) and never fails the seed, so it never stops a deploy.
import { afterEach, describe, expect, it, vi } from 'vitest';

import { EmbeddingsDomain } from '../../domains/embeddings/index.ts';
import { logger } from '../../lib/logger.ts';
import queueEmbeddingBackfill from '../../prisma/seeders/41-embedding-backfill.seeder.ts';

afterEach(() => {
	vi.restoreAllMocks();
});

describe('seeder 41-embedding-backfill', () => {
	it('asks the domain to queue the backfill and logs when it did', async () => {
		const queue = vi.spyOn(EmbeddingsDomain, 'queueBackfill').mockResolvedValue(true);
		const info = vi.spyOn(logger, 'info').mockImplementation(() => undefined);
		await queueEmbeddingBackfill();
		expect(queue).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ adapters: expect.anything() }));
		expect(info).toHaveBeenCalledWith('embedding backfill queued');
	});

	it('logs a failure instead of throwing, so the deploy goes on and the next one retries', async () => {
		vi.spyOn(EmbeddingsDomain, 'queueBackfill').mockRejectedValue(new Error('database gone'));
		const error = vi.spyOn(logger, 'error').mockImplementation(() => undefined);
		await expect(queueEmbeddingBackfill()).resolves.toBeUndefined();
		expect(error).toHaveBeenCalledExactlyOnceWith(
			{ err: expect.any(Error) },
			'embedding backfill not queued; the next deploy retries it'
		);
	});
});
