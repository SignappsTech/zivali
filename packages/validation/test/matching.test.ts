import { describe, expect, it } from 'vitest';

import type { MatchStrength } from '@zivali/types';

import {
	distanceBand,
	hoursBand,
	MATCH_ALGO_VERSION,
	scoreMatch,
	VISUAL_WEIGHTS,
	visualBand,
	visualSimilarity,
	type MatchAttributes,
	type MatchFeatures,
	type MatchScoreConfig,
} from '../src/matching.ts';

const config = { distance_scale_km: 3, weights: { distance: 0.4, time: 0.2, attributes: 0.4 } };
/** The engine's config once matching.weights_visual exists (TASK-43.2): ignored without a visual term. */
const v3 = { ...config, weights_visual: VISUAL_WEIGHTS };
const unknown: MatchAttributes = { size: null, sex: null, colours: [], pattern: null };
const same: MatchAttributes = { size: 'm', sex: 'female', colours: ['black', 'white'], pattern: 'bicolour' };
// Every v2 test below runs with visual null: the fallback must score exactly as v2 did.
const features = (overrides: Partial<MatchFeatures> = {}): MatchFeatures => ({
	chip_match: false,
	other_type: 'found',
	distance_km: 0,
	delta_hours: 0,
	lost: same,
	other: same,
	visual: null,
	...overrides,
});
const photos = {
	lost_photo_id: '0b6f7c1e-2a4b-4d6f-8a8b-9c0d1e2f3a4b',
	other_photo_id: '7c1e2a4b-5d6f-4a8b-9c0d-1e2f3a4b5c6d',
};
const seen = (V: number) => ({ V, ...photos });
/** A pair that must be suggested. */
const scored = (overrides: Partial<MatchFeatures> = {}, settings: MatchScoreConfig = config) => {
	const result = scoreMatch(features(overrides), settings);
	expect(result).not.toBeNull();
	return result!;
};

describe('scoreMatch (C8 §Score)', () => {
	it('scores equal chips 1.000 and strong whatever the other features say', () => {
		const result = scored({
			chip_match: true,
			distance_km: 25,
			delta_hours: 700,
			other: { ...unknown, sex: 'male' },
		});
		expect(result).toMatchObject({ score: 1, strength: 'strong' });
		expect(result.reasons[0]).toEqual({ code: 'chip' });
	});

	it('gives a chip on a sighting the chip_sighting reason instead of chip', () => {
		const { reasons } = scored({ chip_match: true, other_type: 'sighted' });
		expect(reasons.map((reason) => reason.code)).toContain('chip_sighting');
		expect(reasons.map((reason) => reason.code)).not.toContain('chip');
	});

	it('scores identical attributes at the same place and time 1.000 without a chip reason', () => {
		const result = scored();
		expect(result).toMatchObject({ score: 1, strength: 'strong' });
		expect(result.reasons).toEqual([
			{ code: 'distance', band: 'lt1' },
			{ code: 'time', hours_band: 'lt24' },
			{ code: 'size', match: 'equal' },
			{ code: 'colour', overlap: 1 },
			{ code: 'sex', match: 'equal' },
			{ code: 'pattern', match: 'equal' },
		]);
	});

	it('applies distance decay, time proximity and attribute overlap with the weights', () => {
		// D = e^(−2/3) = 0.5134, T = 1 − 12/720 = 0.9833, A = (1 + 0.5) / 4 = 0.375 (sex and pattern not known on both)
		const result = scored({
			distance_km: 2,
			delta_hours: 12,
			lost: { size: 'm', sex: 'unknown', colours: ['black', 'white'], pattern: null },
			other: { size: 'm', sex: 'male', colours: ['black'], pattern: 'solid' },
		});
		expect(result.score).toBe(0.552);
		expect(result.strength).toBe('possible');
		expect(result.reasons).toEqual([
			{ code: 'distance', band: '1to3' },
			{ code: 'time', hours_band: 'lt24' },
			{ code: 'size', match: 'equal' },
			{ code: 'colour', overlap: 0.5 },
		]);
	});

	it('adds nothing for unknown attributes and 0.5 for an adjacent size', () => {
		// Size and colour known on both sides: A = 2/4 → 0.4 + 0.2 + 0.2
		const partial: MatchAttributes = { ...unknown, size: 'm', colours: ['black', 'white'] };
		expect(scored({ lost: partial, other: same }).score).toBe(0.8);
		// A = 0.5/4 → 0.4 + 0.2 + 0.05
		const adjacent = scored({ lost: { ...unknown, size: 's' }, other: { ...unknown, size: 'm' } });
		expect(adjacent.score).toBe(0.65);
		expect(adjacent.reasons).toContainEqual({ code: 'size', match: 'adjacent' });
		// A different pattern is no veto, it only adds nothing: A = 3/4
		expect(scored({ other: { ...same, pattern: 'solid' } }).score).toBe(0.9);
	});

	it('caps time at 30 days and treats a sighting before the loss as no gap', () => {
		expect(scored({ delta_hours: -6 }).score).toBe(1);
		expect(scored({ delta_hours: 24 * 30 }).score).toBe(0.8);
		expect(scored({ delta_hours: 24 * 45 }).score).toBe(0.8);
	});

	it('uses the configured weights and distance scale', () => {
		const result = scored(
			{ distance_km: 3 },
			{ distance_scale_km: 1, weights: { distance: 1, time: 0, attributes: 0 } }
		);
		expect(result.score).toBe(0.05);
		expect(result.strength).toBe('possible');
	});

	it('marks ≥ 0.8 strong, ≥ 0.65 good, else possible', () => {
		const strength = (distance_km: number) => scored({ distance_km }).strength;
		// score = 0.6 + 0.4·e^(−km/3): 0.8 at km = 3·ln 2, 0.65 at km = 3·ln 8
		expect(strength(2)).toBe('strong');
		expect(strength(2.1)).toBe('good');
		expect(strength(6.2)).toBe('good');
		expect(strength(6.3)).toBe('possible');
	});

	it('never puts exact distances or times into the reasons', () => {
		const { reasons } = scored({ distance_km: 4.237, delta_hours: 51.5 });
		const json = JSON.stringify(reasons);
		expect(json).not.toContain('4.237');
		expect(json).not.toContain('51.5');
		expect(reasons).toContainEqual({ code: 'distance', band: '3to10' });
		expect(reasons).toContainEqual({ code: 'time', hours_band: '24to72' });
	});
});

