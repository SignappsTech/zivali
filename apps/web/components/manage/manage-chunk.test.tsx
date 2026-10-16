import { cleanup, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { Provider } from 'react-redux';
import { afterEach, expect, it, vi } from 'vitest';

import { createMockApi } from '@zivali/api/mock';
import { createApiStore } from '@zivali/api/rtk';
import sl from '@zivali/i18n/dist/sl.json';

import { ManagePage } from './manage-page';

vi.mock('next/navigation', async (actual) => ({
	...(await actual()),
	useRouter: () => ({ replace: vi.fn(), push: vi.fn(), prefetch: vi.fn() }),
	usePathname: () => '/m',
	useParams: () => ({ locale: 'sl' }),
}));
vi.mock('@/lib/auth', () => ({ ensureSession: vi.fn() }));
// The report view's chunk fails to download, as on a lost connection.
vi.mock('./manage-view', () => {
	throw new Error('Failed to fetch dynamically imported module');
});

afterEach(() => {
	cleanup();
	history.replaceState(null, '', '/m');
	sessionStorage.clear();
});

it('treats a failed chunk download as a lost connection: the offline note, with the automatic retry', async () => {
	history.replaceState(null, '', '/m#good');
	render(
		<NextIntlClientProvider locale="sl" messages={sl}>
			<Provider store={createApiStore(createMockApi({}))}>
				<ManagePage />
			</Provider>
		</NextIntlClientProvider>
	);
	const offline = await screen.findByText(sl.errors.offline_body, { exact: false });
	expect(offline.textContent).toBe(`${sl.errors.offline_title} ${sl.errors.offline_body}`);
});
