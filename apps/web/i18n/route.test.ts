import { createNavigation } from 'next-intl/navigation';
import { describe, expect, it } from 'vitest';

import { internalPathname, localisedPath } from './route';
import { routing } from './routing';

// The reference: next-intl's own navigation for this routing (./route.ts replaces its runtime, TASK-90.7).
const intl = createNavigation(routing);

// One value per parameter name: /r/[code] → { code: 'code-1' }.
const paramsOf = (key: string) =>
	Object.fromEntries([...key.matchAll(/\[(\w+)\]/g)].map(([, name]) => [name, `${name}-1`]));

describe('@/i18n/route: next-intl paths without its client runtime', () => {
	it.each(routing.locales)('builds the same path as next-intl for every route and maps it back (%s)', (locale) => {
		for (const key of Object.keys(routing.pathnames)) {
			const href = { pathname: key, params: paramsOf(key) } as never;
			const path = intl.getPathname({ locale, href });

			expect(localisedPath({ locale, href }), key).toBe(path);
			expect(localisedPath({ locale, href, forcePrefix: true }), key).toBe(
				intl.getPathname({ locale, href, forcePrefix: true })
			);
			expect(internalPathname(locale, path), path).toBe(key);
		}
	});

	it.each([
		'/',
		'/map',
		'/dev/kit',
		{ pathname: '/map', query: { type: 'lost' } },
		{ pathname: '/', query: { next: '/zemljevid?x=1', tag: ['a', 'b'] } },
		{ pathname: '/sign-in', query: {} },
		{ pathname: '/r/[code]', params: { code: 'šapa' } },
		{ pathname: '/shelters/[slug]', params: { slug: 'zavetisce-ljubljana', locale: 'sl' } },
	])('matches next-intl for %j', (href) => {
		for (const locale of routing.locales)
			for (const forcePrefix of [undefined, true])
				expect(localisedPath({ locale, href, forcePrefix })).toBe(
					intl.getPathname({ locale, href: href as never, forcePrefix })
				);
	});

	it('needs every parameter, as next-intl', () => {
		expect(() => localisedPath({ locale: 'sl', href: { pathname: '/r/[code]' } })).toThrow(/Insufficient params/);
	});

	it.each([
		['sl', '/zemljevid', '/map'],
		['en', '/en', '/'],
		['en', '/en/shelters/zavetisce-ljubljana', '/shelters/[slug]'],
		['sl', '/moje-zivali/nova', '/my-pets/new'],
		['sl', '/admin/revizijska-sled', '/admin/audit-log'],
		['sl', '/admin/oglasi', '/admin/ads'],
		['sl', '/admin/oglasi/nov', '/admin/ads/new'],
		['en', '/en/admin/ads/ad7/edit', '/admin/ads/[id]/edit'],
		['sl', '/admin/users', '/admin/[section]'],
		['sl', '/r/%C5%A1apa', '/r/[code]'],
		// No entry: the unprefixed path as it is, as next-intl's usePathname.
		['sl', '/dev/kit', '/dev/kit'],
		['en', '/en/no/such-page', '/no/such-page'],
		['sl', '/map', '/map'],
	] as const)('%s %s → %s', (locale, path, internal) => {
		expect(internalPathname(locale, path)).toBe(internal);
	});
});
