import { cleanup, render, renderHook, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { usePathname, useRouter } from './client-navigation';
import { getPathname, Link, redirect } from './navigation';

const nav = vi.hoisted(() => ({
	pathname: '/',
	params: { locale: 'sl' } as Record<string, string>,
	push: vi.fn(),
	replace: vi.fn(),
	redirect: vi.fn(),
}));
vi.mock('next/navigation', async (actual) => ({
	...(await actual()),
	useRouter: () => ({ push: nav.push, replace: nav.replace, prefetch: vi.fn(), back: vi.fn() }),
	usePathname: () => nav.pathname,
	useParams: () => nav.params,
	redirect: nav.redirect,
}));

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
	document.cookie = 'NEXT_LOCALE=; max-age=0; path=/';
});

// The next-intl API on ./route.ts (TASK-90.7); the paths themselves are checked against next-intl in route.test.ts.
describe('@/i18n/navigation and @/i18n/client-navigation', () => {
	it('usePathname is the internal template of the browser path', () => {
		nav.pathname = '/en/my-pets/Ab3';
		nav.params = { locale: 'en', id: 'Ab3' };
		expect(renderHook(() => usePathname()).result.current).toBe('/my-pets/[id]');
	});

	it('useRouter localises hrefs; a locale option switches language and writes NEXT_LOCALE', () => {
		nav.pathname = '/moje-zivali';
		nav.params = { locale: 'sl' };
		const router = renderHook(() => useRouter()).result.current;

		router.push('/my-pets');
		router.push({ pathname: '/my-pets/[id]', params: { id: 'Ab3' } }, { scroll: false });
		router.replace({ pathname: '/sign-in', query: { next: '/moje-zivali' } });
		expect(nav.push.mock.calls).toEqual([['/moje-zivali'], ['/moje-zivali/Ab3', { scroll: false }]]);
		expect(nav.replace).toHaveBeenCalledWith('/vpis?next=%2Fmoje-zivali');
		expect(document.cookie).not.toContain('NEXT_LOCALE');

		router.replace('/my-pets', { locale: 'en' });
		expect(nav.replace).toHaveBeenLastCalledWith('/en/my-pets');
		expect(document.cookie).toContain('NEXT_LOCALE=en');
	});

	it('redirect and getPathname take { href, locale }', () => {
		redirect({ href: { pathname: '/sign-in', query: { next: '/x' } }, locale: 'en' });
		expect(nav.redirect).toHaveBeenCalledWith('/en/sign-in?next=%2Fx', undefined);
		expect(getPathname({ locale: 'sl', href: '/cookies' })).toBe('/piskotki');
	});

	it('Link renders the localised href through next/link, query included', () => {
		render(
			<NextIntlClientProvider locale="en" messages={{}}>
				<Link href={{ pathname: '/map', query: { type: 'lost' } }}>Lost</Link>
				<Link href="/about" prefetch={false}>
					About
				</Link>
				<Link href={'https://najdimo.si/x' as never}>External</Link>
			</NextIntlClientProvider>
		);
		expect(screen.getByRole('link', { name: 'Lost' }).getAttribute('href')).toBe('/en/map?type=lost');
		expect(screen.getByRole('link', { name: 'About' }).getAttribute('href')).toBe('/en/about');
		expect(screen.getByRole('link', { name: 'External' }).getAttribute('href')).toBe('https://najdimo.si/x');
	});
});
