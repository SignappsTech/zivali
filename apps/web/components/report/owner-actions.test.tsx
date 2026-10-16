import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getMockEvents, initAnalytics, resetMockEvents, setConsent } from '@zivali/analytics';
import { ownerReport } from '@zivali/api/__fixtures__/reports';
import { createMockApi, type MockRoutes, mockError } from '@zivali/api/mock';
import { createApiStore } from '@zivali/api/rtk';
import sl from '@zivali/i18n/dist/sl.json';
import type { DetailReport } from '@/components/report/slots/types';

import { flash, OwnerActions } from './owner-actions';

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
	usePathname: () => '/r/Rex12345',
	useParams: () => ({ locale: 'sl' }),
}));
// StoreProvider's store, over the mock API of the test.
const store = vi.hoisted(() => ({ current: undefined as unknown }));
vi.mock('@/lib/store', () => ({ getStore: () => store.current }));
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }));
vi.mock('sonner', async (actual) => ({ ...(await actual()), toast }));

const DAY = 86_400_000;
const ago = (days: number) => new Date(Date.now() - days * DAY).toISOString();
const lost: DetailReport = {
	...ownerReport,
	short_code: 'Rex12345',
	type: 'lost',
	name: 'Rex',
	manager_role: 'owner',
	created_at: ago(2),
	last_owner_update_at: ago(2),
};

function show(report: DetailReport, routes: MockRoutes = {}) {
	const api = createMockApi({
		'POST /v1/reports/:code/transitions': ({ body }) => ({ ...report, ...(body as object) }),
		...routes,
	});
	store.current = createApiStore(api);
	render(
		// The client copy /r/[code] sends a manager (page.tsx); a missing message fails the test.
		<NextIntlClientProvider
			locale="sl"
			messages={clientCopy}
			timeZone="Europe/Ljubljana"
			onError={(error) => {
				throw error;
			}}
		>
			<OwnerActions report={report} />
		</NextIntlClientProvider>
	);
	return api;
}
const { common, consent, errors, nav: navCopy, lifecycle } = sl;
const clientCopy = {
	common,
	consent,
	errors,
	nav: navCopy,
	lifecycle,
	report: { owner_home: sl.report.owner_home, owner_edit: sl.report.owner_edit, owner_close: sl.report.owner_close },
	report_found: { expiry_note: sl.report_found.expiry_note, extend: sl.report_found.extend },
};
const sent = (api: ReturnType<typeof createMockApi>) =>
	api.calls.filter((call) => call.path === '/v1/reports/Rex12345/transitions').map((call) => call.body);
const button = (name: string) => screen.getByRole('button', { name });

beforeEach(() => {
	initAnalytics();
	setConsent({ analytics: true });
	resetMockEvents();
});
afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

