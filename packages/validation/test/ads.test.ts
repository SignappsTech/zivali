import { describe, expect, test } from 'vitest';

import { AdInput } from '../src/index.ts';

const base = {
	title: 'Hrana',
	body: 'Dobra hrana za vašega psa',
	cta: 'Poglej',
	link_url: 'https://example.com/a?b=1',
	image_alt: 'Pes in skleda',
	slots: ['feed'],
	locale: 'sl',
};

describe('AdInput cta (C14 1.3)', () => {
	test.each(['', '   '])('accepts an empty button text (%j), trimmed to empty', (cta) => {
		const r = AdInput.safeParse({ ...base, cta });
		expect(r.success && r.data.cta).toBe('');
	});
	test('still caps it at 24 characters and requires the field', () => {
		expect(AdInput.safeParse({ ...base, cta: 'C'.repeat(24) }).success).toBe(true);
		expect(AdInput.safeParse({ ...base, cta: 'C'.repeat(25) }).success).toBe(false);
		expect(AdInput.safeParse({ ...base, cta: undefined }).success).toBe(false);
	});
});

describe('AdInput link_url', () => {
	test('accepts a plain https url', () => {
		expect(AdInput.safeParse(base).success).toBe(true);
	});
	test.each(['https://example.com/a b', 'https://example.com/\u0000', 'https://example.com/\u007f'])(
		'rejects whitespace and control characters (%j)',
		(link_url) => {
			expect(AdInput.safeParse({ ...base, link_url }).success).toBe(false);
		}
	);
	test('line breaks are stripped by URL parsing, never stored', () => {
		const r = AdInput.safeParse({ ...base, link_url: 'https://example.com/a\nb' });
		expect(r.success && r.data.link_url).toBe('https://example.com/ab');
	});
});
