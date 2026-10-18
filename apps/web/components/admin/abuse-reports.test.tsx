import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { Provider } from 'react-redux';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { adminAbuseReports, moderationFlags } from '@zivali/api/__fixtures__/abuse';
import { createMockApi, type MockRoutes, mockError } from '@zivali/api/mock';
import { createApiStore } from '@zivali/api/rtk';
import sl from '@zivali/i18n/dist/sl.json';

import { AbuseReports } from './abuse-reports';

const a = sl.admin;
const REPORTS = 'GET /v1/admin/abuse-reports';
const FLAGS = 'GET /v1/admin/moderation-flags';

vi.mock('@/i18n/navigation', () => ({
	Link: ({
		href,
		children,
		...props
	}: {
		href: { pathname: string; params: { code: string } };
		children: React.ReactNode;
	}) => (
		<a href={href.pathname.replace('[code]', href.params.code)} {...props}>
			{children}
		</a>
	),
}));

// Radix Select measures and scrolls its options; jsdom has neither.
globalThis.ResizeObserver ??= class {
	observe() {}
	unobserve() {}
	disconnect() {}
} as unknown as typeof ResizeObserver;
Element.prototype.scrollIntoView ??= () => {};
Element.prototype.hasPointerCapture ??= () => false;

afterEach(cleanup);

function renderPage(routes: MockRoutes = {}) {
	const client = createMockApi({ [REPORTS]: adminAbuseReports, [FLAGS]: moderationFlags, ...routes });
	render(
		<NextIntlClientProvider locale="sl" messages={sl} timeZone="Europe/Ljubljana">
			<Provider store={createApiStore(client)}>
				<AbuseReports />
			</Provider>
		</NextIntlClientProvider>
	);
	return { client, last: (path: string) => client.calls.filter((call) => call.path === path).at(-1)?.query };
}

const cells = (row: HTMLElement) =>
	within(row)
		.getAllByRole('cell')
		.map((td) => td.textContent);

const choose = async (filter: string, option: string) => {
	fireEvent.keyDown(screen.getByRole('combobox', { name: filter }), { key: 'Enter' });
	fireEvent.keyDown(await screen.findByRole('option', { name: option }), { key: 'Enter' });
};

describe('AbuseReports', () => {
	it('lists reports with target, reason, weight, status and date, newest first, linked to the report', async () => {
		renderPage();
		expect(screen.getByRole('heading', { level: 1, name: a.nav_abuse })).toBeTruthy();
		const table = await screen.findByRole('table', { name: a.nav_abuse });
		expect(
			within(table)
				.getAllByRole('columnheader')
				.map((th) => th.textContent)
		).toEqual([a.abuse.col_target, a.abuse.col_reason, a.abuse.col_weight, a.abuse.col_status, a.abuse.col_date]);
		expect(within(table).getByRole('columnheader', { name: a.abuse.col_date }).getAttribute('aria-sort')).toBe(
			'descending'
		);
		const [listing, message, profile] = within(table).getAllByRole('row').slice(1);
		expect(cells(listing!)).toEqual([
			'Prijava Hk3vT9qP',
			`${a.abuse.reason_scam}Asks for money upfront`,
			'1',
			a.abuse.status_open,
			'14. 10. 2026 18:10',
		]);
		expect(within(listing!).getByRole('link', { name: 'Prijava Hk3vT9qP' }).getAttribute('href')).toBe(
			'/r/Hk3vT9qP'
		);
		// A message links to the report its conversation is about; a profile has no link.
		expect(within(message!).getByRole('link', { name: 'Sporočilo o prijavi Lm4wX8rS' }).getAttribute('href')).toBe(
			'/r/Lm4wX8rS'
		);
		expect(cells(message!).slice(1, 4)).toEqual([a.abuse.reason_spam, '0,5', a.abuse.status_open]);
		expect(cells(profile!).slice(0, 4)).toEqual([
			'Profil 1b9c6f4e',
			a.abuse.reason_other,
			'1',
			a.abuse.status_dismissed,
		]);
		expect(within(profile!).queryByRole('link')).toBeNull();
		expect(within(table).queryAllByRole('button')).toHaveLength(0);
	});

	it('lists moderation flags with target, kind, weight, status and date', async () => {
		renderPage();
		expect(screen.getByRole('heading', { level: 2, name: a.abuse.flags_title })).toBeTruthy();
		const table = await screen.findByRole('table', { name: a.abuse.flags_title });
		expect(within(table).getAllByRole('columnheader')[1]!.textContent).toBe(a.abuse.col_kind);
		const [hidden, chip] = within(table).getAllByRole('row').slice(1);
		expect(cells(hidden!)).toEqual([
			'Prijava Hk3vT9qP',
			a.abuse.kind_auto_hidden,
			'3',
			a.abuse.status_open,
			'14. 10. 2026 18:10',
		]);
		expect(within(hidden!).getByRole('link').getAttribute('href')).toBe('/r/Hk3vT9qP');
		expect(cells(chip!).slice(0, 4)).toEqual([
			'Žival 9d8c7b6a',
			a.abuse.kind_duplicate_chip,
			'–',
			a.abuse.status_resolved,
		]);
	});

	it('filters reports by status and target type, and clears the filters', async () => {
		const { last } = renderPage();
		await screen.findByRole('table', { name: a.nav_abuse });
		await choose(a.abuse.col_status, a.abuse.status_open);
		await waitFor(() => expect(last('/v1/admin/abuse-reports')).toEqual({ status: 'open' }));
		await choose(a.abuse.col_target, a.abuse.target_message);
		await waitFor(() =>
			expect(last('/v1/admin/abuse-reports')).toEqual({ status: 'open', target_type: 'message' })
		);
		expect(screen.getByRole('combobox', { name: `${a.abuse.col_target}: ${a.abuse.target_message}` })).toBeTruthy();

		fireEvent.click(screen.getByRole('button', { name: a.filters_clear }));
		expect(screen.getByRole('combobox', { name: a.abuse.col_status }).textContent).toBe(a.abuse.col_status);
		expect(screen.queryByRole('button', { name: a.filters_clear })).toBeNull();
	});

	it('loads more with the cursor, and shows the empty and the error state per list', async () => {
		const { last } = renderPage({
			[REPORTS]: ({ query }) =>
				query.cursor ? adminAbuseReports : { items: adminAbuseReports.items.slice(0, 1), next_cursor: 'c1' },
		});
		fireEvent.click(await screen.findByRole('button', { name: a.load_more }));
		await waitFor(() =>
			expect(within(screen.getByRole('table', { name: a.nav_abuse })).getAllByRole('row')).toHaveLength(5)
		);
		expect(last('/v1/admin/abuse-reports')).toEqual({ cursor: 'c1' });
		expect(screen.queryByRole('button', { name: a.load_more })).toBeNull();
		cleanup();

		renderPage({ [REPORTS]: { items: [], next_cursor: null }, [FLAGS]: () => mockError('AAL2_REQUIRED') });
		expect((await screen.findByText(a.empty)).getAttribute('role')).toBe('status');
		expect((await screen.findByRole('alert')).textContent).toContain(a.error);
		expect(screen.getByRole('button', { name: a.retry })).toBeTruthy();
	});
});
