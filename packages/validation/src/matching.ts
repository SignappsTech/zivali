// C8 matching score (v3: attributes plus photo similarity): pure, so the worker and (later) the clients explain a
// suggestion the same way. Reasons carry bands and overlaps only, never a distance, a time or a chip number.
import {
	MATCH_STRENGTHS,
	SIZES,
	type Colour,
	type DistanceBand,
	type MatchReason,
	type MatchStrength,
	type Pattern,
	type Sex,
	type Size,
	type Uuid,
	type VisualBand,
} from '@zivali/types';

export type MatchAttributes = { size: Size | null; sex: Sex | null; colours: Colour[]; pattern: Pattern | null };
export type MatchFeatures = {
	/** Equal valid chips on the lost and the other report. */
	chip_match: boolean;
	other_type: 'found' | 'sighted';
	distance_km: number;
	/** other.event_at − lost.event_at in hours (negative when the animal was seen before it went missing). */
	delta_hours: number;
	lost: MatchAttributes;
	other: MatchAttributes;
	/**
	 * The most similar photo pair (C8 §Visual similarity 1-2). Null or left out (no vector on either side, provider
	 * down, query failed): exactly the v2 score, the fallback.
	 */
	visual?: VisualFeature | null;
};
/** V: the pair's cosine normalised by visualSimilarity, 0…1. */
export type VisualFeature = { V: number; lost_photo_id: Uuid; other_photo_id: Uuid };
export type VisualWeights = { distance: number; time: number; attributes: number; visual: number };
/** app_config `matching.distance_scale_km`, `matching.weights` and (with a visual term) `matching.weights_visual`. */
export type MatchScoreConfig = {
	distance_scale_km: number;
	weights: { distance: number; time: number; attributes: number };
	/** Used only when features.visual is set; VISUAL_WEIGHTS when left out. */
	weights_visual?: VisualWeights;
};
export type MatchScore = { score: number; strength: MatchStrength; reasons: MatchReason[] };
/**
 * `matches.algo_version` of every score from scoreMatch, with or without V (v2 scored attributes only, v1 counted every
 * unknown attribute 0.5).
 */
export const MATCH_ALGO_VERSION = 'v3';
/** C8 start values of `matching.weights_visual`: placeholders until the evaluation (TASK-43.3) sets them. */
export const VISUAL_WEIGHTS: VisualWeights = { distance: 0.3, time: 0.15, attributes: 0.25, visual: 0.3 };

// Each similarity is 0…1 for an attribute known on both sides, null when either side does not know it.

function sizeSim(a: Size | null, b: Size | null): number | null {
	if (!a || !b) return null;
	const gap = Math.abs(SIZES.indexOf(a) - SIZES.indexOf(b));
	return gap === 0 ? 1 : gap === 1 ? 0.5 : 0;
}

function sexSim(a: Sex | null, b: Sex | null): number | null {
	if (!a || !b || a === 'unknown' || b === 'unknown') return null;
	return a === b ? 1 : 0;
}

/** Jaccard overlap. */
function colourOverlap(a: Colour[], b: Colour[]): number | null {
	if (!a.length || !b.length) return null;
	const shared = a.filter((colour) => b.includes(colour)).length;
	return shared / new Set([...a, ...b]).size;
}

function patternSim(a: Pattern | null, b: Pattern | null): number | null {
	if (!a || !b) return null;
	return a === b ? 1 : 0;
}

export function distanceBand(km: number): DistanceBand {
	return km < 1 ? 'lt1' : km < 3 ? '1to3' : km < 10 ? '3to10' : 'gt10';
}

/** Hour-band codes of the glossary §9 (`matches.gap_*`). */
export function hoursBand(hours: number): 'lt24' | '24to72' | 'gt72' {
	return hours < 24 ? 'lt24' : hours < 72 ? '24to72' : 'gt72';
}

/**
 * C8 §Visual similarity 2: V = clamp((cos − floor) / (ceiling − floor), 0, 1), floor and ceiling per embedding model
 * (`matching.visual_floor` / `matching.visual_ceiling`, placeholders 0.70 / 0.95 until TASK-43.3). NaN when the ceiling
 * is not above the floor, so scoreMatch falls back to v2 instead of lifting every veto.
 */
export function visualSimilarity(cos: number, floor: number, ceiling: number): number {
	if (!(ceiling > floor)) return Number.NaN;
	return Math.min(1, Math.max(0, (cos - floor) / (ceiling - floor)));
}

/** Visual reason band: V ≥ 0.8 / ≥ 0.5 / ≥ 0.25 (C8 placeholders until TASK-43.3); null below, no reason. */
export function visualBand(V: number): VisualBand | null {
	return V >= 0.8 ? 'very_similar' : V >= 0.5 ? 'similar' : V >= 0.25 ? 'some' : null;
}

