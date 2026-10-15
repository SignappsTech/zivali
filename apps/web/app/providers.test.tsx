import { cleanup, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { api } from '@zivali/api/rtk';

import { Providers } from './providers';

// Page views need the App Router (components/analytics/screen-views.test.tsx).
vi.mock('@/components/analytics/screen-views', async (importOriginal) => ({
	...(await importOriginal<typeof import('@/components/analytics/screen-views')>()),
	ScreenViews: () => null,
}));
const route = vi.hoisted(() => ({ pathname: '/' }));
vi.mock('@/i18n/navigation', () => ({ usePathname: () => route.pathname }));
vi.mock('@/components/consent/consent-banner', () => ({ ConsentBanner: () => <p>consent banner</p> }));

// The real baseQuery and store over the in-memory API instead of the network.
vi.mock('@/lib/store', async () => {
	const { createMockApi } = await import('@zivali/api/mock');
	const { createApiStore } = await import('@zivali/api/rtk');
	return {
		makeStore: (locale: 'sl' | 'en') =>
			createApiStore(
				createMockApi({ 'GET /v1/ping': ({ headers }) => ({ lang: headers['Accept-Language'] }) }, { locale })
			),
	};
});

// Shaped like a generated endpoint (src/generated/endpoints.ts injects into the same slice).
const { usePingQuery } = api.injectEndpoints({
	endpoints: (build) => ({ ping: build.query<{ lang: string }, void>({ query: () => '/v1/ping' }) }),
});

function Ping() {
	const { data } = usePingQuery();
	return <p>{data ? `lang ${data.lang}` : 'loading'}</p>;
}

afterEach(cleanup);

describe('Providers', () => {
	it.each(['sl', 'en'] as const)('serves RTK Query hooks with the %s locale', async (locale) => {
		render(
			<NextIntlClientProvider locale={locale} messages={{}}>
				<Providers>
					<Ping />
				</Providers>
			</NextIntlClientProvider>
		);

		expect(await screen.findByText(`lang ${locale}`)).toBeTruthy();
	});

	it('shows the consent banner on public pages, never in the admin console (no GA there, C12)', async () => {
		const page = () => (
			<NextIntlClientProvider locale="sl" messages={{}}>
				<Providers>{null}</Providers>
			</NextIntlClientProvider>
		);
		route.pathname = '/admin/audit-log';
		const { rerender } = render(page());
		await expect(screen.findByText('consent banner', {}, { timeout: 300 })).rejects.toThrow();

		route.pathname = '/map';
		rerender(page());
		expect(await screen.findByText('consent banner')).toBeTruthy();
	});
});
