import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type * as React from 'react';
import { Provider } from 'react-redux';
import { toast } from 'sonner';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import * as fx from '@zivali/api/__fixtures__/ads';
import { createMockApi, type MockRoutes } from '@zivali/api/mock';
import { createApiStore } from '@zivali/api/rtk';
import en from '@zivali/i18n/dist/en.json';
import sl from '@zivali/i18n/dist/sl.json';
import { Toaster } from '@/components/ui/sonner';

import { AdDetail } from './ad-detail';
import { EditAd, NewAd } from './ad-form';
import { AdsAdmin } from './ads-admin';
import { HouseAds } from './house-ads';
import { MUNICIPALITIES } from './municipalities';

const nav = vi.hoisted(() => ({ push: vi.fn(), put: vi.fn() }));
vi.mock('next/navigation', async (actual) => ({
	...(await actual()),
	useRouter: () => ({ push: nav.push, replace: vi.fn(), prefetch: vi.fn() }),
	usePathname: () => '/admin/oglasi',
	useParams: () => ({ locale: 'sl' }),
}));
// The presigned PUT goes to storage, not to the API: its own stand-in.
vi.mock('@zivali/api/photos', () => ({ xhrPut: nav.put }));

// Radix popper and select content measure and scroll themselves; jsdom has neither.
globalThis.ResizeObserver ??= class {
	observe() {}
	unobserve() {}
	disconnect() {}
} as unknown as typeof ResizeObserver;
Element.prototype.scrollIntoView ??= () => {};
Element.prototype.hasPointerCapture ??= () => false;

const a = sl.admin;
const [running, scheduled, draft, ended] = fx.adminAds.items as [
	(typeof fx.adminAds.items)[0],
	(typeof fx.adminAds.items)[0],
	(typeof fx.adminAds.items)[0],
	(typeof fx.adminAds.items)[0],
];
const NEW_ID = 'ad7e1f2a-0000-4000-8000-0000000000aa';
const regions = { osrednjeslovenska: 'Osrednjeslovenska', gorenjska: 'Gorenjska', podravska: 'Podravska' };
const props = { regions, messages: { sl: sl.ads, en: en.ads } };

beforeEach(() => {
	vi.useFakeTimers({ now: new Date('2026-10-15T10:00:00Z'), toFake: ['Date'] });
	nav.push.mockReset();
	nav.put.mockReset().mockResolvedValue(undefined);
	URL.createObjectURL = vi.fn(() => 'blob:preview');
	URL.revokeObjectURL = vi.fn();
	globalThis.createImageBitmap = vi.fn(async () => ({ width: 1600, height: 1200, close() {} })) as never;
});
afterEach(() => {
	toast.dismiss();
	cleanup();
	vi.useRealTimers();
	vi.restoreAllMocks();
});

function renderWith(ui: React.ReactElement, routes: MockRoutes = {}, locale: 'sl' | 'en' = 'sl') {
	const client = createMockApi({ 'GET /v1/admin/ads': fx.adminAds, ...routes });
	const view = render(
		<NextIntlClientProvider locale={locale} messages={locale === 'en' ? en : sl} timeZone="Europe/Ljubljana">
			<Provider store={createApiStore(client)}>
				{ui}
				<Toaster closeLabel={sl.common.close} label={sl.common.toasts_label} />
			</Provider>
		</NextIntlClientProvider>
	);
	return { client, ...view };
}

/** A C1 VALIDATION body with issues, as the API answers a refused save. */
const refused = (issues: { path: string; message: string }[]) =>
	new Response(JSON.stringify({ error: { code: 'VALIDATION', message: 'Ad not allowed', issues } }), {
		status: 400,
		headers: { 'Content-Type': 'application/json' },
	});
const openMenu = (title: string) =>
	fireEvent.keyDown(screen.getAllByRole('button', { name: `${a.row_actions}: ${title}` })[0]!, { key: 'Enter' });
