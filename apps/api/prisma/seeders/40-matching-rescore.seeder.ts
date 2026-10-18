// Seeder 40-matching-rescore (C8, TASK-114.22): after a deploy, re-scores the match suggestions an older algorithm
// version stored (matches.algo_version ≠ MATCH_ALGO_VERSION), so a rule change also reaches them; a pair that no longer
// passes leaves the managers' list. A one-off per version: rows of today's version are never touched again, so an
// admin's later matching.threshold never deletes them. Never inserts or notifies. Runs in every environment.
import { MatchingDomain } from '../../domains/matching/index.ts';
import { systemCtx } from '../../lib/ctx.ts';
import { logger } from '../../lib/logger.ts';

export default async function rescoreMatches(): Promise<void> {
	// A failure must not stop the deploy (remote.sh runs with set -e): the rows stay old and the next deploy retries.
	try {
		await MatchingDomain.rescoreSuggestions({}, systemCtx());
	} catch (err) {
		logger.error({ err }, 'matching rescore failed; the next deploy retries it');
	}
}
