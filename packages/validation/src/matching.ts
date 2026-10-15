// C8 matching v1 score: pure, so the worker and (later) the clients explain a suggestion the same way. Reasons carry
// bands and overlaps only, never a distance, a time or a chip number.
import {
	SIZES,
	type Colour,
	type DistanceBand,
	type MatchReason,
	type MatchStrength,
	type Pattern,
	type Sex,
	type Size,
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
};
/** app_config `matching.distance_scale_km` and `matching.weights`. */
export type MatchScoreConfig = {
	distance_scale_km: number;
	weights: { distance: number; time: number; attributes: number };
};
export type MatchScore = { score: number; strength: MatchStrength; reasons: MatchReason[] };

/** Unknown attributes count 0.5. */
const UNKNOWN = 0.5;

function sizeSim(a: Size | null, b: Size | null): number {
	if (!a || !b) return UNKNOWN;
	const gap = Math.abs(SIZES.indexOf(a) - SIZES.indexOf(b));
	return gap === 0 ? 1 : gap === 1 ? 0.5 : 0;
}

function sexSim(a: Sex | null, b: Sex | null): number {
	if (!a || !b || a === 'unknown' || b === 'unknown') return UNKNOWN;
	return a === b ? 1 : 0;
}

/** Jaccard overlap; null when either side has no colours (unknown). */
function colourOverlap(a: Colour[], b: Colour[]): number | null {
	if (!a.length || !b.length) return null;
	const shared = a.filter((colour) => b.includes(colour)).length;
	return shared / new Set([...a, ...b]).size;
}

function patternSim(a: Pattern | null, b: Pattern | null): number {
	if (!a || !b) return UNKNOWN;
	return a === b ? 1 : 0;
}

export function distanceBand(km: number): DistanceBand {
	return km < 1 ? 'lt1' : km < 3 ? '1to3' : km < 10 ? '3to10' : 'gt10';
}

/** Hour-band codes of the glossary §9 (`matches.gap_*`). */
export function hoursBand(hours: number): 'lt24' | '24to72' | 'gt72' {
	return hours < 24 ? 'lt24' : hours < 72 ? '24to72' : 'gt72';
}

const round = (value: number, digits: number) => Math.round(value * 10 ** digits) / 10 ** digits;

/**
 * C8 §Score: D = exp(−km / scale), T = 1 − min(1, max(0, Δh) / (24 × 30)), A = mean(size, colour, sex, pattern),
 * score = wD·D + wT·T + wA·A (3 decimals). A chip match scores 1 and is strong; otherwise ≥ 0.8 strong, ≥ 0.65 good.
 */
export function scoreMatch(features: MatchFeatures, config: MatchScoreConfig): MatchScore {
	const { lost, other } = features;
	const size = sizeSim(lost.size, other.size);
	const sex = sexSim(lost.sex, other.sex);
	const overlap = colourOverlap(lost.colours, other.colours);
	const pattern = patternSim(lost.pattern, other.pattern);

	const D = Math.exp(-features.distance_km / config.distance_scale_km);
	const T = 1 - Math.min(1, Math.max(0, features.delta_hours) / (24 * 30));
	const A = (size + (overlap ?? UNKNOWN) + sex + pattern) / 4;
	const { weights: w } = config;
	const score = features.chip_match ? 1 : round(w.distance * D + w.time * T + w.attributes * A, 3);
	const strength: MatchStrength =
		features.chip_match || score >= 0.8 ? 'strong' : score >= 0.65 ? 'good' : 'possible';

	const reasons: MatchReason[] = [];
	// A sighting's chip line (P11 `reason_chip_sighting`) already says the chip is the same, so it replaces `chip`.
	if (features.chip_match) reasons.push({ code: features.other_type === 'sighted' ? 'chip_sighting' : 'chip' });
	reasons.push({ code: 'distance', band: distanceBand(features.distance_km) });
	reasons.push({ code: 'time', hours_band: hoursBand(features.delta_hours) });
	if (lost.size && other.size && size > 0) reasons.push({ code: 'size', match: size === 1 ? 'equal' : 'adjacent' });
	if (overlap) reasons.push({ code: 'colour', overlap: round(overlap, 2) });
	if (sex === 1) reasons.push({ code: 'sex', match: 'equal' });
	if (pattern === 1) reasons.push({ code: 'pattern', match: 'equal' });
	return { score, strength, reasons };
}
