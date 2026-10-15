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
