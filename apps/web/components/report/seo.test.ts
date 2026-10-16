import { describe, expect, it } from 'vitest';

import { listOf, metaDescription, metaTitle, NO_AREA, NONE } from './seo';

describe('metaTitle (content slice §10)', () => {
	it('names type, pet and municipality with the suffix', () => {
		expect(metaTitle('Izgubljen pes', 'Rex', 'Ljubljana')).toEqual({
			title: 'Izgubljen pes Rex – Ljubljana · Najdimo',
			og: 'Izgubljen pes Rex – Ljubljana',
		});
	});

	it('cuts names to 16 characters', () => {
		expect(metaTitle('Lost dog', 'Bartholomew the Third', 'Kranj').title).toBe(
			'Lost dog Bartholomew the – Kranj · Najdimo'
		);
	});

	it('over 60 drops the name, then the suffix', () => {
		expect(metaTitle('Izgubljena mačka', 'Bartholomew Rexy', 'Šmarje pri Jelšah')).toEqual({
			title: 'Izgubljena mačka – Šmarje pri Jelšah · Najdimo',
			og: 'Izgubljena mačka Bartholomew Rexy – Šmarje pri Jelšah',
		});
		expect(metaTitle('Izgubljena mačka', 'Mici', 'Sveti Andraž v Slovenskih goricah').title).toBe(
			'Izgubljena mačka – Sveti Andraž v Slovenskih goricah'
		);
	});

	it('leaves out an unknown municipality and a missing name', () => {
		expect(metaTitle('Najden pes', undefined, undefined).title).toBe('Najden pes · Najdimo');
	});
});

describe('metaDescription', () => {
	const lost =
		'Pogrešan pes Rex, rjave in bele barve. Nazadnje viden 12. oktobra v okolici kraja Šiška, Ljubljana. Ste ga videli? Sporočite opažanje.';

	it('keeps the content slice example whole (134 characters)', () => {
		expect(metaDescription(lost)).toBe(lost);
		expect(lost).toHaveLength(134);
	});

	it('stops before the sentence that would pass 155 characters', () => {
		const text = `${'a'.repeat(100)}. ${'b'.repeat(40)}. ${'c'.repeat(20)}. Short.`;
		expect(metaDescription(text)).toBe(`${'a'.repeat(100)}. ${'b'.repeat(40)}.`);
	});

	it('drops the parts and sentences of missing values', () => {
		expect(
			metaDescription(
				`Najden pes, ${NONE}, 12. oktobra v okolici kraja Kamnik, ${NONE}. Je to vaš pes? Pišite osebi, ki ga je našla.`
			)
		).toBe('Najden pes, 12. oktobra v okolici kraja Kamnik. Je to vaš pes? Pišite osebi, ki ga je našla.');
		expect(
			metaDescription(
				`Pogrešan pes ${NONE}, ${NONE}. Nazadnje viden 3. maja v okolici kraja ${NO_AREA}, ${NONE}.`
			)
		).toBe('Pogrešan pes.');
	});
});

describe('listOf', () => {
	it('joins as the glossary does', () => {
		expect(listOf(['črne', 'rjave', 'bele'], 'sl')).toBe('črne, rjave in bele');
		expect(listOf(['black', 'brown', 'white'], 'en')).toBe('black, brown and white');
	});
});
