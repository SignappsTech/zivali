import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { Provider } from 'react-redux';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import * as fx from '@zivali/api/__fixtures__/directory-admin';
import { createMockApi, type MockRoutes, mockError } from '@zivali/api/mock';
import { createApiStore } from '@zivali/api/rtk';
import sl from '@zivali/i18n/dist/sl.json';

import { DirectoryAdmin } from './directory-admin';

const d = sl.admin.directory;

// Radix popper content measures itself; jsdom has no ResizeObserver.
globalThis.ResizeObserver ??= class {
	observe() {}
	unobserve() {}
	disconnect() {}
} as unknown as typeof ResizeObserver;

beforeEach(() => vi.useFakeTimers({ now: new Date('2026-10-15T10:00:00Z'), toFake: ['Date'] }));
afterEach(() => {
	cleanup();
	vi.useRealTimers();
});

function renderDirectory(routes: MockRoutes = {}) {
	const client = createMockApi({
		'GET /v1/admin/shelters': fx.adminShelters,
		'GET /v1/admin/municipality-shelters': fx.adminMunicipalities,
		...routes,
	});
	render(
		<NextIntlClientProvider locale="sl" messages={sl} timeZone="Europe/Ljubljana">
			<Provider store={createApiStore(client)}>
				<DirectoryAdmin />
			</Provider>
		</NextIntlClientProvider>
	);
	return client;
}

const table = async (caption: string) => (await screen.findByRole('table', { name: caption })) as HTMLElement;
const openMenu = (name: string) =>
	fireEvent.keyDown(screen.getAllByRole('button', { name: `Dejanja: ${name}` })[0]!, { key: 'Enter' });

