import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { Provider } from 'react-redux';
import { afterEach, describe, expect, it } from 'vitest';

import { adminLeads } from '@zivali/api/__fixtures__/ads';
import { createMockApi, type MockRoutes, mockError } from '@zivali/api/mock';
import { createApiStore } from '@zivali/api/rtk';
import sl from '@zivali/i18n/dist/sl.json';

import { Enquiries } from './enquiries';

const a = sl.admin;
const [newest, older] = adminLeads.items as [(typeof adminLeads.items)[0], (typeof adminLeads.items)[0]];

afterEach(cleanup);

function renderEnquiries(routes: MockRoutes = {}) {
	const client = createMockApi({ 'GET /v1/admin/leads': adminLeads, ...routes });
	render(
		<NextIntlClientProvider locale="sl" messages={sl} timeZone="Europe/Ljubljana">
			<Provider store={createApiStore(client)}>
				<Enquiries regions={{ osrednjeslovenska: 'Osrednjeslovenska' }} />
			</Provider>
		</NextIntlClientProvider>
	);
	return client;
}

const cells = (row: HTMLElement) =>
	within(row)
		.getAllByRole('cell')
		.map((td) => td.textContent);

describe('Enquiries', () => {
	it('lists the leads from GET /v1/admin/leads in the dense table with the consent time, newest first', async () => {
		const client = renderEnquiries();
		expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(a.leads_title);
		const table = await screen.findByRole('table', { name: a.leads_title });
		expect(
			within(table)
				.getAllByRole('columnheader')
				.map((th) => th.textContent)
		).toEqual([
			a.leads_received,
			a.leads_company,
			a.leads_contact,
			a.leads_email,
			a.leads_region,
			a.leads_consent_time,
		]);
		expect(within(table).getByRole('columnheader', { name: a.leads_received }).getAttribute('aria-sort')).toBe(
			'descending'
		);
		const [first, second] = within(table).getAllByRole('row').slice(1);
		expect(cells(first!)).toEqual([
			'18. 10. 2026 11:15',
			newest.company,
			newest.contact_name,
			newest.email,
			'Osrednjeslovenska',
			'18. 10. 2026 11:15',
		]);
		// No region chosen is the form's "all of Slovenia".
		expect(cells(second!)).toEqual([
			'12. 10. 2026 18:40',
			older.company,
			older.contact_name,
			older.email,
			sl.partners.form_region_all,
			'12. 10. 2026 18:40',
		]);
		// Read only: one opener per row, no checkboxes, no destructive actions.
		expect(
			within(table)
				.getAllByRole('button')
				.map((button) => button.textContent)
		).toEqual([newest.company, older.company]);
		expect(within(table).queryAllByRole('checkbox')).toHaveLength(0);
		expect(client.calls.map(({ method, path, query }) => [method, path, query])).toEqual([
			['GET', '/v1/admin/leads', {}],
		]);
		// Below lg the same leads as stacked rows.
		expect(within(screen.getByRole('list', { name: a.leads_title })).getAllByRole('listitem')).toHaveLength(2);
	});

	it('opens the drawer with the details, the message and the consent record; Escape returns focus to the row', async () => {
		renderEnquiries();
		const table = await screen.findByRole('table', { name: a.leads_title });
		const opener = within(table).getByRole('button', { name: newest.company });
		opener.focus();
		fireEvent.click(opener);
		const drawer = await screen.findByRole('dialog', { name: newest.company });
		expect(within(drawer).getByText(newest.email)).toBeTruthy();
		expect(within(drawer).getByText(newest.phone!)).toBeTruthy();
		expect(within(drawer).getByText(a.leads_type_vet)).toBeTruthy();
		expect(within(drawer).getByRole('heading', { name: a.leads_message })).toBeTruthy();
		expect(within(drawer).getByText(newest.message)).toBeTruthy();
		expect(within(drawer).getByText(a.leads_consent.replace('{date}', '18. 10. 2026 11:15'))).toBeTruthy();

		fireEvent.keyDown(drawer, { key: 'Escape' });
		await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
		await waitFor(() => expect(document.activeElement).toBe(opener));

		// Without a phone the row is left out.
		fireEvent.click(within(table).getByRole('button', { name: older.company }));
		const second = await screen.findByRole('dialog', { name: older.company });
		expect(within(second).queryByText(a.leads_phone)).toBeNull();
		expect(within(second).getByText(a.leads_type_ad)).toBeTruthy();
	});

	it('loads more with the cursor, and shows the empty state and the error note with a retry', async () => {
		const client = renderEnquiries({
			'GET /v1/admin/leads': ({ query }) =>
				query.cursor ? { items: [older], next_cursor: null } : { items: [newest], next_cursor: 'l1' },
		});
		fireEvent.click(await screen.findByRole('button', { name: a.load_more }));
		await waitFor(() =>
			expect(within(screen.getByRole('table', { name: a.leads_title })).getAllByRole('row')).toHaveLength(3)
		);
		expect(client.calls.at(-1)?.query).toEqual({ cursor: 'l1' });
		expect(screen.queryByRole('button', { name: a.load_more })).toBeNull();
		cleanup();

		renderEnquiries({ 'GET /v1/admin/leads': { items: [], next_cursor: null } });
		expect((await screen.findByText(a.empty)).getAttribute('role')).toBe('status');
		expect(screen.queryByRole('table')).toBeNull();
		cleanup();

		let fail = true;
		const failing = renderEnquiries({
			'GET /v1/admin/leads': () => (fail ? mockError('FORBIDDEN') : adminLeads),
		});
		expect((await screen.findByRole('alert')).textContent).toContain(a.error);
		fail = false;
		fireEvent.click(screen.getByRole('button', { name: a.retry }));
		expect(await screen.findByRole('table', { name: a.leads_title })).toBeTruthy();
		expect(failing.calls.length).toBeGreaterThan(1);
	});
});
