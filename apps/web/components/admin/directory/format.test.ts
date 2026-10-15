import { describe, expect, it } from 'vitest';

import { diffRows, formatDays, formatTime, isStale, parseTime, toE164, todayIso } from './format';

describe('directory format helpers', () => {
	it('marks entries checked more than 12 months ago as stale', () => {
		expect(isStale('2025-10-14', '2026-10-15')).toBe(true);
		expect(isStale('2025-10-15', '2026-10-15')).toBe(false);
		expect(isStale('2026-06-02', '2026-10-15')).toBe(false);
	});

	it("uses Ljubljana's date", () => {
		expect(todayIso(new Date('2026-10-14T22:30:00Z'))).toBe('2026-10-15');
	});

	it('normalises Slovenian phone numbers to E.164 and rejects the rest', () => {
		expect(toE164('01 234 56 78')).toBe('+38612345678');
		expect(toE164('+386 1 234 56 78')).toBe('+38612345678');
		expect(toE164('00386 41 123 456')).toBe('+38641123456');
		expect(toE164('+386 (0)41 123-456')).toBe('+38641123456');
		expect(toE164('07 305 62')).toBeNull();
		expect(toE164('1 234 56 78')).toBeNull();
		expect(toE164('+44 20 7946 0958')).toBeNull();
	});

	it('formats and parses times: SL 8.00, EN 08:00', () => {
		expect(formatTime('08:00', 'sl')).toBe('8.00');
		expect(formatTime('15:30', 'sl')).toBe('15.30');
		expect(formatTime('08:00', 'en')).toBe('08:00');
		expect(parseTime('8.00')).toBe('08:00');
		expect(parseTime('8')).toBe('08:00');
		expect(parseTime(' 16:30 ')).toBe('16:30');
		expect(parseTime('24.00')).toBeNull();
		expect(parseTime('8.5')).toBeNull();
	});

	it('labels any stored days value', () => {
		const label = (day: string) => ({ mon: 'pon', tue: 'tor', thu: 'čet', fri: 'pet', sat: 'sob' })[day] ?? day;
		expect(formatDays('mon-fri', label)).toBe('pon–pet');
		expect(formatDays('tue,thu-sat', label)).toBe('tor, čet–sob');
	});

	it('diffs scalar fields and opening hours per days value', () => {
		const rows = diffRows(
			{
				phone_display: '01 234 56 70',
				email: null,
				source: 'Klic',
				opening_hours: [
					{ days: 'mon-fri', from: '08:00', to: '15:00' },
					{ days: 'sat', from: '', to: '', closed: true },
				],
			},
			{
				phone_display: '01 234 56 78',
				email: 'info@lipa.example',
				source: 'Klic',
				opening_hours: [
					{ days: 'mon-fri', from: '08:00', to: '16:00' },
					{ days: 'sat', from: '09:00', to: '12:00' },
				],
			},
			(_field, raw) => raw,
			(row) => (row.closed ? 'Zaprto' : `${row.from}–${row.to}`)
		);
		expect(rows).toEqual([
			{ field: 'phone_display', before: '01 234 56 70', after: '01 234 56 78' },
			{ field: 'email', before: null, after: 'info@lipa.example' },
			{ field: 'opening_hours', days: 'mon-fri', before: '08:00–15:00', after: '08:00–16:00' },
			{ field: 'opening_hours', days: 'sat', before: 'Zaprto', after: '09:00–12:00' },
		]);
	});
});