const choose = async (select: string, option: string) => {
	fireEvent.keyDown(screen.getByRole('combobox', { name: select }), { key: 'Enter' });
	fireEvent.keyDown(await screen.findByRole('option', { name: option }), { key: 'Enter' });
};
const group = (name: string, scope: HTMLElement = document.body) => within(scope).getByRole('group', { name });
const press = (groupName: string, pill: string, scope?: HTMLElement) =>
	fireEvent.click(within(group(groupName, scope)).getByRole('button', { name: pill }));
const type = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });

describe('ads list', () => {
	it('lists the sponsor ads with status word, slots, targeting and dates; the house ads are on their own page', async () => {
		renderWith(<AdsAdmin regions={regions} />);
		const table = await screen.findByRole('table', { name: a.ads_title });
		const row = (title: string) => within(table).getByRole('link', { name: title }).closest('tr')!;

		expect(within(row(running.title)).getByText(a.ads_status_running)).toBeTruthy();
		expect(within(row(scheduled.title)).getByText(a.ads_status_scheduled)).toBeTruthy();
		expect(within(row(draft.title)).getByText(a.ads_status_draft)).toBeTruthy();
		expect(within(row(ended.title)).getByText(a.ads_status_ended)).toBeTruthy();
		expect(within(row(running.title)).getByText('Stran prijave, Stranska vrstica')).toBeTruthy();
		expect(within(row(running.title)).getByText('Osrednjeslovenska, Gorenjska · Psi, Mačke')).toBeTruthy();
		expect(within(row(running.title)).getByText('1. 10. 2026 – 31. 10. 2026')).toBeTruthy();
		expect(within(row(draft.title)).getByText('Podravska, Občine: 1 · Psi')).toBeTruthy();
		expect(within(row(scheduled.title)).getByText(a.ads_targeting_all)).toBeTruthy();
		// The thumbnail carries the ad's own alt text.
		expect(within(row(running.title)).getByRole('img', { name: running.image_alt })).toBeTruthy();
		expect(within(row(running.title)).getByRole('link', { name: running.title }).getAttribute('href')).toBe(
			`/admin/oglasi/${running.id}`
		);
		expect(within(table).getAllByRole('row')).toHaveLength(5);
		expect(within(table).queryByText('Podprite Najdimo')).toBeNull();
	});

	it('filters by status on the loaded ads and clears the filters', async () => {
		renderWith(<AdsAdmin regions={regions} />);
		const table = await screen.findByRole('table', { name: a.ads_title });
		await choose(a.ads_col_status, a.ads_status_draft);
		expect(within(table).getAllByRole('row')).toHaveLength(2);
		expect(within(table).getByRole('link', { name: draft.title })).toBeTruthy();
		fireEvent.click(screen.getByRole('button', { name: a.filters_clear }));
		expect(within(table).getAllByRole('row')).toHaveLength(5);
	});

	it('shows the empty state with "Nov oglas" when there are no sponsor ads', async () => {
		renderWith(<AdsAdmin regions={regions} />, {
			'GET /v1/admin/ads': { items: fx.adminAds.items.filter((ad) => ad.is_house), next_cursor: null },
		});
		expect(await screen.findByText(a.ads_empty)).toBeTruthy();
		expect(screen.getByRole('link', { name: a.ads_new }).getAttribute('href')).toBe('/admin/oglasi/nov');
	});

	it('ends an ad after the confirmation and deletes one only with the audit note', async () => {
		const { client } = renderWith(<AdsAdmin regions={regions} />, {
			'POST /v1/admin/ads/:id/status': ({ body }) => ({ ...running, ...(body as object) }),
			'DELETE /v1/admin/ads/:id': () => undefined,
		});
		await screen.findByRole('table', { name: a.ads_title });

		openMenu(running.title);
		fireEvent.click(await screen.findByRole('menuitem', { name: a.ads_action_end }));
		const end = await screen.findByRole('alertdialog', { name: a.ads_end_title });
		fireEvent.click(within(end).getByRole('button', { name: a.ads_action_end }));
		await waitFor(() => expect(client.calls.some((call) => call.method === 'POST')).toBe(true));
		expect(await screen.findByText(a.saved_logged)).toBeTruthy();
		expect(client.calls.find((call) => call.method === 'POST')).toMatchObject({
			path: `/v1/admin/ads/${running.id}/status`,
			body: { status: 'ended' },
		});

		// A draft has nothing to end; an ended ad cannot be edited.
		openMenu(draft.title);
		expect(await screen.findByRole('menuitem', { name: a.ads_action_edit })).toBeTruthy();
		expect(screen.queryByRole('menuitem', { name: a.ads_action_end })).toBeNull();
		fireEvent.click(screen.getByRole('menuitem', { name: a.ads_action_delete }));
		const remove = await screen.findByRole('alertdialog', { name: a.ads_delete_title });
		const button = within(remove).getByRole('button', { name: a.ads_action_delete }) as HTMLButtonElement;
		expect(button.disabled).toBe(true);
		fireEvent.change(within(remove).getByLabelText(a.audit_note_required_label), {
			target: { value: 'Podvojen.' },
		});
		fireEvent.click(button);
		await waitFor(() =>
			expect(client.calls.find((call) => call.method === 'DELETE')).toMatchObject({
				path: `/v1/admin/ads/${draft.id}`,
				body: { note: 'Podvojen.' },
			})
		);
		openMenu(ended.title);
		expect(await screen.findByRole('menuitem', { name: a.ads_action_duplicate })).toBeTruthy();
		expect(screen.queryByRole('menuitem', { name: a.ads_action_edit })).toBeNull();
	});
});

