// Matching engine (C8), run by the match.report job for every new or relevantly changed report: chip pairs and
// geo/time/attribute candidates, scored with scoreMatch (v3: plus photo similarity when both sides have vectors),
// stored idempotently as suggestions for the lost report's managers, who are notified once per suggestion that is
// good or better (match_chip for chips, any hour).
import { z } from 'zod';

import { MATCH_STRENGTHS, type Colour, type MatchStrength, type Pattern, type Sex, type Size } from '@zivali/types';
import {
	MATCH_ALGO_VERSION,
	scoreMatch,
	VISUAL_WEIGHTS,
	visualSimilarity,
	type MatchScore,
	type VisualFeature,
} from '@zivali/validation/matching';

import { embedderOn } from '../../adapters/embedder/index.ts';
import configStore from '../../lib/config-store.ts';
import type { Ctx } from '../../lib/ctx.ts';
import { prisma, type Prisma } from '../../prisma/prisma.ts';
// The similarity query of C20 §Queries as is (embeddings/index.ts exports the domain only).
import EmbeddingsDao from '../embeddings/embeddings.dao.ts';
import { NotificationsDomain } from '../notifications/index.ts';
import MatchingDao, { type PairRow } from './matching.dao.ts';

// Debounce of match.report after a new vector (C8 §Visual similarity 5).
const REMATCH_SECONDS = 60;
const positive = z.number().positive();
const weight = z.number().min(0);
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
	// v3 (C8 §Visual similarity); a floor not below the ceiling makes V NaN, so scoreMatch falls back to v2.
	weights_visual: z
		.object({ distance: weight, time: weight, attributes: weight, visual: weight })
		.catch(VISUAL_WEIGHTS),
	visual_floor: z.number().catch(0.7),
	visual_ceiling: z.number().catch(0.95),
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

/** V of a pair, keyed by pairKey; a pair without an entry scores as v2. */
type Visuals = Map<string, VisualFeature>;
const pairKey = (pair: { lost_id: string; other_id: string }) => `${pair.lost_id}:${pair.other_id}`;

/** Null: no suggestion (a contradiction or no evidence without a chip, C8 §Score). */
function scorePair(pair: PairRow, config: MatchingConfig, visuals: Visuals): MatchScore | null {
	return scoreMatch(
		{
			chip_match: pair.chip_match,
			other_type: pair.other_type,
			distance_km: pair.distance_km,
			delta_hours: pair.delta_hours,
			lost: attributes(pair.lost_size, pair.lost_sex, pair.lost_colours, pair.lost_pattern),
			other: attributes(pair.other_size, pair.other_sex, pair.other_colours, pair.other_pattern),
			visual: visuals.get(pairKey(pair)) ?? null,
		},
		config
	);
}

/**
 * V for the pairs of one report (`anchor` is on one side of each) from one similarity call over embedding.model
 * (C8 §Visual similarity 1-2, C20 §Queries). The query is symmetric: for a found or sighted anchor its photo comes back
 * as lost_photo_id and is swapped. A pair without a vector on either side gets no V. With the embedder off no query
 * runs; a query error or its 2 s timeout logs matching.visual_unavailable. Either way every pair scores as v2 and the
 * job goes on.
 */
