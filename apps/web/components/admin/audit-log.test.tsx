import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { Provider } from 'react-redux';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { auditLog } from '@zivali/api/__fixtures__/me';
import { createMockApi, type MockRoutes, mockError } from '@zivali/api/mock';
import { createApiStore } from '@zivali/api/rtk';
import sl from '@zivali/i18n/dist/sl.json';

import { AuditLog, changeSummary, RecentChanges, shortId } from './audit-log';

const a = sl.admin;

vi.mock('@/i18n/navigation', () => ({
	Link: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
		<a href={href} {...props}>
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

function renderLog(routes: MockRoutes = {}, ui: React.ReactNode = <AuditLog />) {
	const client = createMockApi({ 'GET /v1/admin/audit-log': auditLog, ...routes });
	render(
		<NextIntlClientProvider locale="sl" messages={sl} timeZone="Europe/Ljubljana">
			<Provider store={createApiStore(client)}>{ui}</Provider>
		</NextIntlClientProvider>
	);
	return client;
}

const choose = async (filter: string, option: string) => {
	fireEvent.keyDown(screen.getByRole('combobox', { name: filter }), { key: 'Enter' });
	fireEvent.keyDown(await screen.findByRole('option', { name: option }), { key: 'Enter' });
};

describe('AuditLog', () => {
	it('lists when, who, what, target and the change, newest first, read only', async () => {
		renderLog();
		const table = await screen.findByRole('table', { name: a.audit_title });
		expect(
			within(table)
				.getAllByRole('columnheader')
				.map((th) => th.textContent)
		).toEqual([a.audit_time, a.audit_actor, a.audit_action, a.audit_target, a.audit_change]);
		expect(within(table).getByRole('columnheader', { name: a.audit_time }).getAttribute('aria-sort')).toBe(
			'descending'
		);
		const [first, , system] = within(table).getAllByRole('row').slice(1);
		expect(
			within(first!)
				.getAllByRole('cell')
				.map((td) => td.textContent)
		).toEqual([
			'15. 10. 2026 14:32',
			'0c4e2b1a',
			'user.role.set',
			'profile: 1b9c6f4e',
			'USER → MODERATOR · note: Shelter coordinator',
		]);
		// System actions have no actor; short codes stay whole.
		expect(within(system!).getAllByRole('cell')[1]!.textContent).toBe(a.directory.history_system);
		expect(within(system!).getAllByRole('cell')[3]!.textContent).toBe('report: Hk3vT9qP');
		expect(within(table).queryAllByRole('checkbox')).toHaveLength(0);
		expect(within(table).queryAllByRole('button')).toHaveLength(0);
	});

	it('filters by action and by actor with exact values, and clears the filters', async () => {
		const client = renderLog();
		await screen.findByRole('table', { name: a.audit_title });
		await choose(a.audit_action, 'user.role.set');
		await waitFor(() => expect(client.calls.at(-1)?.query).toEqual({ action: 'user.role.set' }));
		expect(screen.getByRole('combobox', { name: `${a.audit_action}: user.role.set` }).textContent).toBe(
			`${a.audit_action}: user.role.set`
		);

		await choose(a.audit_actor, '0c4e2b1a');
		await waitFor(() =>
			expect(client.calls.at(-1)?.query).toEqual({
				action: 'user.role.set',
				actor_id: auditLog.items[0]!.actor_id,
			})
		);

		fireEvent.click(screen.getByRole('button', { name: a.filters_clear }));
		expect(screen.getByRole('combobox', { name: a.audit_action }).textContent).toBe(a.audit_action);
		expect(screen.queryByRole('button', { name: a.filters_clear })).toBeNull();
	});

	it('loads more with the cursor, and shows the empty and the error state', async () => {
		const client = renderLog({
			'GET /v1/admin/audit-log': ({ query }) =>
				query.cursor ? auditLog : { items: auditLog.items.slice(0, 1), next_cursor: 'c1' },
		});
		fireEvent.click(await screen.findByRole('button', { name: a.load_more }));
		await waitFor(() => expect(screen.getAllByRole('row')).toHaveLength(5));
		expect(client.calls.at(-1)?.query).toEqual({ cursor: 'c1' });
		expect(screen.queryByRole('button', { name: a.load_more })).toBeNull();
		cleanup();

		renderLog({ 'GET /v1/admin/audit-log': { items: [], next_cursor: null } });
		expect((await screen.findByText(a.empty)).getAttribute('role')).toBe('status');
		cleanup();

		renderLog({ 'GET /v1/admin/audit-log': () => mockError('FORBIDDEN') });
		expect((await screen.findByRole('alert')).textContent).toContain(a.error);
	});

	it('shows the five latest entries on the dashboard with a link to the log', async () => {
		const client = renderLog({}, <RecentChanges />);
		const table = await screen.findByRole('table', { name: a.dash_recent });
		expect(within(table).getAllByRole('row')).toHaveLength(4);
		expect(within(table).getAllByRole('columnheader')).toHaveLength(4);
		expect(client.calls[0]!.query).toEqual({ limit: '5' });
		expect(screen.getByRole('link', { name: `${a.dash_open}: ${a.audit_title}` }).getAttribute('href')).toBe(
			'/admin/audit-log'
		);
	});
});

describe('audit entry text', () => {
	it('shortens uuids only and sums up a diff', () => {
		expect(shortId('0c4e2b1a-6d8f-4a3c-9e5b-7f1a2c3d4e50')).toBe('0c4e2b1a');
		expect(shortId('lipa')).toBe('lipa');
		expect(changeSummary(null)).toBe('');
		expect(changeSummary({ from: null, to: 'ADMIN' })).toBe('– → ADMIN');
		expect(changeSummary({ filters: { action: 'x' }, note: 'a' })).toBe('filters: {"action":"x"} · note: a');
	});
});