describe('ad form', () => {
	it('checks on save, focuses the first problem and sends nothing', async () => {
		const { client } = renderWith(<NewAd {...props} />);
		fireEvent.click(screen.getByRole('button', { name: a.ads_save }));
		expect(await screen.findByText(a.ads_err_alt)).toBeTruthy();
		expect(screen.getByText(a.ads_err_slots)).toBeTruthy();
		expect(screen.getAllByText(a.ads_err_required)).toHaveLength(4); // title, text, button (SL and EN), link
		await waitFor(() => expect(document.activeElement).toBe(screen.getByLabelText(a.ads_alt)));
		expect(screen.getByLabelText(a.ads_alt).getAttribute('aria-invalid')).toBe('true');

		type(a.ads_link, 'http://repek.si');
		fireEvent.blur(screen.getByLabelText(a.ads_link));
		expect(await screen.findByText(a.ads_err_link)).toBeTruthy();
		expect(client.calls.some((call) => call.method !== 'GET')).toBe(false);
	});

	it('drops a problem as soon as the field is right, before the blur, and keeps it while still wrong', async () => {
		renderWith(<NewAd {...props} />);
		fireEvent.click(screen.getByRole('button', { name: a.ads_save }));
		expect(await screen.findByText(a.ads_err_alt)).toBeTruthy();
		const link = screen.getByLabelText(a.ads_link);
		type(a.ads_link, 'http://repek.si');
		expect(link.getAttribute('aria-invalid')).toBe('true');
		type(a.ads_link, 'https://repek.si/jesen');
		// The blur would remove the message under the next control's press and move it away from the pointer.
		expect(link.getAttribute('aria-invalid')).not.toBe('true');
		expect(screen.getAllByText(a.ads_err_required)).toHaveLength(3); // title, text, button (SL and EN)
	});

	it('saves the targeting, dates, status and exclusivity, then opens the ad', async () => {
		const { client } = renderWith(<NewAd {...props} />, {
			'POST /v1/admin/ads': ({ body }) => ({ ...draft, ...(body as object), id: NEW_ID }),
		});
		const form = screen.getByRole('button', { name: a.ads_save }).closest('form')!;
		type(a.ads_alt, 'Pes z igračo ob polni skodelici hrane');
		type(a.ads_title_label, 'Repek: jesenska akcija');
		type(a.ads_text_label, 'Brezplačna dostava do konca meseca.');
		type(a.ads_cta_label_required, 'Več o akciji');
		type(a.ads_link, 'https://repek.si/jesen');
		press(a.ads_slots, a.ads_slot_detail, form);
		press(a.ads_regions, 'Gorenjska', form);
		press(a.ads_species, a.ads_species_dogs, form);
		type(a.ads_municipalities, 'Kamnik');
		expect(screen.getByRole('button', { name: 'Odstrani: Kamnik' })).toBeTruthy();
		type(a.ads_start, '2026-11-01');
		type(a.ads_end, '2026-11-30');
		await choose(a.ads_status, a.ads_status_scheduled);
		fireEvent.click(screen.getByRole('checkbox', { name: a.ads_exclusive }));
		fireEvent.click(screen.getByRole('button', { name: a.ads_save }));

		await waitFor(() => expect(nav.push).toHaveBeenCalledWith(`/admin/oglasi/${NEW_ID}`));
		expect(screen.getByText(a.saved_logged)).toBeTruthy();
		const kamnik = MUNICIPALITIES.find(([, name]) => name === 'Kamnik')![0];
		expect(client.calls.find((call) => call.method === 'POST')?.body).toEqual({
			title: 'Repek: jesenska akcija',
			body: 'Brezplačna dostava do konca meseca.',
			cta: 'Več o akciji',
			link_url: 'https://repek.si/jesen',
			image_alt: 'Pes z igračo ob polni skodelici hrane',
			locales: ['sl', 'en'],
			slots: ['detail'],
			region_ids: [9],
			municipality_ids: [kamnik],
			species: ['dog'],
			starts_at: '2026-10-31T23:00:00.000Z',
			ends_at: '2026-11-30T23:00:00.000Z',
			status: 'active',
			exclusive: true,
		});
		expect(nav.push).toHaveBeenCalledWith(`/admin/oglasi/${NEW_ID}`);
	});

	it('previews the real unit from the form in every slot, SL and EN, light and dark, without a request', async () => {
		const { client } = renderWith(<NewAd {...props} />);
		type(a.ads_title_label, 'Repek');
		type(a.ads_text_label, 'Dostava.');
		const preview = screen.getByRole('complementary', { name: a.ads_preview });
		expect(within(preview).getByRole('group', { name: 'Oglas: Repek. Dostava. Več o tem' }).className).toContain(
			'min-h-[200px]'
		);
		press(a.ads_preview_slot, a.ads_slot_sidebar, preview);
		expect(within(preview).getByRole('group', { name: 'Oglas: Repek. Dostava. Več o tem' }).className).toContain(
			'min-h-[452px]'
		);
		press(a.ads_preview_slot, a.ads_slot_feed, preview);
		press(a.ads_languages, 'EN', preview);
		// The EN label; the button text is what will be saved (the SL default), so the feed row has none.
		const unit = within(preview).getByRole('group', { name: 'Ad: Repek. Dostava.' });
		expect(unit.closest('[lang]')?.getAttribute('lang')).toBe('en');
		press(a.ads_preview_theme, a.ads_preview_dark, preview);
		expect(unit.closest('[lang]')?.className).toContain('dark');
		expect(client.calls).toEqual([]);
	});

	it('names the field the server refused: words it does not allow, and the exclusive ad it overlaps', async () => {
		renderWith(<NewAd {...props} />, {
			'POST /v1/admin/ads': () =>
				refused([
					{ path: 'title', message: 'Ads may not sell, give away or rehome animals' },
					{ path: 'exclusive', message: `Overlaps the exclusive ad "${running.title}" (${running.id})` },
				]),
		});
		const form = screen.getByRole('button', { name: a.ads_save }).closest('form')!;
		type(a.ads_alt, 'Mladički na kavču');
		type(a.ads_title_label, 'Prodam mladičke');
		type(a.ads_text_label, 'Pokličite.');
		type(a.ads_cta_label_required, 'Pokličite');
		type(a.ads_link, 'https://example.test');
		press(a.ads_slots, a.ads_slot_detail, form);
		fireEvent.click(screen.getByRole('button', { name: a.ads_save }));

		expect(await screen.findByText(a.ads_err_blocked)).toBeTruthy();
		expect(screen.getByText(`V tem obdobju je to mesto že rezervirano za oglas: ${running.title}.`)).toBeTruthy();
		const title = screen.getByLabelText(a.ads_title_label);
		expect(title.getAttribute('aria-invalid')).toBe('true');
		await waitFor(() => expect(document.activeElement).toBe(title));
	});

	it.each([
		[
			'sl',
			'/admin/oglasi/ad7e1f2a-0000-4000-8000-0000000000aa/uredi',
			sl.admin,
			'Pes z igračo ob polni skodelici hrane',
		],
		['en', '/en/admin/ads/ad7e1f2a-0000-4000-8000-0000000000aa/edit', en.admin, 'A dog with a toy by a full bowl'],
	] as const)('moves the draft URL to the edit page after the first save (%s)', async (locale, url, m, alt) => {
		const replaceState = vi.spyOn(window.history, 'replaceState');
		const { container } = renderWith(
			<NewAd {...props} />,
			{ 'POST /v1/admin/ads': ({ body }) => ({ ...draft, ...(body as object), id: NEW_ID }) },
			locale
		);
		const form = container.querySelector('form')!;
		type(m.ads_alt, alt);
		type(m.ads_title_label, 'Repek');
		type(m.ads_text_label, 'Brezplačna dostava.');
		type(m.ads_cta_label_required, 'Več');
		type(m.ads_link, 'https://repek.si/jesen');
		press(m.ads_slots, m.ads_slot_detail, form);
		fireEvent.click(screen.getByRole('button', { name: m.ads_save }));
		await waitFor(() => expect(replaceState).toHaveBeenCalledWith(null, '', url));
		replaceState.mockRestore();
	});

	it('labels the button text optional with the default hint for one language, required for two', () => {
		const { container } = renderWith(<NewAd {...props} />);
		const form = container.querySelector('form')!;
		expect(screen.getByLabelText(a.ads_cta_label_required)).toBeTruthy();
		expect(screen.queryByText(a.ads_cta_help)).toBeNull();
		expect(screen.getByText(a.ads_cta_help_required)).toBeTruthy();
		press(a.ads_languages, 'EN', form);
		expect(screen.getByLabelText(a.ads_cta_label)).toBeTruthy();
		expect(screen.getByText(a.ads_cta_help)).toBeTruthy();
		expect(screen.queryByText(a.ads_cta_help_required)).toBeNull();
	});

	it('creates a new ad as a draft, uploads its image, then saves it with the image and status', async () => {
		const { client, container } = renderWith(<NewAd {...props} />, {
			'POST /v1/admin/ads': ({ body }) => ({ ...draft, ...(body as object), id: NEW_ID }),
			'POST /v1/admin/ads/:id/image': ({ params }) => ({
				upload: { url: 'https://uploads.example.test/put', method: 'PUT', headers: {}, expires_at: '' },
				image: `ads/${params.id}/${'a'.repeat(64)}.jpg`,
			}),
			'PUT /v1/admin/ads/:id': ({ body }) => ({ ...draft, ...(body as object), id: NEW_ID }),
		});
		const file = new File([new Uint8Array(2048)], 'repek.jpg', { type: 'image/jpeg' });
		await act(async () => {
			fireEvent.change(container.querySelector('input[type=file]')!, { target: { files: [file] } });
		});
		expect(await screen.findByText('repek.jpg')).toBeTruthy();
		expect(screen.getByText('JPG · 1600 × 1200 · 2 KB')).toBeTruthy();
		const form = screen.getByRole('button', { name: a.ads_save }).closest('form')!;
		fillForm(form);
		await choose(a.ads_status, a.ads_status_scheduled);
		fireEvent.click(screen.getByRole('button', { name: a.ads_save }));

		await waitFor(() => expect(nav.push).toHaveBeenCalledWith(`/admin/oglasi/${NEW_ID}`));
		expect(screen.getByText(a.saved_logged)).toBeTruthy();
		const writes = client.calls.filter((call) => call.method !== 'GET');
		expect(writes.map((call) => `${call.method} ${call.path}`)).toEqual([
			'POST /v1/admin/ads',
			`POST /v1/admin/ads/${NEW_ID}/image`,
			`PUT /v1/admin/ads/${NEW_ID}`,
		]);
		expect(writes[0]?.body).toMatchObject({ status: 'draft' });
		expect(writes[1]?.body).toEqual({
			sha256: expect.stringMatching(/^[0-9a-f]{64}$/),
			width: 1600,
			height: 1200,
			bytes: 2048,
			content_type: 'image/jpeg',
		});
		expect(nav.put).toHaveBeenCalledWith(expect.objectContaining({ method: 'PUT' }), file, {});
		expect(writes[2]?.body).toMatchObject({ image: `ads/${NEW_ID}/${'a'.repeat(64)}.jpg`, status: 'active' });
	});

	it('refuses an image in the wrong format before any upload', async () => {
		globalThis.createImageBitmap = vi.fn(async () => ({ width: 1600, height: 900, close() {} })) as never;
		const { client, container } = renderWith(<NewAd {...props} />);
		await act(async () => {
			fireEvent.change(container.querySelector('input[type=file]')!, {
				target: { files: [new File(['x'], 'wide.jpg', { type: 'image/jpeg' })] },
			});
		});
		expect(await screen.findByText(a.ads_err_image)).toBeTruthy();
		expect(screen.queryByText('wide.jpg')).toBeNull();
		expect(client.calls).toEqual([]);
	});

	it('keeps the created ad when the upload fails and retries without creating it again', async () => {
		nav.put.mockRejectedValueOnce(new Error('Upload failed'));
		const { client, container } = renderWith(<NewAd {...props} />, {
			'POST /v1/admin/ads': ({ body }) => ({ ...draft, ...(body as object), id: NEW_ID }),
			'POST /v1/admin/ads/:id/image': ({ params }) => ({
				upload: { url: 'https://uploads.example.test/put', method: 'PUT', headers: {}, expires_at: '' },
				image: `ads/${params.id}/${'b'.repeat(64)}.png`,
			}),
			'PUT /v1/admin/ads/:id': ({ body }) => ({ ...draft, ...(body as object), id: NEW_ID }),
		});
		await act(async () => {
			fireEvent.change(container.querySelector('input[type=file]')!, {
				target: { files: [new File(['png'], 'repek.png', { type: 'image/png' })] },
			});
		});
		fillForm(screen.getByRole('button', { name: a.ads_save }).closest('form')!);
		fireEvent.click(screen.getByRole('button', { name: a.ads_save }));
		expect(await screen.findByText(a.ads_upload_failed)).toBeTruthy();
		fireEvent.click(screen.getByRole('button', { name: a.retry }));

		await waitFor(() => expect(nav.push).toHaveBeenCalledWith(`/admin/oglasi/${NEW_ID}`));
		expect(screen.getByText(a.saved_logged)).toBeTruthy();
		const writes = client.calls.filter((call) => call.method !== 'GET').map((call) => call.method);
		expect(writes).toEqual(['POST', 'POST', 'POST', 'PUT']);
		expect(client.calls.filter((call) => call.path === '/v1/admin/ads' && call.method === 'POST')).toHaveLength(1);
	});

	it('asks before it drops unsaved changes', async () => {
		renderWith(<NewAd {...props} />);
		type(a.ads_title_label, 'Repek');
		fireEvent.click(screen.getByRole('button', { name: a.ads_cancel }));
		const dialog = await screen.findByRole('alertdialog', { name: sl.common.discard_title });
		fireEvent.click(within(dialog).getByRole('button', { name: sl.common.discard_confirm }));
		expect(nav.push).toHaveBeenCalledWith('/admin/oglasi');
	});

	it('shows an ended ad read only, with Duplicate; a duplicate starts as a draft copy without the image', async () => {
		renderWith(<EditAd id={ended.id} {...props} />);
		expect(await screen.findByText(a.ads_ended_note)).toBeTruthy();
		expect(screen.getByLabelText(a.ads_title_label).matches(':disabled')).toBe(true);
		expect(screen.queryByRole('button', { name: a.ads_save })).toBeNull();
		fireEvent.click(screen.getByRole('button', { name: a.ads_action_duplicate }));
		expect(nav.push).toHaveBeenCalledWith(`/admin/oglasi/nov?from=${ended.id}`);
		cleanup();

		renderWith(<NewAd from={running.id} {...props} />);
		expect(((await screen.findByLabelText(a.ads_title_label)) as HTMLInputElement).value).toBe(running.title);
		expect(screen.queryByRole('img', { name: running.image_alt })).toBeNull();
		expect(screen.getByRole('combobox', { name: a.ads_status }).textContent).toBe(a.ads_status_draft);
	});
});