async function visualsOf(anchor: string, pairs: PairRow[], config: MatchingConfig, ctx: Ctx): Promise<Visuals> {
	const visuals: Visuals = new Map();
	if (!pairs.length || !embedderOn(ctx.adapters.embedder)) return visuals;
	const model = await configStore.get('embedding.model');
	if (typeof model !== 'string') return visuals;
	const byCounterpart = new Map(pairs.map((pair) => [pair.lost_id === anchor ? pair.other_id : pair.lost_id, pair]));
	const rows = await EmbeddingsDao.similarity(anchor, [...byCounterpart.keys()], model).catch((err: unknown) => {
		ctx.logger.warn({ err, report_id: anchor }, 'matching.visual_unavailable');
		return [];
	});
	for (const row of rows) {
		const pair = byCounterpart.get(row.other_report_id);
		if (!pair) continue;
		const anchorIsLost = pair.lost_id === anchor;
		visuals.set(pairKey(pair), {
			V: visualSimilarity(row.cos, config.visual_floor, config.visual_ceiling),
			lost_photo_id: anchorIsLost ? row.lost_photo_id : row.other_photo_id,
			other_photo_id: anchorIsLost ? row.other_photo_id : row.lost_photo_id,
		});
	}
	return visuals;
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
 * pairs scoreMatch suggests with a score ≥ threshold, at most top_n per lost report counting the ones it already has.
 * Then re-scores the report's other suggestions, so an edit that adds a contradiction or takes the evidence away
 * removes them at once.
 */
export async function matchReport(input: { report_id: string }, ctx: Ctx): Promise<{ stored: number }> {
	const config = await matchingConfig();
	const pairs = await MatchingDao.candidatePairs(input.report_id, config, ctx.tx);
	const visuals = await visualsOf(input.report_id, pairs, config, ctx);
	const scored = pairs
		.flatMap((pair) => {
			const result = scorePair(pair, config, visuals);
			return result && (pair.chip_match || result.score >= config.threshold) ? [{ pair, ...result }] : [];
		})
		.sort((a, b) => b.score - a.score);

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
	const { removed } = await rescoreSuggestions(input, ctx);
	ctx.logger.info(
		{ report_id: input.report_id, candidates: pairs.length, visual: visuals.size, stored, removed },
		'matching done'
	);
	return { stored };
}

/**
 * Re-scores stored suggestions without a chip under today's rules and app_config (C8, TASK-114.22): those of one
 * report (either side, after match.report), or without report_id every one an older algorithm version scored (seeder
 * 40-matching-rescore, a one-off per version). A pair that no longer passes is deleted, so it leaves the managers'
 * list until match.report finds it again; the others get the new score, strength and algo_version. V as in
 * matchReport: one similarity call for the report, one per lost report for the older rows (none with the embedder
 * off, so without vectors every row keeps its v2 score). Never inserts and never notifies.
 */
export async function rescoreSuggestions(
	input: { report_id?: string },
	ctx: Ctx
): Promise<{ rescored: number; removed: number }> {
	const config = await matchingConfig();
	const only = input.report_id ? { report_id: input.report_id } : ({ older: true } as const);
	const rows = await MatchingDao.suggestedPairs(only, ctx.tx);
	const visuals: Visuals = new Map();
	for (const anchor of input.report_id ? [input.report_id] : new Set(rows.map((row) => row.lost_id))) {
		const mine = rows.filter((row) => row.lost_id === anchor || row.other_id === anchor);
		for (const [key, visual] of await visualsOf(anchor, mine, config, ctx)) visuals.set(key, visual);
	}
	const removed: string[] = [];
	let rescored = 0;
	for (const row of rows) {
		const result = scorePair(row, config, visuals);
		if (!result || (!row.chip_match && result.score < config.threshold)) removed.push(row.match_id);
		else if (
			result.score !== row.score ||
			result.strength !== row.strength ||
			row.algo_version !== MATCH_ALGO_VERSION
		) {
			await MatchingDao.rescoreSuggestion(row.match_id, { ...result, chip_match: row.chip_match }, ctx.tx);
			rescored++;
		}
	}
	await MatchingDao.removeSuggestions(removed, ctx.tx);
	if (!input.report_id) ctx.logger.info({ suggestions: rows.length, rescored, removed: removed.length }, 'rescored');
	return { rescored, removed: removed.length };
}

/** The open or matched report a photo is on, when the photo has a vector for embedding.model; else null. */
export async function embeddedReport(input: { photo_id: string }, ctx: Ctx): Promise<string | null> {
	const model = await configStore.get('embedding.model');
	return typeof model === 'string' ? MatchingDao.embeddedReport(input.photo_id, model, ctx.tx) : null;
}

/**
 * C8 §Visual similarity 5: after a new vector, match.report for the photo's report, so its pairs get V once both sides
 * are embedded. Singleton key = report id, debounced to one run per 60 s (a later photo moves to the next slot instead
 * of being dropped). The pairs keep notified_at: a pair is notified once.
 */
export async function rematchReport(input: { report_id: string }, ctx: Ctx): Promise<void> {
	await ctx.jobs.send('match.report', input, {
		singletonKey: input.report_id,
		singletonSeconds: REMATCH_SECONDS,
		singletonNextSlot: true,
	});
}

/**
 * Mark reunited (C4): the report's suggested and confirmed matches close, on either side; returns the reports on the
 * other side of the confirmed ones (the counterparts the reunite reaches).
 */
export async function closeMatchesOf(input: { report_id: string }, ctx: Ctx): Promise<string[]> {
	return MatchingDao.closeForReport(input.report_id, ctx.tx);
}

export default { matchReport, matchingConfig, rescoreSuggestions, embeddedReport, rematchReport, closeMatchesOf };
