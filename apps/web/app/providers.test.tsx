import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Providers } from './providers';

// Page views need the App Router (components/analytics/screen-views.test.tsx).
vi.mock('@/components/analytics/screen-views', async (importOriginal) => ({
	...(await importOriginal<typeof import('@/components/analytics/screen-views')>()),
	ScreenViews: () => null,
}));
const route = vi.hoisted(() => ({ pathname: '/' }));
vi.mock('next/navigation', async (actual) => ({
	...(await actual()),
	usePathname: () => route.pathname,
	useParams: () => ({ locale: 'sl' }),
}));
vi.mock('@/components/consent/consent-banner', () => ({ ConsentBanner: () => <p>consent banner</p> }));
vi.mock('@/components/auth/session-sync', () => ({ SessionSyncIsland: () => <p>session sync</p> }));

afterEach(cleanup);

// No intl provider around it: the root layout renders none (TASK-90.7).
const page = (signedIn = false) => (
	<Providers signedIn={signedIn} consent={{ copy: {} as never, policyHref: '/piskotki' }} messages={{}}>
		{null}
	</Providers>
);

describe('Providers', () => {
	it('connects the session (and its Redux store) on signed-in pages only (TASK-90.5)', async () => {
		const { rerender } = render(page());
		await expect(screen.findByText('session sync', {}, { timeout: 300 })).rejects.toThrow();

		rerender(page(true));
		expect(await screen.findByText('session sync')).toBeTruthy();
	});

	it('shows the consent banner on public pages, never in the admin console (no GA there, C12)', async () => {
		route.pathname = '/admin/revizijska-sled';
		const { rerender } = render(page());
		await expect(screen.findByText('consent banner', {}, { timeout: 300 })).rejects.toThrow();

		route.pathname = '/zemljevid';
		rerender(page());
		expect(await screen.findByText('consent banner')).toBeTruthy();
	});

	it('puts the banner first in the body, before the header and page, so it paints in the first frame (TASK-112.1)', () => {
		route.pathname = '/kako-deluje';
		const { container } = render(
			<Providers consent={{ copy: {} as never, policyHref: '/piskotki' }} messages={{}}>
				<header>header</header>
				<main>page</main>
			</Providers>
		);

		expect(container.firstElementChild).toBe(screen.getByText('consent banner'));
	});
});