describe('OwnerActions (P9 slot A for managers, P14)', () => {
	it('an open search: the one primary "Žival je spet doma", then "Uredi" and "Zaključi iskanje"', () => {
		show(lost);

		expect(button('Žival je spet doma').dataset.variant).toBe('default');
		expect(screen.getByRole('link', { name: 'Uredi' }).getAttribute('href')).toBe('/r/Rex12345/uredi');
		expect(button('Zaključi iskanje').dataset.variant).toBe('text');
		expect(screen.queryByText(sl.lifecycle.reminder_title)).toBeNull();
	});

	it('shows the toast the edit page left for it', () => {
		flash.message = sl.common.toast_saved;
		show(lost);

		expect(toast.success).toHaveBeenCalledWith(sl.common.toast_saved);
		expect(flash.message).toBeUndefined();
	});

	it.each([
		['Žival je doma po drugi poti', 'found_elsewhere'],
		['Ne iščem več', 'gave_up'],
		// "Posted by mistake" goes as `other`: `removed` stays with moderation (C4).
		['Prijava je bila pomota', 'other'],
		['Drugo', 'other'],
	])('closes with the reason "%s" (%s)', async (label, reason) => {
		const api = show(lost);
		fireEvent.click(button('Zaključi iskanje'));

		const dialog = screen.getByRole('dialog', { name: 'Zaključite iskanje?' });
		expect(within(dialog).getByText(sl.lifecycle.close_body)).toBeTruthy();
		const confirm = within(dialog).getByRole('button', { name: 'Zaključi iskanje' }) as HTMLButtonElement;
		expect(confirm.disabled).toBe(true);
		fireEvent.click(within(dialog).getByRole('radio', { name: label }));
		fireEvent.click(confirm);

		await waitFor(() => expect(sent(api)).toEqual([{ action: 'close', reason }]));
		await waitFor(() => expect(toast.success).toHaveBeenCalledWith(sl.lifecycle.closed_toast));
		expect(nav.refresh).toHaveBeenCalled();
		expect(screen.queryByRole('dialog')).toBeNull();
	});

	it('"Pusti odprto" keeps the search open', () => {
		const api = show(lost);
		fireEvent.click(button('Zaključi iskanje'));
		fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Pusti odprto' }));

		expect(screen.queryByRole('dialog')).toBeNull();
		expect(sent(api)).toEqual([]);
	});

	it('closed meanwhile (CONFLICT): says it is already closed and leaves only "Zapri"', async () => {
		show(lost, { 'POST /v1/reports/:code/transitions': () => mockError('CONFLICT') });
		fireEvent.click(button('Zaključi iskanje'));
		const dialog = screen.getByRole('dialog');
		fireEvent.click(within(dialog).getByRole('radio', { name: 'Ne iščem več' }));
		fireEvent.click(within(dialog).getByRole('button', { name: 'Zaključi iskanje' }));

		expect((await within(dialog).findByRole('status')).textContent).toBe(sl.lifecycle.already_closed);
		expect(within(dialog).queryByRole('radio')).toBeNull();
		expect(within(dialog).queryByRole('button', { name: 'Pusti odprto' })).toBeNull();
		// The close icon and the one secondary "Zapri".
		expect(within(dialog).getAllByRole('button', { name: 'Zapri' })).toHaveLength(2);
	});

	it('a failure replaces the text with the error, and the primary tries again', async () => {
		const api = show(lost, { 'POST /v1/reports/:code/transitions': () => mockError('INTERNAL') });
		fireEvent.click(button('Žival je spet doma'));
		const dialog = screen.getByRole('dialog', { name: 'Je Rex res spet doma?' });
		fireEvent.click(within(dialog).getByRole('button', { name: 'Da, spet je doma' }));

		expect((await within(dialog).findByRole('alert')).textContent).toBe(sl.errors.INTERNAL);
		fireEvent.click(within(dialog).getByRole('button', { name: 'Poskusi znova' }));
		await waitFor(() => expect(sent(api)).toHaveLength(2));
		expect(nav.push).not.toHaveBeenCalled();
	});

	it('the owner marks the pet home: confirm, the reunited page, and `reunited` with species, region and municipality only', async () => {
		const api = show(lost);
		fireEvent.click(button('Žival je spet doma'));
		const dialog = screen.getByRole('dialog', { name: 'Je Rex res spet doma?' });
		expect(within(dialog).getByText(sl.lifecycle.confirm_body)).toBeTruthy();
		fireEvent.click(within(dialog).getByRole('button', { name: 'Da, spet je doma' }));

		await waitFor(() => expect(nav.push).toHaveBeenCalledWith('/r/Rex12345/spet-doma'));
		expect(sent(api)).toEqual([{ action: 'mark_reunited' }]);
		expect(getMockEvents()).toEqual([
			{ name: 'reunited', params: { species: 'dog', region: 'osrednjeslovenska', municipality: 'ljubljana' } },
		]);
	});

	it('without analytics consent `reunited` is not sent', async () => {
		setConsent({ analytics: false });
		show(lost);
		fireEvent.click(button('Žival je spet doma'));
		fireEvent.click(screen.getByRole('button', { name: 'Da, spet je doma' }));

		await waitFor(() => expect(nav.push).toHaveBeenCalled());
		expect(getMockEvents()).toEqual([]);
	});

	it('a finder confirms "returned" in the alert dialog, then gets the thank-you page', async () => {
		const api = show({ ...ownerReport, short_code: 'Rex12345', manager_role: 'finder' });
		fireEvent.click(button('Žival je spet doma'));
		const dialog = screen.getByRole('alertdialog', { name: sl.lifecycle.finder_confirm_title });
		fireEvent.click(within(dialog).getByRole('button', { name: sl.lifecycle.finder_confirm_yes }));

		await waitFor(() => expect(nav.push).toHaveBeenCalledWith('/r/Rex12345/spet-doma'));
		expect(sent(api)).toEqual([{ action: 'mark_reunited' }]);
	});

	it('reopens a closed search within 7 days, with the toast', async () => {
		const api = show({ ...lost, status: 'closed', close_reason: 'gave_up', closed_at: ago(6) });
		expect(screen.queryByRole('button', { name: 'Žival je spet doma' })).toBeNull();
		fireEvent.click(button('Ponovno odpri'));

		await waitFor(() => expect(sent(api)).toEqual([{ action: 'reopen' }]));
		await waitFor(() => expect(toast.success).toHaveBeenCalledWith(sl.lifecycle.reopened_toast));
		expect(nav.refresh).toHaveBeenCalled();
	});

	it('a reunited report keeps a quiet "Ponovno odpri" within the window (the owner disagrees)', () => {
		show({ ...lost, status: 'reunited', reunited_at: ago(1) });
		expect(button('Ponovno odpri').dataset.variant).toBe('text');
	});

	it('past the window the API answers GONE: the error toast', async () => {
		show(
			{ ...lost, status: 'closed', close_reason: 'gave_up', closed_at: ago(1) },
			{
				'POST /v1/reports/:code/transitions': () => mockError('GONE'),
			}
		);
		fireEvent.click(button('Ponovno odpri'));
		await waitFor(() => expect(toast.error).toHaveBeenCalledWith(sl.errors.GONE));
	});

	it.each([
		['after 7 days', { closed_at: ago(8), close_reason: 'gave_up' as const }],
		['for a moderation removal', { closed_at: ago(1), close_reason: 'removed' as const }],
	])('offers no reopen %s', (_case, closed) => {
		show({ ...lost, status: 'closed', ...closed });
		expect(screen.queryByRole('button')).toBeNull();
	});

	it('a lost search closed by the 90-day expiry: the note and "Nadaljuj iskanje" reopen it', async () => {
		const api = show({ ...lost, status: 'closed', close_reason: 'expired', closed_at: ago(1) });
		expect(screen.getByText(sl.lifecycle.expired_lost)).toBeTruthy();
		fireEvent.click(button('Nadaljuj iskanje'));
		await waitFor(() => expect(sent(api)).toEqual([{ action: 'reopen' }]));
	});

	it('a lost search idle for a week: "Še iščete?" and "Nadaljuj iskanje" takes the primary place and extends it', async () => {
		const api = show({ ...lost, created_at: ago(10), last_owner_update_at: ago(8) });
		expect(screen.getByText(sl.lifecycle.reminder_title)).toBeTruthy();
		expect(screen.getByText(/^Iskanje je odprto 10 dni\./)).toBeTruthy();
		expect(button('Žival je spet doma').dataset.variant).toBe('text');
		fireEvent.click(button('Nadaljuj iskanje'));

		await waitFor(() => expect(sent(api)).toEqual([{ action: 'extend' }]));
		await waitFor(() => expect(toast.success).toHaveBeenCalledWith(sl.common.toast_saved));
	});

	it('a found report 3 days before it expires: the P7 note and "Podaljšaj za 30 dni"', async () => {
		const api = show({ ...ownerReport, short_code: 'Rex12345', last_owner_update_at: ago(27) });
		expect(screen.getByText(/^Prijava bo potekla čez 3 dni\./)).toBeTruthy();
		fireEvent.click(button('Podaljšaj za 30 dni'));
		await waitFor(() => expect(sent(api)).toEqual([{ action: 'extend' }]));
	});
});