describe('evidence rule and contradiction veto (TASK-114.22)', () => {
	// The owner's screenshot: a lost grey large male cat and a sighted cat about 4 km away the same day with no photo,
	// size, colour or sex. Before, every unknown counted 0.5: 0.4·0.26 + 0.2·1 + 0.4·0.5 ≈ 0.51, a "possible" match.
	it('suggests nothing when no attribute is known on both sides and there is no chip (AC#1)', () => {
		const lost: MatchAttributes = { size: 'l', sex: 'male', colours: ['grey'], pattern: null };
		expect(
			scoreMatch(
				features({ other_type: 'sighted', distance_km: 4, delta_hours: 3, lost, other: unknown }),
				config
			)
		).toBeNull();
		// Distance and time at their best do not make a match on their own either.
		expect(scoreMatch(features({ lost: unknown, other: same }), config)).toBeNull();
		expect(scoreMatch(features({ lost: unknown, other: unknown }), config)).toBeNull();
	});

	it('needs one attribute known on both sides that agrees', () => {
		const only = (attributes: Partial<MatchAttributes>) => ({ ...unknown, ...attributes });
		// Only the pattern is known on both sides, and it differs: no evidence.
		expect(
			scoreMatch(features({ lost: only({ pattern: 'solid' }), other: only({ pattern: 'tabby' }) }), config)
		).toBeNull();
		for (const agreeing of [
			{ pattern: 'solid' as const },
			{ colours: ['grey' as const] },
			{ sex: 'male' as const },
			{ size: 'm' as const },
		]) {
			expect(scoreMatch(features({ lost: only(agreeing), other: only(agreeing) }), config)).not.toBeNull();
		}
		expect(scoreMatch(features({ lost: only({ size: 'm' }), other: only({ size: 'l' }) }), config)).not.toBeNull();
	});

	it('vetoes a known contradiction without a chip, whatever else agrees (AC#2)', () => {
		expect(scoreMatch(features({ other: { ...same, sex: 'male' } }), config)).toBeNull();
		expect(scoreMatch(features({ other: { ...same, size: 'xl' } }), config)).toBeNull();
		expect(scoreMatch(features({ other: { ...same, size: 'xs' } }), config)).toBeNull();
		expect(scoreMatch(features({ other: { ...same, colours: ['golden', 'tan'] } }), config)).toBeNull();
	});

	it('always matches a chip, through contradictions and with nothing known (AC#2)', () => {
		const contradicting: MatchAttributes = { size: 'xl', sex: 'male', colours: ['golden'], pattern: 'solid' };
		for (const other of [contradicting, unknown]) {
			expect(scored({ chip_match: true, distance_km: 120, other })).toMatchObject({
				score: 1,
				strength: 'strong',
			});
		}
	});

	// C8 §Score examples (6 h apart): the realistic pairs the threshold (0.5) and the bands were checked on.
	const colour: MatchAttributes = { ...unknown, colours: ['black', 'white'] };
	type Example = [string, number, MatchAttributes, boolean, number | null, MatchStrength | null];
	it.each<Example>([
		['the same colour 2 km away', 2, colour, false, 0.504, 'possible'],
		['the same colour and size 3 km away', 3, { ...colour, size: 'm' }, false, 0.545, 'possible'],
		['all four the same 1 km away', 1, same, false, 0.885, 'strong'],
		['the same colour 3 km away', 3, colour, false, null, null],
		['another colour 1 km away', 1, { ...same, colours: ['golden'] }, false, null, null],
		['nothing known 4 km away', 4, unknown, false, null, null],
		['the chip 25 km away, nothing known', 25, unknown, true, 1, 'strong'],
	])('%s', (_name, distance_km, other, chip_match, score, strength) => {
		const result = scoreMatch(features({ distance_km, delta_hours: 6, other, chip_match }), config);
		// Below the 0.5 threshold, or no suggestion at all.
		if (score === null) expect(result === null || result.score < 0.5).toBe(true);
		else expect(result).toMatchObject({ score, strength });
	});
});