/** The required fields of a sponsor ad, in `form`. */
function fillForm(form: HTMLElement) {
	type(a.ads_alt, 'Pes z igračo ob polni skodelici hrane');
	type(a.ads_title_label, 'Repek: jesenska akcija');
	type(a.ads_text_label, 'Brezplačna dostava do konca meseca.');
	type(a.ads_cta_label_required, 'Več o akciji');
	type(a.ads_link, 'https://repek.si/jesen');
	press(a.ads_slots, a.ads_slot_detail, form);
}

describe('ad detail', () => {
	it('shows the totals, the breakdowns with "< 5" and the history, and exports the rows as CSV', async () => {
		let csv: Blob | undefined;
		URL.createObjectURL = vi.fn((blob: Blob) => {
			csv = blob;
			return 'blob:csv';
		});
		const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
		const { client } = renderWith(<AdDetail id={running.id} regions={regions} />, {
			'GET /v1/admin/ads/:id/stats': fx.adStats,
			'GET /v1/admin/audit-log': fx.adHistory,
		});

		expect(await screen.findByRole('heading', { level: 1, name: running.title })).toBeTruthy();
		expect(await screen.findByText('1554')).toBeTruthy();
		expect(screen.getByText('2,1 %')).toBeTruthy();
		expect(client.calls.find((call) => call.path.endsWith('/stats'))?.query).toEqual({
			from: '2026-09-16',
			to: '2026-10-15',
		});

		const bySlot = screen.getByRole('table', { name: a.ads_by_slot });
		const sidebar = within(bySlot).getByText(a.ads_slot_sidebar).closest('tr')!;
		expect(sidebar.textContent).toBe(`${a.ads_slot_sidebar}214${a.ads_under_5}${a.ads_under_5_a11y}–`);
		const byRegion = screen.getByRole('table', { name: a.ads_by_region });
		expect(within(byRegion).getByText(a.ads_region_unknown).closest('tr')!.textContent).toContain(
			a.ads_under_5_a11y
		);
		expect(screen.getByRole('table', { name: a.ads_by_day })).toBeTruthy();
		expect(screen.getByText(a.ads_method)).toBeTruthy();

		const history = await screen.findByRole('table', { name: a.ads_history });
		expect(within(history).getByText('ad.update')).toBeTruthy();
		expect(client.calls.find((call) => call.path === '/v1/admin/audit-log')?.query).toMatchObject({
			target_type: 'ad',
			target_id: running.id,
		});

		fireEvent.click(screen.getByRole('button', { name: a.ads_export }));
		expect(click).toHaveBeenCalledTimes(1);
		expect((click.mock.contexts[0] as HTMLAnchorElement).download).toBe(`ad-ad7e1f2a-2026-09-16-2026-10-15.csv`);
		const bytes = new Uint8Array(
			await new Promise<ArrayBuffer>((resolve) => {
				const reader = new FileReader();
				reader.onload = () => resolve(reader.result as ArrayBuffer);
				reader.readAsArrayBuffer(csv!);
			})
		);
		// The UTF-8 byte order mark first, for Excel (TextDecoder drops it).
		expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
		expect(new TextDecoder().decode(bytes).split('\r\n')).toEqual([
			`${a.ads_col_day},${a.ads_preview_slot},${a.ads_col_region},${a.ads_col_impressions},${a.ads_col_clicks},${a.ads_col_ctr}`,
			'2026-10-13,Stran prijave,Osrednjeslovenska,640,16,0.0250',
			'2026-10-13,Stranska vrstica,Gorenjska,210,3,0.0143',
			'2026-10-14,Stran prijave,Osrednjeslovenska,700,14,0.0200',
			'2026-10-14,Stranska vrstica,Brez regije,4,0,0.0000',
			'',
		]);
	});

	it('offers edit, duplicate and end now for a running ad', async () => {
		renderWith(<AdDetail id={running.id} regions={regions} />, {
			'GET /v1/admin/ads/:id/stats': fx.adStats,
			'GET /v1/admin/audit-log': fx.adHistory,
		});
		expect((await screen.findByRole('link', { name: a.ads_action_edit })).getAttribute('href')).toBe(
			`/admin/oglasi/${running.id}/uredi`
		);
		expect(screen.getByRole('link', { name: a.ads_action_duplicate }).getAttribute('href')).toBe(
			`/admin/oglasi/nov?from=${running.id}`
		);
		fireEvent.click(screen.getByRole('button', { name: a.ads_action_end }));
		expect(await screen.findByRole('alertdialog', { name: a.ads_end_title })).toBeTruthy();
	});
});

