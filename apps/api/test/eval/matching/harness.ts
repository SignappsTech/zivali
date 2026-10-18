// Matching evaluation (C8 §Visual similarity 9, TASK-43.3): every lost × found/sighted pair of a labelled set is
// scored with scoreMatch, once without a visual term (v2) and once with V (v3), and reported as recall@10 per lost
// report and precision at notify_min_strength. Pure and offline: the caller supplies the photo vectors (mock labels
// or vectors cached from one Voyage run).
import { z } from 'zod';

import {
	COLOURS,
	MATCH_STRENGTHS,
	PATTERNS,
	REPORT_TYPES,
	SEXES,
	SIZES,
	SPECIES,
	type MatchStrength,
} from '@zivali/types';
import {
	scoreMatch,
	strengthOf,
	visualSimilarity,
	VISUAL_WEIGHTS,
	type MatchFeatures,
	type VisualWeights,
} from '@zivali/validation/matching';

/**
 * One report of a set. Reports with the same `animal` show the same animal (the label; it never reaches the scorer).
 * Position in km on a plane and event time in hours from the set's start give distance_km and delta_hours.
 */
export const EvalReport = z.object({
	id: z.string().min(1),
	type: z.enum(REPORT_TYPES),
	animal: z.string().min(1),
	species: z.enum(SPECIES),
	x_km: z.number(),
	y_km: z.number(),
	hours: z.number(),
	size: z.enum(SIZES).nullable(),
	sex: z.enum(SEXES).nullable(),
	colours: z.array(z.enum(COLOURS)),
	pattern: z.enum(PATTERNS).nullable(),
	/** Photo keys; the set's vector source maps each to its embedding (none or unknown: no visual term). */
	photos: z.array(z.string().min(1)).max(5),
});
export type EvalReport = z.infer<typeof EvalReport>;

/** The C8 §Config keys defaults (MatchingConfig in matching.domain.ts). */
export const BASE = {
	threshold: 0.5,
	top_n: 10,
	max_days: 30,
	max_distance_km: 30,
	distance_scale_km: 3,
	weights: { distance: 0.4, time: 0.2, attributes: 0.4 },
	notify_min_strength: 'good' as MatchStrength,
};

export type VisualConfig = { floor: number; ceiling: number; weights: VisualWeights };
/** A geo-time fit for V ≥ 0.8 looser than scoreMatch's (< 3 km and < 72 h): under `km` and under `hours`. */
export type LooseFit = { name: string; km: number; hours: number };
/** visual null: v2 (the fallback); otherwise v3 with these floor, ceiling and weights. */
export type Variant = { name: string; visual: VisualConfig | null; loose?: LooseFit };
export type Metrics = {
	/** Lost reports with their animal in their top_n suggestions / lost reports whose animal is in the set. */
	recall10: number;
	/** Positives / pairs notified (at least notify_min_strength); 0 when nothing is notified. */
	precision: number;
	notified: number;
	notifiedPositives: number;
	hardNegativesNotified: number;
};

type Candidate = {
	lost: string;
	positive: boolean;
	/** Different animal, same species, size and colours. */
	hard: boolean;
	features: MatchFeatures;
	best: { cos: number; lost_photo_id: string; other_photo_id: string } | null;
};
export type Prepared = {
	candidates: Candidate[];
	lostWithPositive: number;
	positives: number;
	hardNegatives: number;
};

const dot = (a: number[], b: number[]) => a.reduce((sum, x, i) => sum + x * b[i]!, 0);
const sameColours = (a: EvalReport, b: EvalReport) =>
	a.colours.length > 0 && a.colours.length === b.colours.length && a.colours.every((c) => b.colours.includes(c));

/** The most similar photo pair (C8 §Visual similarity 1); vectors are L2-normalised, so cosine is the dot product. */
function bestPair(lost: EvalReport, other: EvalReport, vectorOf: (photo: string) => number[] | undefined) {
	let best: Candidate['best'] = null;
	for (const a of lost.photos)
		for (const b of other.photos) {
			const va = vectorOf(a);
			const vb = vectorOf(b);
			if (!va || !vb) continue;
			const cos = dot(va, vb);
			if (!best || cos > best.cos) best = { cos, lost_photo_id: a, other_photo_id: b };
		}
	return best;
}

/**
 * The engine's candidates (C8 §Engine 2, approximated): same species, within max_distance_km and max_days either way.
 * Vectors are looked up once per photo.
 */