describe('scoreMatch v3: visual similarity (C8 §Visual similarity, TASK-43.1)', () => {
	it('stamps every score v3', () => {
		expect(MATCH_ALGO_VERSION).toBe('v3');
	});

	it('scores exactly as v2 when visual is null or left out, whatever weights_visual says (AC#1)', () => {
		const cases: Partial<MatchFeatures>[] = [
			{},
			{ distance_km: 2, delta_hours: 12, other: { ...same, colours: ['black'], pattern: 'solid' } },
			{ distance_km: 4, delta_hours: 100, lost: { ...unknown, colours: ['black'] } },
			{ other: { ...same, sex: 'male' } },
			{ other: { ...same, colours: ['golden'] } },
			{ lost: unknown },
			{ chip_match: true, other_type: 'sighted', distance_km: 25, other: unknown },
		];
		for (const overrides of cases) {
			const v2 = scoreMatch(features(overrides), config);
			const { visual: _, ...leftOut } = features(overrides);
			expect(scoreMatch(features(overrides), v3)).toEqual(v2);
			expect(scoreMatch(leftOut, v3)).toEqual(v2);
			// A V that is no number (visualSimilarity with the ceiling not above the floor) falls back too, never lifting a veto.
			expect(scoreMatch(features({ ...overrides, visual: seen(Number.NaN) }), v3)).toEqual(v2);
			for (const [floor, ceiling] of [
				[0.7, 0.7],
				[0.95, 0.7],
			] as const) {
				const V = visualSimilarity(0.99, floor, ceiling);
				expect(scoreMatch(features({ ...overrides, visual: seen(V) }), v3)).toEqual(v2);
			}
		}
	});

	it('clamps V into 0…1, so a score stays within 0…1', () => {
		expect(scored({ visual: seen(1.5) }, v3)).toEqual(scored({ visual: seen(1) }, v3));
		expect(scored({ visual: seen(1.5) }, v3).score).toBe(1);
		expect(scored({ visual: seen(-0.5) }, v3)).toEqual(scored({ visual: seen(0) }, v3));
	});

	it('blends V with matching.weights_visual, the C8 start values when the config has none (AC#2)', () => {
		// D = e^(−2/3) = 0.5134, T = 1 − 12/720 = 0.9833, A = 1, V = 0.6: 0.3·D + 0.15·T + 0.25·A + 0.3·V
		const near = { distance_km: 2, delta_hours: 12, visual: seen(0.6) };
		expect(scored(near, v3)).toMatchObject({ score: 0.732, strength: 'good' });
		expect(scoreMatch(features(near), config)).toEqual(scoreMatch(features(near), v3));
		const onlyVisual = { ...config, weights_visual: { distance: 0, time: 0, attributes: 0, visual: 1 } };
		expect(scored({ visual: seen(0.55) }, onlyVisual).score).toBe(0.55);
	});

	it('takes V ≥ 0.5 as evidence when no attribute known on both sides agrees (AC#2)', () => {
		const pattern = { lost: { ...unknown, pattern: 'solid' }, other: { ...unknown, pattern: 'tabby' } } as const;
		for (const pair of [{ lost: unknown, other: unknown }, pattern]) {
			expect(scoreMatch(features({ ...pair, visual: seen(0.49) }), v3)).toBeNull();
			// 0.3 + 0.15 + 0.3·0.5
			expect(scored({ ...pair, visual: seen(0.5) }, v3)).toMatchObject({ score: 0.6, strength: 'possible' });
		}
	});

	it('always vetoes another known sex; lifts the size and colour vetoes at V ≥ 0.8 (AC#2)', () => {
		for (const V of [0.5, 0.8, 1])
			expect(scoreMatch(features({ other: { ...same, sex: 'male' }, visual: seen(V) }), v3)).toBeNull();
		for (const other of [
			{ ...same, size: 'xl' as const },
			{ ...same, colours: ['golden' as const] },
		]) {
			expect(scoreMatch(features({ other, visual: seen(0.79) }), v3)).toBeNull();
			// A = 3/4: 0.3 + 0.15 + 0.1875 + 0.24
			expect(scored({ other, visual: seen(0.8) }, v3)).toMatchObject({ score: 0.878, strength: 'strong' });
		}
	});

	it('keeps visual-only and lifted-veto pairs possible without a geo-time fit (AC#2)', () => {
		const lifted = { other: { ...same, colours: ['golden' as const] }, visual: seen(1) };
		// Under 3 km and 72 h: no cap (0.3·e^(−2.99/3) + 0.15 + 0.1875 + 0.3 = 0.748).
		expect(scored({ ...lifted, distance_km: 2.99 }, v3).strength).toBe('good');
		expect(scored({ ...lifted, distance_km: 3 }, v3)).toMatchObject({ score: 0.748, strength: 'possible' });
		const visualOnly = { lost: unknown, other: unknown, visual: seen(1) };
		// 0.3 + 0.15·(1 − 71.9/720) + 0.3 = 0.735
		expect(scored({ ...visualOnly, delta_hours: 71.9 }, v3).strength).toBe('good');
		expect(scored({ ...visualOnly, delta_hours: 72 }, v3)).toMatchObject({ score: 0.735, strength: 'possible' });
	});

	it('never lets V raise a described pair above its v2 strength without a geo-time fit (CHANGE C8)', () => {
		// All four agree, 3 km, 6 h: v3 0.809 would be strong, v2 gives 0.745 good.
		expect(scored({ distance_km: 3, delta_hours: 6, visual: seen(1) }, v3)).toMatchObject({
			score: 0.809,
			strength: 'good',
		});
		// Far apart V cannot lower it below v2 by the cap either: the blend alone sets it (5 km: 0.755 good, v2 0.674 good).
		expect(scored({ distance_km: 5, delta_hours: 6, visual: seen(1) }, v3).strength).toBe('good');
	});

	it('scores a chip 1.000 strong whatever V says, with the visual reason when V has a band (AC#2)', () => {
		const chip = { chip_match: true, distance_km: 25, delta_hours: 200, other: { ...same, sex: 'male' as const } };
		expect(scored({ ...chip, visual: seen(0) }, v3)).toMatchObject({ score: 1, strength: 'strong' });
		expect(scored({ ...chip, visual: seen(0) }, v3).reasons.map((reason) => reason.code)).not.toContain('visual');
		expect(scored({ ...chip, visual: seen(0.6) }, v3).reasons).toContainEqual({
			code: 'visual',
			band: 'similar',
			...photos,
		});
	});

	it('gives the visual reason its band and both photo ids, none below 0.25 (AC#3)', () => {
		const visualReason = (V: number) => scored({ visual: seen(V) }, v3).reasons.find((r) => r.code === 'visual');
		expect(visualReason(0.95)).toEqual({ code: 'visual', band: 'very_similar', ...photos });
		expect(visualReason(0.5)).toEqual({ code: 'visual', band: 'similar', ...photos });
		expect(visualReason(0.25)).toEqual({ code: 'visual', band: 'some', ...photos });
		expect(visualReason(0.24)).toBeUndefined();
		// Attribute reasons stay as in v2, the visual one comes last.
		expect(scored({ visual: seen(1) }, v3).reasons.map((reason) => reason.code)).toEqual([
			'distance',
			'time',
			'size',
			'colour',
			'sex',
			'pattern',
			'visual',
		]);
	});
});

