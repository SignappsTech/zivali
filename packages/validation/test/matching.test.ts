import { describe, expect, it } from 'vitest';

import type { MatchStrength } from '@zivali/types';

import {
	distanceBand,
	hoursBand,
	scoreMatch,
	type MatchAttributes,
	type MatchFeatures,
	type MatchScoreConfig,
} from '../src/matching.ts';

const config = { distance_scale_km: 3, weights: { distance: 0.4, time: 0.2, attributes: 0.4 } };
const unknown: MatchAttributes = { size: null, sex: null, colours: [], pattern: null };
const same: MatchAttributes = { size: 'm', sex: 'female', colours: ['black', 'white'], pattern: 'bicolour' };
const features = (overrides: Partial<MatchFeatures> = {}): MatchFeatures => ({
	chip_match: false,
	other_type: 'found',
	distance_km: 0,
	delta_hours: 0,
	lost: same,
	other: same,
	...overrides,
});
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
});
