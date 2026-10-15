// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';

import { shelterList } from '@zivali/api/__fixtures__/directory';

import sitemap from './sitemap';

vi.mock('@/lib/directory', () => ({ getShelters: async () => shelterList }));

describe('sitemap.xml', () => {
	it('lists home, the directory and every shelter page in both locales on the app URL', async () => {
		const entries = await sitemap();

		expect(entries.map((entry) => entry.url)).toEqual([
			'https://najdimo.si/',
			'https://najdimo.si/en',
			'https://najdimo.si/zavetisca',
			'https://najdimo.si/en/shelters',
			'https://najdimo.si/zavetisca/zavetisce-ljubljana',
			'https://najdimo.si/en/shelters/zavetisce-ljubljana',
		]);
		expect(entries[5]!.alternates).toEqual({
			languages: {
				sl: 'https://najdimo.si/zavetisca/zavetisce-ljubljana',
				en: 'https://najdimo.si/en/shelters/zavetisce-ljubljana',
			},
		});
	});
});
