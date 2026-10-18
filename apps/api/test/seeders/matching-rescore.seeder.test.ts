// Seeder 40-matching-rescore (TASK-114.22): the deploy one-off re-scores the suggestions of older algorithm versions
// (behaviour in test/domains/matching.domain.test.ts) and never fails the seed, so it never stops a deploy.
import { afterEach, describe, expect, it, vi } from 'vitest';

import { MatchingDomain } from '../../domains/matching/index.ts';
import { logger } from '../../lib/logger.ts';
import rescoreMatches from '../../prisma/seeders/40-matching-rescore.seeder.ts';

afterEach(() => {
	vi.restoreAllMocks();
});

describe('seeder 40-matching-rescore', () => {
	it('re-scores the suggestions of older algorithm versions (no report_id)', async () => {
		const rescore = vi.spyOn(MatchingDomain, 'rescoreSuggestions').mockResolvedValue({ rescored: 0, removed: 0 });
		await rescoreMatches();
		expect(rescore).toHaveBeenCalledExactlyOnceWith({}, expect.anything());
	});

	it('logs a failure instead of throwing, so the deploy goes on and the next one retries', async () => {
		vi.spyOn(MatchingDomain, 'rescoreSuggestions').mockRejectedValue(new Error('database gone'));
		const error = vi.spyOn(logger, 'error').mockImplementation(() => undefined);
		await expect(rescoreMatches()).resolves.toBeUndefined();
		expect(error).toHaveBeenCalledExactlyOnceWith(
			{ err: expect.any(Error) },
			'matching rescore failed; the next deploy retries it'
		);
	});
});
