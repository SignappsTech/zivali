// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';

import { shelterList } from '@zivali/api/__fixtures__/directory';

import sitemap from './sitemap';

vi.mock('@/lib/directory', () => ({ getShelters: async () => shelterList }));

describe('sitemap.xml', () => {
	it('lists home, the P3 content pages, the directory, the legal pages and every shelter page in both locales on the app URL', async () => {
		const entries = await sitemap();

		expect(entries.map((entry) => entry.url)).toEqual([
			'https://najdimo.si/',
			'https://najdimo.si/en',
			'https://najdimo.si/kako-deluje',
			'https://najdimo.si/en/how-it-works',
			'https://najdimo.si/varnost',
			'https://najdimo.si/en/safety',
			'https://najdimo.si/pogosta-vprasanja',
			'https://najdimo.si/en/faq',
			'https://najdimo.si/za-zavetisca',
			'https://najdimo.si/en/for-shelters',
			'https://najdimo.si/o-nas',
			'https://najdimo.si/en/about',
			'https://najdimo.si/zavetisca',
			'https://najdimo.si/en/shelters',
			'https://najdimo.si/zasebnost',
			'https://najdimo.si/en/privacy',
			'https://najdimo.si/piskotki',
			'https://najdimo.si/en/cookies',
			'https://najdimo.si/pogoji-uporabe',
			'https://najdimo.si/en/terms',
			'https://najdimo.si/impresum',
			'https://najdimo.si/en/imprint',
			'https://najdimo.si/dostopnost',
			'https://najdimo.si/en/accessibility',
			'https://najdimo.si/zavetisca/zavetisce-ljubljana',
			'https://najdimo.si/en/shelters/zavetisce-ljubljana',
		]);
		expect(entries.at(-1)!.alternates).toEqual({
			languages: {
				sl: 'https://najdimo.si/zavetisca/zavetisce-ljubljana',
				en: 'https://najdimo.si/en/shelters/zavetisce-ljubljana',
			},
		});
	});
});