describe('house ads', () => {
	const find = (id: string) => fx.adminAds.items.find((ad) => ad.id === id)!;

	it('lists the three kinds per language, enables one language at a time, and edits the creative only', async () => {
		const { client } = renderWith(<HouseAds {...props} />, {
			'POST /v1/admin/ads/:id/status': ({ params, body }) => ({ ...find(params.id!), ...(body as object) }),
			'PUT /v1/admin/ads/:id': ({ params, body }) => ({ ...find(params.id!), ...(body as object) }),
		});
		expect(await screen.findAllByRole('switch')).toHaveLength(6);
		const supportEn = screen.getByRole('switch', { name: `${a.house_enabled}: ${a.house_kind_support} (EN)` });
		expect(supportEn.getAttribute('aria-checked')).toBe('false');
		expect(screen.getByRole('switch', { name: `${a.house_enabled}: ${a.house_kind_support} (SL)` })).toBeTruthy();
		fireEvent.click(supportEn);
		await waitFor(() =>
			expect(client.calls.find((call) => call.method === 'POST')).toMatchObject({
				path: '/v1/admin/ads/00000000-0000-4000-a000-000000000102/status',
				body: { status: 'active' },
			})
		);

		fireEvent.click(screen.getByRole('button', { name: `${a.ads_action_edit}: ${a.house_kind_adopt} (SL)` }));
		const form = await screen.findByRole('form', { name: `${a.ads_action_edit}: Posvojite žival iz zavetišča` });
		expect(within(form).getByText(a.house_locked)).toBeTruthy();
		const locked = within(group(a.ads_slots, form)).getAllByRole('button');
		expect(locked.map((pill) => [pill.matches(':disabled'), pill.getAttribute('aria-pressed')])).toEqual(
			Array(4).fill([true, 'true'])
		);
		expect(within(form).queryByRole('group', { name: a.ads_regions })).toBeNull();
		fireEvent.change(within(form).getByLabelText(a.ads_title_label), {
			target: { value: 'Posvojite psa ali mačko' },
		});
		fireEvent.click(within(form).getByRole('button', { name: a.ads_save }));

		await waitFor(() => expect(client.calls.some((call) => call.method === 'PUT')).toBe(true));
		expect(screen.getAllByText(a.saved_logged).length).toBeGreaterThan(0);
		expect(client.calls.find((call) => call.method === 'PUT')).toMatchObject({
			path: '/v1/admin/ads/00000000-0000-4000-a000-000000000105',
		});
		expect(client.calls.find((call) => call.method === 'PUT')?.body).toEqual({
			title: 'Posvojite psa ali mačko',
			body: 'V zavetiščih po Sloveniji psi in mačke čakajo na nov dom.',
			cta: 'Poiščite zavetišče',
			link_url: 'https://najdimo.si/zavetisca',
			image_alt: 'Mačka v zavetišču gleda v kamero',
			slots: ['feed', 'detail', 'reunited', 'sidebar'],
		});
		await waitFor(() => expect(screen.queryByRole('form')).toBeNull());
	});
});
