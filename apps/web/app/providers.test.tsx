import { cleanup, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Providers } from './providers';

// Page views need the App Router (components/analytics/screen-views.test.tsx).
vi.mock('@/components/analytics/screen-views', async (importOriginal) => ({
	...(await importOriginal<typeof import('@/components/analytics/screen-views')>()),
	ScreenViews: () => null,
}));
const route = vi.hoisted(() => ({ pathname: '/' }));
vi.mock('@/i18n/navigation', () => ({ usePathname: () => route.pathname }));
vi.mock('@/components/consent/consent-banner', () => ({ ConsentBanner: () => <p>consent banner</p> }));
vi.mock('@/components/auth/session-sync', () => ({ SessionSyncIsland: () => <p>session sync</p> }));

afterEach(cleanup);

const page = (signedIn = false) => (
	<NextIntlClientProvider locale="sl" messages={{}}>
		<Providers signedIn={signedIn}>{null}</Providers>
	</NextIntlClientProvider>
);

describe('Providers', () => {
	it('connects the session (and its Redux store) on signed-in pages only (TASK-90.5)', async () => {
		const { rerender } = render(page());
		await expect(screen.findByText('session sync', {}, { timeout: 300 })).rejects.toThrow();

		rerender(page(true));
		expect(await screen.findByText('session sync')).toBeTruthy();
	});

	it('shows the consent banner on public pages, never in the admin console (no GA there, C12)', async () => {
		route.pathname = '/admin/audit-log';
		const { rerender } = render(page());
		await expect(screen.findByText('consent banner', {}, { timeout: 300 })).rejects.toThrow();

		route.pathname = '/map';
		rerender(page());
		expect(await screen.findByText('consent banner')).toBeTruthy();
	});
});
