// Seeder 40-matching-rescore (C8, TASK-114.22): every deploy re-scores the stored match suggestions under the rules
// and app_config `matching.*` it ships with, so a rule change also reaches suggestions made before it; a pair that no
// longer passes leaves the managers' list. Never inserts or notifies. Runs in every environment; a rerun changes nothing.
import { MatchingDomain } from '../../domains/matching/index.ts';
import { systemCtx } from '../../lib/ctx.ts';

export default async function rescoreMatches(): Promise<void> {
	await MatchingDomain.rescoreSuggestions({}, systemCtx());
}