describe('DirectoryAdmin', () => {
	it('lists shelters with counts, marks stale rows and shows the yearly reminder with its filter', async () => {
		renderDirectory();
		const shelters = await table(d.tab_shelters);
		const lipa = within(shelters).getByRole('button', { name: 'Zavetišče Lipa' }).closest('tr')!;
		expect(within(lipa).getByText('2')).toBeTruthy();
		expect(within(lipa).getByText(d.stale)).toBeTruthy();
		expect(within(shelters).getAllByText(d.stale)).toHaveLength(1);

		// Lipa and Borovnica were checked on 3. 2. 2025.
		expect(
			screen.getByText(
				(_, el) => el?.textContent === 'Letno preverjanje: 2 vnosa nista bila preverjena več kot 12 mesecev.'
			)
		).toBeTruthy();
		fireEvent.click(screen.getByRole('button', { name: d.reminder_show }));
		expect(screen.getByRole('button', { name: d.filter_stale }).getAttribute('aria-pressed')).toBe('true');
		expect(within(shelters).getAllByRole('row')).toHaveLength(2);
		const sortedBy = within(shelters).getByRole('button', { name: `Razvrsti po: ${d.col_checked}` });
		expect(sortedBy.closest('th')!.getAttribute('aria-sort')).toBe('ascending');
	});

	it('validates the shelter form, then saves with E.164, the municipalities served, the version and hours', async () => {
		const client = renderDirectory({
			'PUT /v1/admin/shelters/:slug': ({ body }) => ({ ...fx.adminShelters.items[0], ...(body as object) }),
		});
		fireEvent.click(within(await table(d.tab_shelters)).getByRole('button', { name: 'Zavetišče Lipa' }));
		const drawer = await screen.findByRole('dialog', { name: d.edit_title });

		const phone = within(drawer).getByLabelText(d.field_phone);
		fireEvent.change(phone, { target: { value: '07 305 62' } });
		fireEvent.change(within(drawer).getAllByLabelText(d.hours_to)[0]!, { target: { value: '7.00' } });
		fireEvent.click(within(drawer).getByRole('button', { name: d.save }));
		expect(await within(drawer).findByText(d.error_phone)).toBeTruthy();
		expect(within(drawer).getByText(d.error_hours)).toBeTruthy();
		expect(phone.getAttribute('aria-invalid')).toBe('true');
		expect(client.calls.some((call) => call.method === 'PUT')).toBe(false);

		fireEvent.change(phone, { target: { value: '+386 1 234 56 79' } });
		fireEvent.change(within(drawer).getAllByLabelText(d.hours_to)[0]!, { target: { value: '16.00' } });
		fireEvent.change(within(drawer).getByLabelText(d.served_add), { target: { value: 'Bloke' } });
		expect(within(drawer).getByRole('button', { name: 'Odstrani Bloke' })).toBeTruthy();
		fireEvent.click(within(drawer).getByRole('button', { name: d.save }));

		expect(await screen.findByText(d.saved)).toBeTruthy();
		const put = client.calls.find((call) => call.method === 'PUT')!;
		expect(put.path).toBe('/v1/admin/shelters/zavetisce-lipa');
		expect(put.body).toMatchObject({
			phone: '+38612345679',
			phone_display: '+386 1 234 56 79',
			version: 3,
			verified_at: '2026-10-15',
			municipalities: ['borovnica', 'ljubljana', 'bloke'],
			opening_hours: [
				{ days: 'mon-fri', from: '08:00', to: '16:00' },
				{ days: 'sat', from: '', to: '', closed: true },
			],
		});
	});

	it('shows the conflict note when another admin saved first', async () => {
		renderDirectory({ 'PUT /v1/admin/shelters/:slug': () => mockError('CONFLICT') });
		fireEvent.click(within(await table(d.tab_shelters)).getByRole('button', { name: 'Zavetišče Ob Kolpi' }));
		const drawer = await screen.findByRole('dialog', { name: d.edit_title });
		fireEvent.click(within(drawer).getByRole('button', { name: d.save }));
		expect(await within(drawer).findByText(d.conflict)).toBeTruthy();
		expect(within(drawer).getByRole('button', { name: d.conflict_refresh })).toBeTruthy();
	});

	it('refuses to delete a shelter that serves municipalities and requires the audit note otherwise', async () => {
		const client = renderDirectory({ 'DELETE /v1/admin/shelters/:slug': () => undefined });
		await table(d.tab_shelters);

		openMenu('Zavetišče Lipa');
		fireEvent.click(await screen.findByRole('menuitem', { name: d.action_delete }));
		let dialog = await screen.findByRole('alertdialog', { name: 'Izbriši: Zavetišče Lipa?' });
		expect(dialog.textContent).toContain('ker je pristojno za 2 občini');
		expect((within(dialog).getByRole('button', { name: d.action_delete }) as HTMLButtonElement).disabled).toBe(
			true
		);
		fireEvent.click(within(dialog).getByRole('button', { name: sl.admin.cancel }));

		openMenu('Zavetišče Sončni Log');
		fireEvent.click(await screen.findByRole('menuitem', { name: d.action_delete }));
		dialog = await screen.findByRole('alertdialog', { name: 'Izbriši: Zavetišče Sončni Log?' });
		const remove = within(dialog).getByRole('button', { name: d.action_delete }) as HTMLButtonElement;
		expect(remove.disabled).toBe(true);
		fireEvent.change(within(dialog).getByLabelText(sl.admin.audit_note_required_label), {
			target: { value: 'Zaprto.' },
		});
		expect(remove.disabled).toBe(false);
		fireEvent.click(remove);
		await waitFor(() =>
			expect(client.calls.find((call) => call.method === 'DELETE')?.body).toEqual({ audit_note: 'Zaprto.' })
		);
	});

	it('runs the CSV import as a dry run, lists errors and keeps apply disabled until the file is clean', async () => {
		let errors = true;
		const client = renderDirectory({
			'POST /v1/admin/directory/import': ({ query }) =>
				query.dry_run ? (errors ? fx.importWithErrors : fx.importClean) : fx.importClean,
		});
		await table(d.tab_shelters);
		fireEvent.click(screen.getByRole('button', { name: d.import }));
		const dialog = await screen.findByRole('dialog', { name: d.import_title });
		const upload = () =>
			act(async () => {
				fireEvent.change(dialog.querySelector('input[type=file]')!, {
					target: { files: [new File(['slug,name\n'], 'imenik.csv', { type: 'text/csv' })] },
				});
			});

		await upload();
		expect(await within(dialog).findByText('1 nov vnos, 2 spremenjena, 0 odstranjenih, 2 napaki')).toBeTruthy();
		expect(within(dialog).getByText(`Vrstica 14: ${d.error_phone}`)).toBeTruthy();
		const apply = within(dialog).getByRole('button', { name: d.import_apply }) as HTMLButtonElement;
		expect(apply.disabled).toBe(true);
		expect(within(dialog).getByText(d.import_apply_blocked)).toBeTruthy();
		const changes = within(dialog).getByRole('table', { name: d.import_changes });
		expect(within(changes).getByText('01 234 56 78')).toBeTruthy();
		expect(within(changes).getByText(d.status_confirmed)).toBeTruthy();
		expect(client.calls.at(-1)).toMatchObject({ query: { dry_run: 'true' }, body: { csv: 'slug,name\n' } });

		errors = false;
		await upload();
		await waitFor(() =>
			expect(within(dialog).getByText('1 nov vnos, 2 spremenjena, 0 odstranjenih, 0 napak')).toBeTruthy()
		);
		fireEvent.click(within(dialog).getByRole('button', { name: d.import_apply }));
		expect(await screen.findByText(d.saved)).toBeTruthy();
		expect(client.calls.at(-1)?.query).toEqual({});
	});

	it('shows the history newest first with before and after, and restores an older version as a new one', async () => {
		const client = renderDirectory({
			'GET /v1/admin/shelters/:slug/changes': fx.shelterHistory,
			'PUT /v1/admin/shelters/:slug': ({ body }) => body,
		});
		await table(d.tab_shelters);
		openMenu('Zavetišče Lipa');
		fireEvent.click(await screen.findByRole('menuitem', { name: d.action_history }));
		const drawer = await screen.findByRole('dialog', { name: d.history_title });
		const versions = await within(drawer).findByRole('table', { name: d.history_title });
		expect(
			within(versions)
				.getAllByRole('row')
				.slice(1)
				.map((row) => row.textContent)
		).toEqual([
			expect.stringContaining('Rok Bizjak'),
			expect.stringContaining('Maja Kovač'),
			expect.stringContaining(`${d.history_system}${d.history_initial}`),
		]);
		expect(within(drawer).queryByRole('button', { name: d.history_restore })).toBeNull();

		fireEvent.click(within(versions).getByRole('button', { name: /13\. 10\. 2024/ }));
		const diff = within(drawer).getByRole('table', { name: /13\. 10\. 2024/ });
		expect(within(diff).getByRole('rowheader', { name: 'Delovni čas, pon–pet' })).toBeTruthy();
		expect(within(diff).getByText('8.00–16.00')).toBeTruthy();
		fireEvent.click(within(drawer).getByRole('button', { name: d.history_restore }));
		expect(await screen.findByText(d.history_restored)).toBeTruthy();
		expect(client.calls.find((call) => call.method === 'PUT')?.body).toMatchObject({
			phone_display: '01 234 56 70',
			version: 3,
		});
	});

	it('keeps confirmed and not confirmed explicit for municipalities', async () => {
		const client = renderDirectory({ 'PUT /v1/admin/municipality-shelters/:slug': ({ body }) => body });
		fireEvent.mouseDown(await screen.findByRole('tab', { name: d.tab_municipalities }), { button: 0 });
		const municipalities = await table(d.tab_municipalities);
		const bistrica = within(municipalities).getByRole('button', { name: 'Bistrica ob Sotli' }).closest('tr')!;
		expect(within(bistrica).getAllByText(d.status_unconfirmed)).toHaveLength(2);

		fireEvent.click(within(bistrica).getByRole('button', { name: 'Bistrica ob Sotli' }));
		const drawer = await screen.findByRole('dialog', { name: 'Bistrica ob Sotli' });
		expect(within(drawer).getByText(d.municipality_help)).toBeTruthy();
		expect((within(drawer).getByRole('radio', { name: d.status_confirmed }) as HTMLButtonElement).disabled).toBe(
			true
		);
		fireEvent.click(within(drawer).getByRole('button', { name: d.save }));
		await waitFor(() =>
			expect(client.calls.find((call) => call.method === 'PUT')?.body).toMatchObject({
				shelter_slug: null,
				status: 'UNCONFIRMED',
				version: 1,
			})
		);
	});

	it('shows the error note with retry when the lists fail', async () => {
		renderDirectory({ 'GET /v1/admin/shelters': () => mockError('FORBIDDEN') });
		expect(await screen.findByText(sl.admin.error)).toBeTruthy();
		expect(screen.getByRole('button', { name: sl.admin.retry })).toBeTruthy();
	});
});
