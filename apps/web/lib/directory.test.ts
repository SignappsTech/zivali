// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { e164, formatDays, formatTime, isStale, openingHoursSpecification } from './directory';

describe('directory helpers', () => {
	it.each([
		['01 234 56 78', '+38612345678'],
		['05 66 33 766', '+38656633766'],
		['041 123 456', '+38641123456'],
		['+386 1 256 02 79', '+38612560279'],
		['00386 1 256 02 79', '+38612560279'],
	])('e164(%s) is %s', (display, expected) => {
		expect(e164(display)).toBe(expected);
	});

	it('names day lists and ranges with an en dash', () => {
		const sl = { mon: 'pon', tue: 'tor', wed: 'sre', thu: 'čet', fri: 'pet', sat: 'sob', sun: 'ned' } as const;
		expect(formatDays('mon-fri', (d) => sl[d])).toBe('pon–pet');
		expect(formatDays('tue,thu-sat', (d) => sl[d])).toBe('tor, čet–sob');
		expect(formatDays('hol', (d) => sl[d])).toBe('hol');
	});

	it('writes times as SL 8.00 and EN 8:00', () => {
		expect(formatTime('08:00', 'sl')).toBe('8.00');
		expect(formatTime('16:30', 'sl')).toBe('16.30');
		expect(formatTime('08:00', 'en')).toBe('8:00');
	});

	it('maps hours to schema.org and leaves out round-the-clock report lines', () => {
		expect(
			openingHoursSpecification([
				{ days: 'mon,wed-fri', from: '08:00', to: '14:00' },
				{ days: 'mon-sun', from: '00:00', to: '23:59', note_sl: 'Prijave 24 ur' },
			])
		).toEqual([
			{
				'@type': 'OpeningHoursSpecification',
				dayOfWeek: ['Monday', 'Wednesday', 'Thursday', 'Friday'].map((d) => `https://schema.org/${d}`),
				opens: '08:00',
				closes: '14:00',
			},
		]);
	});

	it('calls data stale after 12 months', () => {
		const now = new Date('2026-10-15T10:00:00Z');
		expect(isStale('2025-10-16', now)).toBe(false);
		expect(isStale('2025-08-03', now)).toBe(true);
	});
});
