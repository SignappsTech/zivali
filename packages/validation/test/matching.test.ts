import { describe, expect, it } from 'vitest';

import { distanceBand, hoursBand, scoreMatch, type MatchAttributes, type MatchFeatures } from '../src/matching.ts';

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

describe('scoreMatch (C8 §Score)', () => {
	it('scores equal chips 1.000 and strong whatever the other features say', () => {
		const result = scoreMatch(
			features({ chip_match: true, distance_km: 25, delta_hours: 700, other: { ...unknown, sex: 'male' } }),
			config
		);
		expect(result).toMatchObject({ score: 1, strength: 'strong' });
		expect(result.reasons[0]).toEqual({ code: 'chip' });
	});

	it('gives a chip on a sighting the chip_sighting reason instead of chip', () => {
		const { reasons } = scoreMatch(features({ chip_match: true, other_type: 'sighted' }), config);
		expect(reasons.map((reason) => reason.code)).toContain('chip_sighting');
		expect(reasons.map((reason) => reason.code)).not.toContain('chip');
	});

	it('scores identical attributes at the same place and time 1.000 without a chip reason', () => {
		const result = scoreMatch(features(), config);
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
		// D = e^(−2/3) = 0.5134, T = 1 − 12/720 = 0.9833, A = (1 + 0.5 + 0.5 + 0.5) / 4 = 0.625
		const result = scoreMatch(
			features({
				distance_km: 2,
				delta_hours: 12,
				lost: { size: 'm', sex: 'unknown', colours: ['black', 'white'], pattern: null },
				other: { size: 'm', sex: 'male', colours: ['black'], pattern: 'solid' },
			}),
			config
		);
		expect(result.score).toBe(0.652);
		expect(result.strength).toBe('good');
		expect(result.reasons).toEqual([
			{ code: 'distance', band: '1to3' },
			{ code: 'time', hours_band: 'lt24' },
			{ code: 'size', match: 'equal' },
			{ code: 'colour', overlap: 0.5 },
		]);
	});

	it('counts unknown attributes 0.5 and an adjacent size 0.5', () => {
		// A = 0.5 → 0.4 + 0.2 + 0.2
		expect(scoreMatch(features({ lost: unknown, other: same }), config).score).toBe(0.8);
		const adjacent = scoreMatch(
			features({ lost: { ...unknown, size: 's' }, other: { ...unknown, size: 'm' } }),
			config
		);
		expect(adjacent.score).toBe(0.8);
		expect(adjacent.reasons).toContainEqual({ code: 'size', match: 'adjacent' });
		const far = scoreMatch(
			features({ lost: { ...unknown, size: 'xs' }, other: { ...unknown, size: 'l' } }),
			config
		);
		expect(far.score).toBe(0.75);
		expect(far.reasons.map((reason) => reason.code)).not.toContain('size');
	});

	it('caps time at 30 days and treats a sighting before the loss as no gap', () => {
		expect(scoreMatch(features({ delta_hours: -6 }), config).score).toBe(1);
		expect(scoreMatch(features({ delta_hours: 24 * 30 }), config).score).toBe(0.8);
		expect(scoreMatch(features({ delta_hours: 24 * 45 }), config).score).toBe(0.8);
	});

	it('uses the configured weights and distance scale', () => {
		const result = scoreMatch(features({ distance_km: 3 }), {
			distance_scale_km: 1,
			weights: { distance: 1, time: 0, attributes: 0 },
		});
		expect(result.score).toBe(0.05);
		expect(result.strength).toBe('possible');
	});

	it('marks ≥ 0.8 strong, ≥ 0.65 good, else possible', () => {
		const strength = (distance_km: number) => scoreMatch(features({ distance_km }), config).strength;
		// score = 0.6 + 0.4·e^(−km/3): 0.8 at km = 3·ln 2, 0.65 at km = 3·ln 8
		expect(strength(2)).toBe('strong');
		expect(strength(2.1)).toBe('good');
		expect(strength(6.2)).toBe('good');
		expect(strength(6.3)).toBe('possible');
	});

	it('never puts exact distances or times into the reasons', () => {
		const { reasons } = scoreMatch(features({ distance_km: 4.237, delta_hours: 51.5 }), config);
		const json = JSON.stringify(reasons);
		expect(json).not.toContain('4.237');
		expect(json).not.toContain('51.5');
		expect(reasons).toContainEqual({ code: 'distance', band: '3to10' });
		expect(reasons).toContainEqual({ code: 'time', hours_band: '24to72' });
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