export function prepare(reports: EvalReport[], vectorOf: (photo: string) => number[] | undefined): Prepared {
	const cache = new Map<string, number[] | undefined>();
	const vector = (photo: string) => {
		if (!cache.has(photo)) cache.set(photo, vectorOf(photo));
		return cache.get(photo);
	};
	const lost = reports.filter((r) => r.type === 'lost');
	const others = reports.filter((r) => r.type !== 'lost');
	const candidates = lost.flatMap((l) =>
		others.flatMap((o): Candidate[] => {
			const distance_km = Math.hypot(o.x_km - l.x_km, o.y_km - l.y_km);
			const delta_hours = o.hours - l.hours;
			if (o.species !== l.species || distance_km > BASE.max_distance_km) return [];
			if (Math.abs(delta_hours) > BASE.max_days * 24) return [];
			const positive = o.animal === l.animal;
			return [
				{
					lost: l.id,
					positive,
					hard: !positive && o.size !== null && o.size === l.size && sameColours(l, o),
					features: {
						chip_match: false,
						other_type: o.type as 'found' | 'sighted',
						distance_km,
						delta_hours,
						lost: { size: l.size, sex: l.sex, colours: l.colours, pattern: l.pattern },
						other: { size: o.size, sex: o.sex, colours: o.colours, pattern: o.pattern },
					},
					best: bestPair(l, o, vector),
				},
			];
		})
	);
	return {
		candidates,
		lostWithPositive: lost.filter((l) => others.some((o) => o.animal === l.animal)).length,
		positives: candidates.filter((c) => c.positive).length,
		hardNegatives: candidates.filter((c) => c.hard).length,
	};
}

const atLeast = (strength: MatchStrength, min: MatchStrength) =>
	MATCH_STRENGTHS.indexOf(strength) <= MATCH_STRENGTHS.indexOf(min);

/** Scores every candidate, keeps the top_n per lost report above the threshold (as matchReport does), counts. */
export function evaluate(prep: Prepared, variant: Variant): Metrics {
	const kept = new Map<string, { positive: boolean; hard: boolean; score: number; strength: MatchStrength }[]>();
	for (const c of prep.candidates) {
		const v = variant.visual;
		const visual =
			v && c.best
				? {
						V: visualSimilarity(c.best.cos, v.floor, v.ceiling),
						lost_photo_id: c.best.lost_photo_id,
						other_photo_id: c.best.other_photo_id,
					}
				: null;
		const result = scoreMatch(
			{ ...c.features, visual },
			{ distance_scale_km: BASE.distance_scale_km, weights: BASE.weights, weights_visual: v?.weights }
		);
		if (!result || result.score < BASE.threshold) continue;
		let { strength } = result;
		// scoreMatch caps only without its geo-time fit; inside the looser one the uncapped strength applies.
		const loose = variant.loose;
		if (
			visual &&
			loose &&
			visual.V >= 0.8 &&
			c.features.distance_km < loose.km &&
			c.features.delta_hours < loose.hours
		)
			strength = strengthOf(result.score);
		const list = kept.get(c.lost) ?? [];
		list.push({ positive: c.positive, hard: c.hard, score: result.score, strength });
		kept.set(c.lost, list);
	}
	let hits = 0;
	let notified = 0;
	let notifiedPositives = 0;
	let hardNegativesNotified = 0;
	for (const list of kept.values()) {
		const top = list.sort((a, b) => b.score - a.score).slice(0, BASE.top_n);
		if (top.some((s) => s.positive)) hits++;
		for (const s of top.filter((s) => atLeast(s.strength, BASE.notify_min_strength))) {
			notified++;
			if (s.positive) notifiedPositives++;
			if (s.hard) hardNegativesNotified++;
		}
	}
	return {
		recall10: prep.lostWithPositive ? hits / prep.lostWithPositive : 0,
		precision: notified ? notifiedPositives / notified : 0,
		notified,
		notifiedPositives,
		hardNegativesNotified,
	};
}

/** The C8 rule: v3 ships only if it is not worse than v2 on recall@10 and on precision. */
export const notWorse = (v3: Metrics, v2: Metrics) => v3.recall10 >= v2.recall10 && v3.precision >= v2.precision;

export const V2: Variant = { name: 'v2', visual: null };
/** The values scoreMatch and C8 ship today (placeholders until a real-photo run picks them). */
export const SHIPPED: Variant = {
	name: 'v3 shipped',
	visual: { floor: 0.7, ceiling: 0.95, weights: VISUAL_WEIGHTS },
};

const round3 = (x: number) => Math.round(x * 1000) / 1000;
/** weights_visual with this visual weight; the other three keep VISUAL_WEIGHTS' proportions. */
function weightsFor(visual: number): VisualWeights {
	const k = (1 - visual) / (1 - VISUAL_WEIGHTS.visual);
	return {
		distance: round3(VISUAL_WEIGHTS.distance * k),
		time: round3(VISUAL_WEIGHTS.time * k),
		attributes: round3(VISUAL_WEIGHTS.attributes * k),
		visual,
	};
}