// v3 fixture pairs (AC#3), labelled by hand with the strength the C8 placeholders must give (threshold 0.5, the engine
// drops a score below it): a lost black cat against found reports. Scores in the comments: 0.3·exp(−km/3) +
// 0.15·(1 − Δh/720) + 0.25·A + 0.3·V. Change the weights, rerun, relabel (TASK-43.3 sets the real ones).
describe('v3 fixture pairs (C8 placeholders)', () => {
	const BLACK_CAT: MatchAttributes = { size: 'm', sex: 'female', colours: ['black'], pattern: 'solid' };
	const BLACK_ONLY: MatchAttributes = { ...unknown, colours: ['black'] };
	const GREY_CAT: MatchAttributes = { ...BLACK_CAT, colours: ['grey'] };
	const DAY = 24;
	/** [name, km, Δh, other, V, chip, expected strength or null (no suggestion or below the threshold)] */
	type Pair = [string, number, number, MatchAttributes, number, boolean, MatchStrength | null];
	const label = ([, km, hours, other, V, chip_match]: Pair) => {
		const result = scoreMatch(
			features({ distance_km: km, delta_hours: hours, lost: BLACK_CAT, other, visual: seen(V), chip_match }),
			v3
		);
		return result && result.score >= 0.5 ? result.strength : null;
	};
	// The same cat, from other photos.
	const SAME_ANIMAL: Pair[] = [
		['very similar, 0.5 km, 6 h', 0.5, 6, BLACK_CAT, 0.9, false, 'strong'], // 0.923
		['similar, 2 km, 1 day', 2, DAY, BLACK_CAT, 0.6, false, 'good'], // 0.729
		['some, 3 km, 6 h (v2 good)', 3, 6, BLACK_CAT, 0.3, false, 'possible'], // 0.599
		['photos differ, 1 km, 6 h (v2 strong)', 1, 6, BLACK_CAT, 0.1, false, 'possible'], // 0.644
		['finder gives only the colour, similar, 1 km', 1, 6, BLACK_ONLY, 0.7, false, 'possible'], // 0.636
		['photo only, very similar, 0.5 km, 6 h', 0.5, 6, unknown, 0.9, false, 'good'], // 0.673
		['photo only, identical, 2 km, 2 days', 2, 2 * DAY, unknown, 1, false, 'possible'], // 0.594
		['photo only, similar, 2 km', 2, 6, unknown, 0.6, false, null], // 0.483
		['photo only, below the evidence cut, 0.2 km', 0.2, 6, unknown, 0.45, false, null], // no evidence
		['says grey, very similar photos, 1 km', 1, 6, GREY_CAT, 0.9, false, 'strong'], // 0.821, veto lifted
		['says grey, similar photos, 1 km', 1, 6, GREY_CAT, 0.7, false, null], // veto kept
		['size two steps apart, very similar, 0.5 km', 0.5, 6, { ...BLACK_CAT, size: 'xs' }, 0.85, false, 'strong'], // 0.845
		['another sex, identical photos, 0.5 km', 0.5, 6, { ...BLACK_CAT, sex: 'male' }, 1, false, null], // sex veto
		['chip, photos differ, 25 km', 25, 6, BLACK_CAT, 0, true, 'strong'], // 1.000
		['chip, similar, 25 km, 5 days', 25, 5 * DAY, unknown, 0.6, true, 'strong'], // 1.000
	];
	// Another black cat whose photos look alike, far apart (3 km or more) or days apart (72 h or more).
	const LOOKALIKES: Pair[] = [
		['colour only, 15 km', 15, 6, BLACK_ONLY, 0.95, false, null], // 0.498
		['colour only, 5 km', 5, 6, BLACK_ONLY, 0.95, false, 'possible'], // 0.553
		['colour only, 3 km', 3, 6, BLACK_ONLY, 1, false, 'possible'], // 0.622
		['colour only, 1 km, 4 days', 1, 4 * DAY, BLACK_ONLY, 1, false, 'possible'], // 0.707 capped (v2 0.560)
		['colour only, 0.5 km, 10 days', 0.5, 10 * DAY, BLACK_ONLY, 1, false, 'possible'], // 0.716 capped (v2 0.572)
		['all four the same, 15 km', 15, 6, BLACK_CAT, 0.95, false, 'possible'], // 0.686 capped (v2 0.601)
		['photo only, 8 km', 8, 6, unknown, 1, false, null], // 0.470
		['photo only, 0.5 km, 4 days', 0.5, 4 * DAY, unknown, 1, false, 'possible'], // 0.684 capped
		['says grey, 2 km, 5 days', 2, 5 * DAY, GREY_CAT, 0.9, false, 'possible'], // 0.737 capped, veto lifted
		['says grey, 12 km', 12, 6, GREY_CAT, 0.95, false, 'possible'], // 0.627, veto lifted
	];

	it('has at least 20 labelled pairs', () => {
		expect(SAME_ANIMAL.length + LOOKALIKES.length).toBeGreaterThanOrEqual(20);
	});

	it.each(SAME_ANIMAL)('same animal: %s', (...pair) => {
		expect(label(pair)).toBe(pair[6]);
	});

	it.each(LOOKALIKES)('look-alike: %s', (...pair) => {
		expect(label(pair)).toBe(pair[6]);
	});

	it('never brings a look-alike black cat far apart or days apart to good (AC#3)', () => {
		for (const pair of LOOKALIKES) {
			expect(pair[1] >= 3 || pair[2] >= 72, pair[0]).toBe(true);
			expect(['strong', 'good'], pair[0]).not.toContain(label(pair));
		}
	});
});

