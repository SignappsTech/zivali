import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { getMockEvents, initAnalytics, resetMockEvents, setConsent } from '@zivali/analytics';

import { routeTemplate, ScreenViews } from './screen-views';

const route = vi.hoisted(() => ({ pathname: '/', params: {} as Record<string, string | string[]> }));
vi.mock('next/navigation', () => ({ usePathname: () => route.pathname, useParams: () => route.params }));

afterEach(cleanup);

describe('routeTemplate', () => {
	it.each([
		['/', { locale: 'sl' }, '/'],
		['/en', { locale: 'en' }, '/'],
		['/r/AB12CD', { locale: 'sl', code: 'AB12CD' }, '/r/[code]'],
		['/en/r/AB12CD', { locale: 'en', code: 'AB12CD' }, '/r/[code]'],
		['/r/%C5%A1apa', { locale: 'sl', code: 'šapa' }, '/r/[code]'],
		['/en/info/help/chips', { locale: 'en', slug: ['help', 'chips'] }, '/info/[...slug]'],
		['/report/re', { locale: 'sl', code: 're' }, '/report/[code]'],
	])('%s → %s', (pathname, params, template) => {
		expect(routeTemplate(pathname, params)).toBe(template);
	});
});

describe('ScreenViews', () => {
	it('sends one page_view per route change, by template, once consent is granted', () => {
		initAnalytics();
		setConsent({ analytics: true });
		resetMockEvents();
		const screens = () => getMockEvents().map((event) => event.params.path);

		route.pathname = '/en/r/AB12CD';
		route.params = { locale: 'en', code: 'AB12CD' };
		const { rerender } = render(<ScreenViews />);
		expect(screens()).toEqual(['/r/[code]']);

		route.params = { ...route.params }; // same route, new params object: no second hit
		rerender(<ScreenViews />);
		expect(screens()).toEqual(['/r/[code]']);

		route.pathname = '/en';
		route.params = { locale: 'en' };
		rerender(<ScreenViews />);
		expect(screens()).toEqual(['/r/[code]', '/']);
	});

	it('sends nothing without consent', () => {
		initAnalytics();
		setConsent({ analytics: false });
		resetMockEvents();

		route.pathname = '/r/AB12CD';
		route.params = { locale: 'sl', code: 'AB12CD' };
		render(<ScreenViews />);

		expect(getMockEvents()).toEqual([]);
	});
});
