import { describe, expect, test } from 'vitest';

import { containsContactData, normalisePlace, normalizeChip } from '../src/index.ts';

describe('normalizeChip (C4)', () => {
	test.each([
		['941000012345678', '941000012345678'],
		['941 0000 1234 5678', '941000012345678'],
		['941-000-012-345-678', '941000012345678'],
		['941.000.012.345.678', '941000012345678'],
		[' 941\t000 012–345 678 ', '941000012345678'],
		['123456789', '123456789'],
		['12345678901234', '12345678901234'],
	])('%j is valid', (input, chip) => {
		expect(normalizeChip(input)).toEqual({ chip, status: 'valid' });
	});

	test.each(['12345678', '1234567890123456', '9410000ABC45678', 'abc', '941/000/012/345/678'])(
		'%j is invalid and kept as null',
		(input) => {
			expect(normalizeChip(input)).toEqual({ chip: null, status: 'invalid' });
		}
	);

	test.each([undefined, null, '', '  ', ' - . '])('%j is none', (input) => {
		expect(normalizeChip(input)).toEqual({ chip: null, status: 'none' });
	});
});

describe('containsContactData (C4 reward note)', () => {
	test.each([
		'Pišite na https://example.si',
		'glej www.najdi-psa.com',
		'bit.ly/abc',
		'ana.novak@gmail.com',
		'kličite 041123456',
		'kličite 041 123 456',
		'+386 41 123-456',
		'IBAN SI56 1910 0000 0123 438',
		'4111 1111 1111 1111',
	])('%j contains contact data', (text) => {
		expect(containsContactData(text)).toBe(true);
	});

	test.each([
		'Nagrada za najditelja',
		'500 € za informacije',
		'10 000 € nagrade',
		'Velja do 15.10.2026',
		'Hvala vsem. Lep pozdrav',
		'Pes je star 12 let',
	])('%j is clean', (text) => {
		expect(containsContactData(text)).toBe(false);
	});
});

describe('normalisePlace (C6)', () => {
	test('folds diacritics, case and punctuation', () => {
		expect(normalisePlace('Šentvid')).toBe('sentvid');
		expect(normalisePlace('SENTVID')).toBe('sentvid');
		expect(normalisePlace('  Cankarjeva ulica 5a, Kranj ')).toBe('cankarjeva ulica 5a kranj');
		expect(normalisePlace('Ivančna Gorica')).toBe('ivancna gorica');
		expect(normalisePlace('Lendava/Lendva')).toBe('lendava lendva');
	});
});
