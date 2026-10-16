import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { getMockEvents, initAnalytics, resetMockEvents, setConsent } from '@zivali/analytics';
import { routing } from '@/i18n/routing';

import { routeTemplate, ScreenViews } from './screen-views';

// The browser path (next/navigation) reaches the component as the internal (EN) route for both locales
// (@/i18n/route): /zemljevid and /en/map are both /map.
const route = vi.hoisted(() => ({ pathname: '/', locale: 'sl' }));
vi.mock('next/navigation', async (actual) => ({
	...(await actual()),
	usePathname: () => route.pathname,
	useParams: () => ({ locale: route.locale }),
}));

afterEach(cleanup);

describe('routeTemplate', () => {
	it.each([
		['/', '/'],
		['/map', '/map'],
		['/r/AB12CD', '/r/[code]'],
		['/r/%C5%A1apa', '/r/[code]'],
		['/r/AB12CD/matches', '/r/[code]/matches'],
		['/lost-dogs/ljubljana', '/lost-dogs/[location]'],
		['/guides/chips-help', '/guides/[slug]'],
		['/inbox/123', '/inbox/[id]'],
		['/foo', '/[...rest]'],
		['/r/abc/x', '/[...rest]'],
		['/R/abc', '/[...rest]'],
		['/zemljevid', '/[...rest]'],
	])('%s → %s', (pathname, template) => {
		expect(routeTemplate(pathname)).toBe(template);
	});

	it('knows every route in the routing config', () => {
		for (const key of Object.keys(routing.pathnames))
			expect(routeTemplate(key.replace(/\[\w+\]/g, 'x1'))).toBe(key);
	});
});

describe('ScreenViews', () => {
	const sent = (pathnames: string[], locale = 'sl') => {
		route.locale = locale;
		initAnalytics();
		setConsent({ analytics: true });
		resetMockEvents();
		route.pathname = pathnames[0];
		const { rerender } = render(<ScreenViews />);
		for (const pathname of pathnames.slice(1)) {
			route.pathname = pathname;
			rerender(<ScreenViews />);
		}
		return getMockEvents().map((event) => event.params.path);
	};

	it('SL and EN pages of the same route report one template; unknown paths report the catch-all', () => {
		expect(sent(['/moje-zivali'])).toEqual(['/my-pets']);
		expect(sent(['/en/my-pets'], 'en')).toEqual(['/my-pets']);
		expect(sent(['/zavetisca/zavetisce-ljubljana'])).toEqual(['/shelters/[slug]']);
		expect(sent(['/en', '/en/shelters/zavetisce-ljubljana'], 'en')).toEqual(['/', '/shelters/[slug]']);
		expect(sent(['/r/AB12CD', '/r/AB12CD', '/', '/nope/AB12CD'])).toEqual(['/r/[code]', '/', '/[...rest]']);
	});

	it('sends no page_view in the admin console, SL or EN (FR-019)', () => {
		expect(sent(['/admin', '/admin/revizijska-sled', '/admin/zavetisca', '/admin/ads', '/zemljevid'])).toEqual([
			'/map',
		]);
		expect(sent(['/en/admin/audit-log', '/en/map'], 'en')).toEqual(['/map']);
	});

	it('sends nothing without consent', () => {
		initAnalytics();
		setConsent({ analytics: false });
		resetMockEvents();

		route.pathname = '/r/AB12CD';
		render(<ScreenViews />);

		expect(getMockEvents()).toEqual([]);
	});
});