describe('bands', () => {
	it('maps kilometres to the C6 distance bands', () => {
		expect([0, 0.99, 1, 2.99, 3, 9.99, 10, 30].map(distanceBand)).toEqual([
			'lt1',
			'lt1',
			'1to3',
			'1to3',
			'3to10',
			'3to10',
			'gt10',
			'gt10',
		]);
	});

	it('maps hours to the glossary hour bands', () => {
		expect([-12, 23.9, 24, 71.9, 72, 720].map(hoursBand)).toEqual([
			'lt24',
			'lt24',
			'24to72',
			'24to72',
			'gt72',
			'gt72',
		]);
	});

	it('maps V to the visual bands, none below 0.25', () => {
		expect([1, 0.8, 0.79, 0.5, 0.49, 0.25, 0.24, 0].map(visualBand)).toEqual([
			'very_similar',
			'very_similar',
			'similar',
			'similar',
			'some',
			'some',
			null,
			null,
		]);
	});

	it('normalises a cosine between the floor and the ceiling to V, clamped to 0…1', () => {
		// C8 placeholders: floor 0.70, ceiling 0.95.
		expect([0.5, 0.7, 0.825, 0.95, 0.99].map((cos) => round3(visualSimilarity(cos, 0.7, 0.95)))).toEqual([
			0, 0, 0.5, 1, 1,
		]);
		// A ceiling that is not above the floor (equal or inverted config) gives no V at all.
		expect(visualSimilarity(0.99, 0.7, 0.7)).toBeNaN();
		expect(visualSimilarity(0.99, 0.95, 0.7)).toBeNaN();
	});
});

const round3 = (value: number) => Math.round(value * 1000) / 1000;
