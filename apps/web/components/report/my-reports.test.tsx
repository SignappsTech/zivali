import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { Provider } from 'react-redux';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ownerReport } from '@zivali/api/__fixtures__/reports';
import { createMockApi, type MockRoutes, mockError } from '@zivali/api/mock';
import { createApiStore } from '@zivali/api/rtk';
import sl from '@zivali/i18n/dist/sl.json';
import { formatDayMonth } from '@zivali/i18n/format';
import type { ReportOwnerView } from '@zivali/types';

import { MyReports, type ReportAction } from './my-reports';

// Radix radios measure themselves; jsdom has no ResizeObserver.
globalThis.ResizeObserver ??= class {
	observe() {}
	unobserve() {}
	disconnect() {}
} as unknown as typeof ResizeObserver;

const nav = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }));
vi.mock('next/navigation', async (actual) => ({
	...(await actual()),
	useRouter: () => nav,
	usePathname: () => '/moje-prijave',
	useParams: () => ({ locale: 'sl' }),
}));
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }));
vi.mock('sonner', async (actual) => ({ ...(await actual()), toast }));

const rex: ReportOwnerView = {
	...ownerReport,
	id: 'r1',
	short_code: 'Rex12345',
	type: 'lost',
	name: 'Rex',
	manager_role: 'owner',
	event_at: '2026-10-12T16:00:00Z',
};
const found: ReportOwnerView = { ...ownerReport, id: 'r2', status: 'reunited', photos: [] };

function show(routes: MockRoutes = {}, deepLink?: ReportAction) {
	const api = createMockApi({
		'GET /v1/me/reports': { items: [rex, found], next_cursor: null },
		'GET /v1/reports/:code': rex,
		'POST /v1/reports/:code/transitions': rex,
		...routes,
	});
	render(
		<NextIntlClientProvider locale="sl" messages={sl} timeZone="Europe/Ljubljana">
			<Provider store={createApiStore(api)}>
				<MyReports deepLink={deepLink} />
			</Provider>
		</NextIntlClientProvider>
	);
	return api;
}
const sent = (api: ReturnType<typeof createMockApi>) =>
	api.calls.filter((call) => call.path.endsWith('/transitions')).map((call) => call.body);

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

describe('MyReports (P8 "Moje prijave")', () => {
	it('lists the reports with the date line and the status word, each a link to its page', async () => {
		show();

		expect(screen.getByRole('heading', { level: 1, name: 'Moje prijave' })).toBeTruthy();
		const rows = await screen.findAllByRole('link');
		expect(rows.map((row) => [row.getAttribute('href'), row.textContent])).toEqual([
			['/r/Rex12345', `RexPogrešana od ${formatDayMonth(rex.event_at, 'sl')}Izgubljena`],
			[`/r/${ownerReport.short_code}`, `Najden pesNajdena ${formatDayMonth(found.event_at, 'sl')}Spet doma`],
		]);
	});

	it('says when there are none, and offers a retry when the list fails', async () => {
		show({ 'GET /v1/me/reports': { items: [], next_cursor: null } });
		expect(await screen.findByText(sl.pets.my_reports_empty)).toBeTruthy();

		cleanup();
		show({ 'GET /v1/me/reports': () => mockError('INTERNAL') });
		const alert = await screen.findByRole('alert');
		expect(within(alert).getByRole('button', { name: sl.common.inline_error_retry })).toBeTruthy();
	});

	it('is the section heading under the pets list', () => {
		render(
			<NextIntlClientProvider locale="sl" messages={sl}>
				<Provider store={createApiStore(createMockApi({}))}>
					<MyReports level={2} />
				</Provider>
			</NextIntlClientProvider>
		);
		expect(screen.getByRole('heading', { level: 2, name: 'Moje prijave' })).toBeTruthy();
	});

	it.each(['keep', 'extend'] as const)(
		'?action=%s shows the reminder and extends only when "Nadaljuj iskanje" is pressed',
		async (action) => {
			const api = show({}, { code: 'Rex12345', action });

			const keep = await screen.findByRole('button', { name: sl.lifecycle.reminder_keep });
			expect(screen.getByText(sl.lifecycle.reminder_title)).toBeTruthy();
			// Opening the link changes nothing.
			await new Promise((resolve) => setTimeout(resolve, 20));
			expect(sent(api)).toEqual([]);
			expect(nav.replace).not.toHaveBeenCalled();

			fireEvent.click(keep);
			await waitFor(() => expect(sent(api)).toEqual([{ action: 'extend' }]));
			await waitFor(() => expect(toast.success).toHaveBeenCalledWith(sl.common.toast_saved));
			expect(nav.replace).toHaveBeenCalledWith('/moje-prijave');
			expect(document.activeElement).toBe(screen.getByRole('heading', { level: 1 }));
		}
	);

	it('a found report gets "Podaljšaj za 30 dni" on the same terms', async () => {
		const api = show(
			{ 'GET /v1/reports/:code': { ...rex, type: 'found' } },
			{ code: 'Rex12345', action: 'extend' }
		);

		fireEvent.click(await screen.findByRole('button', { name: sl.report_found.extend }));
		await waitFor(() => expect(sent(api)).toEqual([{ action: 'extend' }]));
	});

	it('?action=close opens the reason dialog; "Pusti odprto" drops the query', async () => {
		const api = show({}, { code: 'Rex12345', action: 'close' });

		const dialog = await screen.findByRole('dialog', { name: 'Zaključite iskanje?' });
		fireEvent.click(within(dialog).getByRole('button', { name: 'Pusti odprto' }));
		expect(nav.replace).toHaveBeenCalledWith('/moje-prijave');
		expect(sent(api)).toEqual([]);
		// The dialog has no trigger: focus goes to the h1, not to the body.
		await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('heading', { level: 1 })));
	});

	it('an action on a report that has ended says it is already closed', async () => {
		const api = show(
			{ 'GET /v1/reports/:code': { ...rex, status: 'closed' } },
			{ code: 'Rex12345', action: 'keep' }
		);

		await waitFor(() => expect(toast.info).toHaveBeenCalledWith(sl.lifecycle.already_closed));
		expect(sent(api)).toEqual([]);
		expect(nav.replace).toHaveBeenCalledWith('/moje-prijave');
	});
});