const round = (value: number, digits: number) => Math.round(value * 10 ** digits) / 10 ** digits;
/** C8 §Score: ≥ 0.8 strong, ≥ 0.65 good, else possible (the matching eval re-applies it for a looser geo-time fit). */
export const strengthOf = (score: number): MatchStrength =>
	score >= 0.8 ? 'strong' : score >= 0.65 ? 'good' : 'possible';
const weaker = (a: MatchStrength, b: MatchStrength) =>
	MATCH_STRENGTHS.indexOf(a) > MATCH_STRENGTHS.indexOf(b) ? a : b;

/**
 * C8 §Score: D = exp(−km / scale), T = 1 − min(1, max(0, Δh) / (24 × 30)), A = the similarities of the attributes known
 * on both sides (size, colour, sex, pattern) summed and divided by 4, so an unknown attribute adds nothing;
 * score = wD·D + wT·T + wA·A (3 decimals). A chip match scores 1 and is strong; otherwise ≥ 0.8 strong, ≥ 0.65 good.
 * Null (no suggestion) without a chip when a known attribute contradicts (another sex, sizes two steps apart, no shared
 * colour) or none agrees, so species, distance and time alone never make a match.
 *
 * C8 §Visual similarity, with features.visual: score = wD·D + wT·T + wA·A + wV·V (`weights_visual`); V ≥ 0.8 lifts the
 * size and colour vetoes (never the sex one) and V ≥ 0.5 counts as evidence. Without a geo-time fit (under 3 km and
 * 72 h) V never raises the strength above the pair's v2 strength, possible when v2 suggests nothing (visual-only
 * evidence, a lifted veto): look-alikes far apart or days apart are never notified on their photos.
 */
export function scoreMatch(features: MatchFeatures, config: MatchScoreConfig): MatchScore | null {
	const { lost, other } = features;
	// A V that is no number (a bad floor/ceiling) never lifts a veto: no visual term, the v2 fallback.
	const visual = features.visual && Number.isFinite(features.visual.V) ? features.visual : null;
	const size = sizeSim(lost.size, other.size);
	const sex = sexSim(lost.sex, other.sex);
	const overlap = colourOverlap(lost.colours, other.colours);
	const pattern = patternSim(lost.pattern, other.pattern);

	// The mean over the k attributes known on both sides, weighted by k / 4, is their sum / 4.
	const A = ((size ?? 0) + (overlap ?? 0) + (sex ?? 0) + (pattern ?? 0)) / 4;
	// After the veto only a different pattern can be known and disagree, so "one known attribute agrees" is A > 0.
	const v2Passes = !(sex === 0 || size === 0 || overlap === 0 || A === 0);
	// Without a vector V counts 0: no veto lifted, no visual evidence, the v2 rules. Clamped, so a score stays 0…1.
	const V = Math.min(1, Math.max(0, visual?.V ?? 0));
	const vetoed = sex === 0 || ((size === 0 || overlap === 0) && V < 0.8);
	if (!features.chip_match && (vetoed || (A === 0 && V < 0.5))) return null;

	const D = Math.exp(-features.distance_km / config.distance_scale_km);
	const T = 1 - Math.min(1, Math.max(0, features.delta_hours) / (24 * 30));
	const { weights: w } = config;
	const v2Score = round(w.distance * D + w.time * T + w.attributes * A, 3);
	const wv = config.weights_visual ?? VISUAL_WEIGHTS;
	const blend = visual ? round(wv.distance * D + wv.time * T + wv.attributes * A + wv.visual * V, 3) : v2Score;
	const score = features.chip_match ? 1 : blend;
	let strength: MatchStrength = features.chip_match ? 'strong' : strengthOf(score);

	const distance = distanceBand(features.distance_km);
	// A sighting before the loss shows its gap too (40 h before is 24to72, not lt24); T above stays no gap.
	const hours = hoursBand(Math.abs(features.delta_hours));
	const geoTimeFit = (distance === 'lt1' || distance === '1to3') && hours !== 'gt72';
	if (visual && !features.chip_match && !geoTimeFit)
		strength = weaker(strength, v2Passes ? strengthOf(v2Score) : 'possible');

	const reasons: MatchReason[] = [];
	// A sighting's chip line (P11 `reason_chip_sighting`) already says the chip is the same, so it replaces `chip`.
	if (features.chip_match) reasons.push({ code: features.other_type === 'sighted' ? 'chip_sighting' : 'chip' });
	reasons.push({ code: 'distance', band: distance });
	reasons.push({ code: 'time', hours_band: hours });
	if (size) reasons.push({ code: 'size', match: size === 1 ? 'equal' : 'adjacent' });
	if (overlap) reasons.push({ code: 'colour', overlap: round(overlap, 2) });
	if (sex === 1) reasons.push({ code: 'sex', match: 'equal' });
	if (pattern === 1) reasons.push({ code: 'pattern', match: 'equal' });
	const band = visualBand(V);
	if (visual && band)
		reasons.push({
			code: 'visual',
			band,
			lost_photo_id: visual.lost_photo_id,
			other_photo_id: visual.other_photo_id,
		});
	return { score, strength, reasons };
}
