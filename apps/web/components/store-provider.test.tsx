import { cleanup, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { api } from '@zivali/api/rtk';

import { StoreProvider } from './store-provider';

// The real baseQuery and store over the in-memory API instead of the network.
vi.mock('@/lib/store', async () => {
	const { createMockApi } = await import('@zivali/api/mock');
	const { createApiStore } = await import('@zivali/api/rtk');
	return {
		getStore: (locale: 'sl' | 'en') =>
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

describe('StoreProvider', () => {
	it.each(['sl', 'en'] as const)('serves RTK Query hooks with the %s locale', async (locale) => {
		render(
			<NextIntlClientProvider locale={locale} messages={{}}>
				<StoreProvider>
					<Ping />
				</StoreProvider>
			</NextIntlClientProvider>
		);

		expect(await screen.findByText(`lang ${locale}`)).toBeTruthy();
	});
});
