// Matching engine v1 (C8), run by the match.report job for every new or relevantly changed report: chip pairs and
// geo/time/attribute candidates, scored with scoreMatch, stored idempotently as suggestions for the lost report's
// managers, who are notified once per suggestion that is good or better (match_chip for chips, any hour).
import { z } from 'zod';

import { MATCH_STRENGTHS, type Colour, type MatchStrength, type Pattern, type Sex, type Size } from '@zivali/types';
import { scoreMatch, type MatchScore } from '@zivali/validation/matching';

import configStore from '../../lib/config-store.ts';
import type { Ctx } from '../../lib/ctx.ts';
import { prisma, type Prisma } from '../../prisma/prisma.ts';
import { NotificationsDomain } from '../notifications/index.ts';
import MatchingDao, { type PairRow } from './matching.dao.ts';

const positive = z.number().positive();
/** app_config `matching.*` (C8 §Config keys); a missing or malformed value falls back to the contract default. */
const MatchingConfig = z.object({
	threshold: z.number().min(0).max(1).catch(0.5),
	top_n: z.number().int().positive().catch(10),
	max_days: z.number().int().positive().catch(30),
	max_distance_km: positive.catch(30),
	distance_scale_km: positive.catch(3),
	weights: z
		.object({ distance: z.number().min(0), time: z.number().min(0), attributes: z.number().min(0) })
		.catch({ distance: 0.4, time: 0.2, attributes: 0.4 }),
	notify_min_strength: z.enum(MATCH_STRENGTHS).catch('good'),
});
export type MatchingConfig = z.infer<typeof MatchingConfig>;

export async function matchingConfig(): Promise<MatchingConfig> {
	const keys = Object.keys(MatchingConfig.shape) as (keyof MatchingConfig)[];
	const values = await Promise.all(keys.map((key) => configStore.get(`matching.${key}`)));
	return MatchingConfig.parse(Object.fromEntries(keys.map((key, i) => [key, values[i]])));
}

const atLeast = (strength: MatchStrength, min: MatchStrength) =>
	MATCH_STRENGTHS.indexOf(strength) <= MATCH_STRENGTHS.indexOf(min);

const attributes = (size: string | null, sex: string | null, colours: string[], pattern: string | null) => ({
	size: size as Size | null,
	sex: sex as Sex | null,
	colours: colours as Colour[],
	pattern: pattern as Pattern | null,
});

function scorePair(pair: PairRow, config: MatchingConfig): MatchScore {
	return scoreMatch(
		{
			chip_match: pair.chip_match,
			other_type: pair.other_type,
			distance_km: pair.distance_km,
			delta_hours: pair.delta_hours,
			lost: attributes(pair.lost_size, pair.lost_sex, pair.lost_colours, pair.lost_pattern),
			other: attributes(pair.other_size, pair.other_sex, pair.other_colours, pair.other_pattern),
		},
		config
	);
}

/**
 * match_chip (quiet hours ignored, C10) or match_suggested to every manager of the lost report. The job carries ids
 * only (CH-135); notify.send resolves the codes and the copy, so no contact data of either side is ever in it.
 */
async function notifyManagers(matchId: string, pair: PairRow, ctx: Ctx): Promise<void> {
	const type = pair.chip_match ? 'match_chip' : 'match_suggested';
	const payload = { template: type, match_id: matchId, report_id: pair.lost_id } as const;
	for (const user_id of await MatchingDao.managerIds(pair.lost_id, ctx.tx)) {
		await NotificationsDomain.enqueueNotification({ user_id, type, payload, dedupe_key: `match:${matchId}` }, ctx);
	}
}

/**
 * Matches one report against the open reports of the other side (C8 §Engine). Idempotent: a pair is stored once,
 * refreshed while suggested, never resurrected after a rejection, and notified at most once. Keeps chip pairs and
 * pairs scoring ≥ threshold, at most top_n per lost report counting the suggestions it already has.
 */
export async function matchReport(input: { report_id: string }, ctx: Ctx): Promise<{ stored: number }> {
	const config = await matchingConfig();
	const pairs = await MatchingDao.candidatePairs(input.report_id, config, ctx.tx);
	const scored = pairs
		.map((pair) => ({ pair, ...scorePair(pair, config) }))
		.filter(({ pair, score }) => pair.chip_match || score >= config.threshold)
		.sort((a, b) => b.score - a.score);
	if (!scored.length) return { stored: 0 };

	const active = await MatchingDao.activeMatches([...new Set(scored.map(({ pair }) => pair.lost_id))], ctx.tx);
	let stored = 0;
	for (const { pair, score, strength, reasons } of scored) {
		const kept = active.filter((match) => match.lost_report_id === pair.lost_id);
		const known = kept.some((match) => match.other_report_id === pair.other_id);
		const better = kept.filter((match) => match.other_report_id !== pair.other_id && match.score >= score);
		if (!pair.chip_match && !known && better.length >= config.top_n) continue;

		const save = async (tx: Prisma.TransactionClient) => {
			const match = await MatchingDao.upsertSuggestion(
				{
					lost_report_id: pair.lost_id,
					other_report_id: pair.other_id,
					score,
					strength,
					chip_match: pair.chip_match,
					reasons,
					now: ctx.now,
				},
				tx
			);
			if (!match) return false;
			await MatchingDao.setFirstMatchAt(pair.lost_id, ctx.now, tx);
			const notify = pair.chip_match || atLeast(strength, config.notify_min_strength);
			if (notify && !match.notified_at && (await MatchingDao.claimNotification(match.id, ctx.now, tx))) {
				await notifyManagers(match.id, pair, { ...ctx, tx });
			}
			return true;
		};
		if (!(await (ctx.tx ? save(ctx.tx) : prisma.$transaction(save)))) continue;
		stored++;
		if (!known) active.push({ lost_report_id: pair.lost_id, other_report_id: pair.other_id, score });
	}
	ctx.logger.info({ report_id: input.report_id, candidates: pairs.length, stored }, 'matching done');
	return { stored };
}

/**
 * Mark reunited (C4): the report's suggested and confirmed matches close, on either side; returns the reports on the
 * other side of the confirmed ones (the counterparts the reunite reaches).
 */
export async function closeMatchesOf(input: { report_id: string }, ctx: Ctx): Promise<string[]> {
	return MatchingDao.closeForReport(input.report_id, ctx.tx);
}

export default { matchReport, matchingConfig, closeMatchesOf };