/**
 * Grid over visual_floor 0.30…0.85, visual_ceiling floor+0.05…1.00 (steps of 0.05) and a visual weight of 0.2, 0.3 or
 * 0.4. The band cut-offs stay at V 0.8 / 0.5 / 0.25 (scoreMatch's veto lift and evidence rule use the same values), so
 * floor and ceiling place them in cosine. Of the configurations not worse than v2, the best has the highest recall@10,
 * then precision, then notified positives (the first in grid order on a tie); null when none qualifies.
 */
export function sweep(prep: Prepared, v2: Metrics): { variant: Variant; metrics: Metrics } | null {
	let best: { variant: Variant; metrics: Metrics } | null = null;
	for (let f = 30; f <= 85; f += 5)
		for (let c = f + 5; c <= 100; c += 5)
			for (const w of [0.2, 0.3, 0.4]) {
				const variant = {
					name: 'v3 best',
					visual: { floor: f / 100, ceiling: c / 100, weights: weightsFor(w) },
				};
				const m = evaluate(prep, variant);
				if (!notWorse(m, v2)) continue;
				const b = best?.metrics;
				const better =
					!b ||
					m.recall10 > b.recall10 ||
					(m.recall10 === b.recall10 &&
						(m.precision > b.precision ||
							(m.precision === b.precision && m.notifiedPositives > b.notifiedPositives)));
				if (better) best = { variant, metrics: m };
			}
	return best;
}

/** Looser geo-time fits for V ≥ 0.8 to compare with scoreMatch's (TASK-43.1 review: set the cap from the data). */
export const LOOSE_FITS: LooseFit[] = [
	{ name: '< 10 km, < 72 h', km: 10, hours: 72 },
	{ name: '< 3 km, any time', km: 3, hours: Infinity },
	{ name: '< 10 km, any time', km: 10, hours: Infinity },
	{ name: 'no cap', km: Infinity, hours: Infinity },
];

const pct = (x: number) => x.toFixed(3);
const describe = (v: Variant) =>
	v.visual
		? `floor ${v.visual.floor}, ceiling ${v.visual.ceiling}, weights ${JSON.stringify(v.visual.weights)}`
		: 'no visual term';
const row = (name: string, m: Metrics, config: string) =>
	`| ${name} | ${pct(m.recall10)} | ${pct(m.precision)} | ${m.notifiedPositives}/${m.notified} | ${m.hardNegativesNotified} | ${config} |`;

/** A Markdown report of one set: v2, shipped v3, the sweep's best and the geo-time fits; `pass` is the shipped gate. */
export function run(name: string, prep: Prepared): { pass: boolean; text: string } {
	const v2 = evaluate(prep, V2);
	const shipped = evaluate(prep, SHIPPED);
	const best = sweep(prep, v2);
	const lines = [
		`## ${name}`,
		'',
		`${prep.candidates.length} candidate pairs, ${prep.lostWithPositive} lost reports with their animal in the set; labelled: ${prep.positives} positives, ${prep.hardNegatives} hard negatives.`,
		'',
		`| variant | recall@10 | precision@${BASE.notify_min_strength} | notified pos/all | hard neg notified | config |`,
		'|---|---|---|---|---|---|',
		row('v2', v2, describe(V2)),
		row('v3 shipped', shipped, describe(SHIPPED)),
	];
	if (best) {
		const { floor, ceiling } = best.variant.visual!;
		const cut = (V: number) => round3(floor + V * (ceiling - floor));
		lines.push(row('v3 best', best.metrics, describe(best.variant)));
		lines.push(
			'',
			`Best config's band cut-offs in cosine: very_similar ≥ ${cut(0.8)}, similar ≥ ${cut(0.5)}, some ≥ ${cut(0.25)}.`
		);
		lines.push('', 'Geo-time fit for V ≥ 0.8 on the best config (recall@10 does not change):', '');
		lines.push('| fit | precision | notified pos/all | hard neg notified |', '|---|---|---|---|');
		lines.push(
			`| shipped (< 3 km, < 72 h) | ${pct(best.metrics.precision)} | ${best.metrics.notifiedPositives}/${best.metrics.notified} | ${best.metrics.hardNegativesNotified} |`
		);
		for (const loose of LOOSE_FITS) {
			const m = evaluate(prep, { ...best.variant, loose });
			lines.push(
				`| ${loose.name} | ${pct(m.precision)} | ${m.notifiedPositives}/${m.notified} | ${m.hardNegativesNotified} |`
			);
		}
	} else lines.push('', 'No swept configuration is not worse than v2.');
	const pass = notWorse(shipped, v2);
	lines.push('', `Gate (shipped v3 not worse than v2 on recall@10 and precision): ${pass ? 'PASS' : 'FAIL'}`, '');
	return { pass, text: lines.join('\n') };
}
