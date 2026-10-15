import { act, cleanup, renderHook } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { SessionState } from '@zivali/api/auth';
import type { Me } from '@zivali/types';

import { useLocaleSwitch } from './use-locale-switch';

const nav = vi.hoisted(() => ({ replace: vi.fn(), pathname: '/', params: {} as Record<string, string> }));
vi.mock('next/navigation', async (actual) => ({
	...(await actual()),
	useRouter: () => ({ replace: nav.replace, push: vi.fn(), prefetch: vi.fn() }),
	usePathname: () => nav.pathname,
	useParams: () => nav.params,
}));

const auth = vi.hoisted(() => ({ state: {} as SessionState, updateMe: vi.fn(async () => ({ data: {} })) }));
vi.mock('@zivali/api/auth', () => ({ useSession: () => auth.state }));
vi.mock('@zivali/api/me', () => ({ useUpdateMeMutation: () => [auth.updateMe] }));

const signedOut: SessionState = {
	session: null,
	me: null,
	isAnonymous: false,
	isVerified: false,
	role: null,
	aal: null,
	loading: false,
};
const signedIn = (locale: 'sl' | 'en'): SessionState => ({
	...signedOut,
	session: { user: { id: 'u1' } } as SessionState['session'],
	me: { id: 'u1', locale, is_anonymous: false } as Me,
});

function setup(locale: 'sl' | 'en', pathname: string, state: SessionState) {
	nav.pathname = pathname;
	nav.params = { locale, ...(pathname.startsWith('/r/') && { code: 'Hk3vT9qP' }) };
	auth.state = state;
	return renderHook(() => useLocaleSwitch(), {
		wrapper: ({ children }) => (
			<NextIntlClientProvider locale={locale} messages={{}}>
				{children}
			</NextIntlClientProvider>
		),
	});
}

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
	document.cookie = 'NEXT_LOCALE=; max-age=0; path=/';
});

describe('useLocaleSwitch', () => {
	it.each([
		['sl', '/zemljevid', 'en', '/en/map'],
		// next-intl prefixes every locale change; the proxy then redirects /sl/… to the unprefixed SL path.
		['en', '/en/map', 'sl', '/sl/zemljevid'],
		['sl', '/r/Hk3vT9qP/ujemanja', 'en', '/en/r/Hk3vT9qP/matches'],
	] as const)('moves %s %s to %s %s and writes NEXT_LOCALE', async (locale, path, next, target) => {
		const { result } = setup(locale, path, signedOut);

		await act(() => result.current.switchLocale(next));

		expect(nav.replace).toHaveBeenCalledWith(target);
		expect(document.cookie).toContain(`NEXT_LOCALE=${next}`);
		expect(auth.updateMe).not.toHaveBeenCalled();
	});

	it('saves the profile locale of a signed-in user before switching', async () => {
		const { result } = setup('sl', '/zemljevid', signedIn('sl'));

		await act(() => result.current.switchLocale('en'));

		expect(auth.updateMe).toHaveBeenCalledWith({ locale: 'en' });
		expect(auth.updateMe.mock.invocationCallOrder[0]).toBeLessThan(nav.replace.mock.invocationCallOrder[0]);
		expect(nav.replace).toHaveBeenCalledWith('/en/map');
	});

	it('moves to the profile locale after a sign-in in this tab', () => {
		const { rerender } = setup('sl', '/zemljevid', signedOut);
		expect(nav.replace).not.toHaveBeenCalled();

		auth.state = signedIn('en');
		rerender();

		expect(nav.replace).toHaveBeenCalledWith('/en/map');
		expect(auth.updateMe).not.toHaveBeenCalled();
	});

	it('keeps the page language when the page opens with a session already there', () => {
		setup('sl', '/zemljevid', signedIn('en'));

		expect(nav.replace).not.toHaveBeenCalled();
	});
});
