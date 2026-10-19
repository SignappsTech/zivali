import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { Suspense, useEffect } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { me } from '@zivali/api/__fixtures__/me';
import { pet } from '@zivali/api/__fixtures__/pets';
import sl from '@zivali/i18n/dist/sl.json';
import { timeZone } from '@zivali/i18n/format';
import type { Pet } from '@zivali/types';

import { LostFlow } from './lost-flow';

// Radix radios measure themselves; jsdom has no ResizeObserver.
globalThis.ResizeObserver ??= class {
	observe() {}
	unobserve() {}
	disconnect() {}
} as unknown as typeof ResizeObserver;

const t = sl.report_lost;
type Emitted = {
	key: string;
	preview: string;
	photoId?: string;
	status: 'kept' | 'uploading' | 'uploaded' | 'failed';
};
const RAW_EXIF = { lat: 46.0489, lng: 14.4691 };
// What the LocationPicker hands back on Potrdi: its own coarsened point (C6), never the raw input.
const COARSE = { lat: 46.04902, lng: 14.46934 };

const api = vi.hoisted(() => ({
	pets: [] as Pet[],
	createReport: vi.fn(),
	updateReport: vi.fn(),
	getReport: vi.fn(),
	track: vi.fn(),
	consent: { analytics: true } as { analytics: boolean } | null,
	store: new Map<string, unknown>(),
	clearPhotoDraft: vi.fn(async () => {}),
	picker: {
		photos: [] as Emitted[],
		hold: undefined as boolean | undefined,
		saved: undefined as unknown,
		onChange: undefined as undefined | ((photos: Emitted[]) => void),
	},
	// Set in beforeEach (a hoisted block cannot use the imported fixture).
	auth: {} as { gate: string; me: object | null; isVerified: boolean },
	gate: {
		onOpenChange: undefined as undefined | ((open: boolean) => void),
		onReady: undefined as undefined | (() => void),
	},
	exif: undefined as undefined | ((exif: { lat?: number; lng?: number }) => void),
	suggested: undefined as unknown,
	mutation: (fn: (arg: unknown) => unknown) => () => [(arg: unknown) => ({ unwrap: async () => fn(arg) })],
}));
vi.mock('@zivali/api/auth', () => ({ useRequireAuth: () => api.auth }));
// The P16 dialog (gate.tsx, own tests): its title and body when open; the test plays its close and onReady.
vi.mock('@/components/auth/gate', () => ({
	AuthGate: ({
		open,
		title,
		body,
		onOpenChange,
		onReady,
	}: {
		open: boolean;
		title: string;
		body: string;
		onOpenChange: (open: boolean) => void;
		onReady: () => void;
	}) => {
		Object.assign(api.gate, { onOpenChange, onReady });
		return open ? (
			<div role="dialog" aria-label={title}>
				<p>{body}</p>
			</div>
		) : null;
	},
}));
// The confirmation has its own tests: here it shows what the flow hands it.
vi.mock('./lost-done', () => ({
	LostDone: ({
		titleClass: _,
		testMode: _test,
		payments: _payments,
		...props
	}: {
		titleClass: string;
		testMode?: boolean;
		payments?: boolean;
	}) => (
		<>
			<h1>{sl.report_lost.done_title}</h1>
			<p data-testid="done">{JSON.stringify(props)}</p>
		</>
	),
}));
vi.mock('@zivali/api/pets', () => ({
	useListPetsQuery: () => ({ data: { items: api.pets }, isLoading: false }),
}));
vi.mock('@zivali/api/reports', () => ({
	useCreateReportMutation: api.mutation((arg) => api.createReport(arg)),
	useUpdateReportMutation: api.mutation((arg) => api.updateReport(arg)),
	reportsApi: {
		endpoints: {
			getReport: { useLazyQuery: () => [(arg: unknown) => ({ unwrap: async () => api.getReport(arg) })] },
		},
	},
}));
vi.mock('@zivali/api/geocode', () => ({
	useReversePlaceQuery: () => ({ currentData: { label: 'Šiška, Ljubljana' } }),
}));
// AI off (C19): no attributes polling; the pre-fill has its own tests (use-prefill.test.tsx).
vi.mock('@zivali/api/config', () => ({ useGetPublicConfigQuery: () => ({ data: { 'ai.enabled': false } }) }));
vi.mock('@zivali/api/photos', () => ({
	useGetPhotoAttributesQuery: () => ({ currentData: undefined, isError: false, refetch: vi.fn() }),
}));
vi.mock('@zivali/analytics', () => ({ track: api.track, getConsent: () => api.consent }));
vi.mock('idb-keyval', () => ({
	get: async (key: string) => api.store.get(key),
	set: async (key: string, value: unknown) => void api.store.set(key, value),
	del: async (key: string) => void api.store.delete(key),
}));
vi.mock('@/components/photos/use-photo-uploads', () => ({ clearPhotoDraft: api.clearPhotoDraft, MAX_PHOTOS: 5 }));
// PhotoPicker and LocationPicker have their own tests: here they report what the test sets, as the real ones do.
vi.mock('@/components/photos/photo-picker', () => ({
	PhotoPicker: ({
		onChange,
		onExif,
		hold,
		saved,
	}: {
		onChange: (photos: Emitted[]) => void;
		onExif: (exif: { lat?: number; lng?: number }) => void;
		hold?: boolean;
		saved?: unknown;
	}) => {
		api.picker.onChange = onChange;
		api.picker.hold = hold;
		api.picker.saved = saved;
		api.exif = onExif;
		useEffect(() => onChange(api.picker.photos), []); // eslint-disable-line react-hooks/exhaustive-deps
		return null;
	},
}));
vi.mock('@/components/location/location-picker', () => ({
	LocationPicker: ({
		suggested,
		onChange,
	}: {
		suggested?: unknown;
		onChange: (value: { point: { lat: number; lng: number }; radiusM: number; source: string }) => void;
	}) => {
		api.suggested = suggested;
		return (
			<>
				<h1>{sl.location.title_lost}</h1>
				<button type="button" onClick={() => onChange({ point: COARSE, radiusM: 1000, source: 'exif' })}>
					{sl.location.confirm}
				</button>
			</>
		);
	},
}));

const uploaded: Emitted = { key: 'k1', preview: 'blob:1', photoId: 'photo-1', status: 'uploaded' };

// next/dynamic as the App Router build aliases it (Suspense-based), not the Pages Router loader the package exports.
vi.mock('next/dynamic', async () => ({ default: (await import('next/dist/shared/lib/app-dynamic')).default }));

/** Stands in for the page's Suspense: a lazy part without its own boundary would blank the whole page while it loads. */
let blanked = false;
function PageFallback() {
	blanked = true;
	return null;
}

function show(props: Partial<React.ComponentProps<typeof LostFlow>> = {}) {
	const ui = (more: typeof props) => (
		<NextIntlClientProvider locale="sl" messages={sl} timeZone={timeZone}>
			<Suspense fallback={<PageFallback />}>
				<LostFlow signedIn {...more} />
			</Suspense>
		</NextIntlClientProvider>
	);
	const view = render(ui(props));
	return { rerender: () => view.rerender(ui(props)) };
}
const done = () => JSON.parse(screen.getByTestId('done').textContent!);
const button = (name: string | RegExp) => screen.getByRole('button', { name });
const click = (name: string | RegExp) => fireEvent.click(button(name));
const heading = (name: string) => screen.findByRole('heading', { level: 1, name });
/** The details step's fields load with the step (next/dynamic, TASK-112). */
const species = () => screen.findByRole('radiogroup', { name: sl.pets.species_label });
const bars = () => screen.getByRole('progressbar').getAttribute('aria-label');
const photosUp = (photos: Emitted[] = [uploaded]) => act(() => api.picker.onChange!(photos));
/** Enter in a text field as browsers do it (implicit submission): a click on the form's first submit button. */
const enter = (field: HTMLElement) =>
	fireEvent.click(
		(field as HTMLInputElement).form!.querySelector(
			'button:not([type]), button[type="submit"], input[type="submit"]'
		)!
	);

/** Without saved pets, from the first step to the review: photos, Pes in Rjava, the picker's point, now, no reward. */
async function toReview() {
	await heading(t.photos_title);
	photosUp();
	click(t.next);
	await heading(t.details_title);
	fireEvent.click(within(await species()).getByRole('radio', { name: 'Pes' }));
	fireEvent.click(screen.getByRole('button', { name: 'Rjava' }));
	click(t.next);
	await heading(sl.location.title_lost);
	click(sl.location.confirm);
	await heading(t.when_title);
	click(t.next);
	await heading(t.circumstances_title);
	click(t.next);
	await heading(t.review_title);
}

beforeEach(() => {
	blanked = false;
	vi.useFakeTimers({ toFake: ['Date'] });
	vi.setSystemTime(new Date(2026, 9, 16, 14, 20));
	api.pets = [];
	api.picker.photos = [];
	api.consent = { analytics: true };
	api.auth = { gate: 'ok', me, isVerified: true };
	api.store.clear();
	api.createReport.mockResolvedValue({ id: 'r1', short_code: 'Hk3vT9qP', moderation_state: 'visible', warnings: [] });
	api.updateReport.mockResolvedValue({ short_code: 'Pq7xYz12' });
	api.getReport.mockResolvedValue({
		species: 'dog',
		region_slug: 'osrednjeslovenska',
		municipality_slug: 'ljubljana',
	});
});
afterEach(() => {
	cleanup();
	vi.clearAllMocks();
	vi.useRealTimers();
	window.history.replaceState(null, '', '/');
	expect(blanked, 'a lazy part suspended to the page and blanked it').toBe(false);
});

describe('LostFlow', () => {
	it('walks a new pet through six steps and publishes once, with the coarsened point (AC#1, AC#2, AC#3)', async () => {
		show();
		expect(api.track).toHaveBeenCalledWith('report_lost_start');
		// Without saved pets there is nothing to choose: the photos come first, and the bars count the real steps.
		await heading(t.photos_title);
		expect(screen.queryByText(t.pet_title)).toBeNull();
		expect(bars()).toBe('Korak 1 od 6');
		expect(screen.queryByRole('button', { name: t.back })).toBeNull();

		click(t.next);
		expect(await screen.findByText(t.photos_required)).toBeTruthy();
		photosUp();
		click(t.next);

		await heading(t.details_title);
		expect(document.activeElement).toBe(screen.getByRole('heading', { level: 1 }));
		await species();
		click(t.next);
		expect(await screen.findByText(t.validation_summary)).toBeTruthy();
		expect(screen.getByText(t.colour_required)).toBeTruthy();
		fireEvent.click(within(await species()).getByRole('radio', { name: 'Pes' }));
		fireEvent.click(screen.getByRole('button', { name: 'Rjava' }));
		fireEvent.change(screen.getByRole('textbox', { name: sl.pets.name_label }), { target: { value: 'Medo' } });
		// Enter in the name field advances like Naprej.
		enter(screen.getByRole('textbox', { name: sl.pets.name_label }));

		// The picker loads with its step (TASK-112); focus still lands on its heading once it is there.
		const where = await heading(sl.location.title_lost);
		await waitFor(() => expect(document.activeElement).toBe(where));
		expect(bars()).toBe('Korak 3 od 6');
		click(sl.location.confirm);

		await heading(t.when_title);
		expect(screen.getByRole('radio', { name: t.when_now }).getAttribute('aria-checked')).toBe('true');
		click(t.next);

		await heading(t.circumstances_title);
		expect(screen.getByRole('radio', { name: new RegExp(t.contact_chat) }).getAttribute('aria-checked')).toBe(
			'true'
		);
		fireEvent.change(screen.getByRole('textbox', { name: t.circumstances_label }), {
			target: { value: 'Ob bajerju ga je prestrašil kolesar.' },
		});
		click(t.next);

		await heading(t.review_title);
		expect(screen.getByText('Medo')).toBeTruthy();
		expect(screen.getByText(/Šiška, Ljubljana/)).toBeTruthy();
		expect(screen.getByText(t.review_reward_none)).toBeTruthy();
		expect(button(`${t.review_edit}: ${t.review_place}`)).toBeTruthy();
		expect(document.querySelector('[data-ad-slot]')).toBeNull();

		click(t.publish);
		const confirmation = await heading(t.done_title);
		await waitFor(() => expect(document.activeElement).toBe(confirmation));
		expect(done()).toEqual({
			code: 'Hk3vT9qP',
			name: 'Medo',
			species: 'dog',
			point: COARSE,
			unverified: false,
		});
		expect(api.createReport).toHaveBeenCalledTimes(1);
		const { body, idempotencyKey } = api.createReport.mock.calls[0]![0];
		expect(idempotencyKey).toMatch(/^[0-9a-f-]{36}$/);
		expect(body).toMatchObject({
			type: 'lost',
			species: 'dog',
			name: 'Medo',
			colours: ['brown'],
			location: COARSE,
			requested_radius_m: 1000,
			event_at: new Date(2026, 9, 16, 14, 20).toISOString(),
			circumstances: 'Ob bajerju ga je prestrašil kolesar.',
			contact_pref: 'chat_only',
			reward_eur: null,
			reward_note: null,
			photo_ids: ['photo-1'],
		});
		// Analytics with consent only, and only the registered params.
		await waitFor(() =>
			expect(api.track).toHaveBeenCalledWith('report_lost_submit', {
				report_type: 'lost',
				species: 'dog',
				region: 'osrednjeslovenska',
				municipality: 'ljubljana',
			})
		);
		expect(api.store.size).toBe(0);
		expect(api.clearPhotoDraft).toHaveBeenCalledWith('lost');
	});

	it('sends nothing to analytics on submit without consent', async () => {
		api.consent = null;
		show();
		await toReview();
		click(t.publish);
		await heading(t.done_title);
		expect(api.getReport).not.toHaveBeenCalled();
		expect(api.track).not.toHaveBeenCalledWith('report_lost_submit', expect.anything());
	});

	it('offers a photo place only as the picker suggestion; the body carries what the picker confirmed (AC#6)', async () => {
		show();
		await heading(t.photos_title);
		act(() => api.exif!(RAW_EXIF));
		photosUp();
		click(t.next);
		await heading(t.details_title);
		fireEvent.click(within(await species()).getByRole('radio', { name: 'Pes' }));
		fireEvent.click(screen.getByRole('button', { name: 'Rjava' }));
		click(t.next);
		await heading(sl.location.title_lost);
		expect(api.suggested).toEqual({ ...RAW_EXIF, source: 'exif' });
		click(sl.location.confirm);
		await heading(t.when_title);
		// The draft holds the confirmed (coarsened) point, never the photo's.
		expect(JSON.stringify([...api.store.values()])).not.toContain(String(RAW_EXIF.lat));
		expect(JSON.stringify([...api.store.values()])).toContain(String(COARSE.lat));
	});

	it('repeats key and body after a network failure, and takes a new key after an edit (C1)', async () => {
		api.createReport.mockRejectedValueOnce({ status: 0, data: { code: 'NETWORK', message: 'offline' } });
		api.createReport.mockRejectedValueOnce({ status: 0, data: { code: 'NETWORK', message: 'offline' } });
		show();
		await toReview();
		click(t.publish);
		expect(await screen.findByText(t.send_failed)).toBeTruthy();
		vi.setSystemTime(new Date(2026, 9, 16, 14, 25));
		click(t.publish);
		await waitFor(() => expect(api.createReport).toHaveBeenCalledTimes(2));
		const [first, second] = api.createReport.mock.calls.map(([arg]) => arg);
		expect(second).toEqual(first);

		click(`${t.review_edit}: ${t.review_contact}`);
		await heading(t.circumstances_title);
		fireEvent.change(screen.getByRole('textbox', { name: t.circumstances_label }), { target: { value: 'Novo.' } });
		click(t.next);
		await heading(t.review_title);
		click(t.publish);
		await heading(t.done_title);
		const third = api.createReport.mock.calls[2]![0];
		expect(third.idempotencyKey).not.toBe(first.idempotencyKey);
		expect(third.body.circumstances).toBe('Novo.');
	});

	it('maps CONTACT_DATA on the reward note back to its field, input kept (AC#2, AC#5)', async () => {
		api.createReport.mockRejectedValueOnce({
			status: 422,
			data: { code: 'VALIDATION', message: 'x', issues: [{ path: 'reward_note', message: 'CONTACT_DATA' }] },
		});
		show();
		await toReview();
		click(`${t.review_edit}: ${t.review_reward}`);
		await heading(t.circumstances_title);
		fireEvent.click(screen.getByRole('switch', { name: t.reward_toggle }));
		expect(screen.getByText(t.reward_warning)).toBeTruthy();
		const note = screen.getByRole('textbox', { name: t.reward_note_label });
		fireEvent.change(note, { target: { value: 'Tudi za podatek' } });
		click(t.next);
		await heading(t.review_title);
		click(t.publish);

		await heading(t.circumstances_title);
		expect(await screen.findByText(t.reward_note_contact_data)).toBeTruthy();
		expect((screen.getByRole('textbox', { name: t.reward_note_label }) as HTMLInputElement).value).toBe(
			'Tudi za podatek'
		);
	});

	it('checks the reward on the device: contact data, one of amount or note, whole euros (AC#5)', async () => {
		show();
		await toReview();
		click(`${t.review_edit}: ${t.review_reward}`);
		await heading(t.circumstances_title);
		fireEvent.click(screen.getByRole('switch', { name: t.reward_toggle }));
		click(t.next);
		expect(await screen.findByText(t.reward_empty)).toBeTruthy();
		fireEvent.change(screen.getByRole('textbox', { name: t.reward_note_label }), {
			target: { value: 'Pokličite me na 041 123 456' },
		});
		expect(await screen.findByText(t.reward_note_contact_data)).toBeTruthy();
		fireEvent.change(screen.getByRole('textbox', { name: t.reward_note_label }), { target: { value: '' } });
		fireEvent.change(screen.getByRole('textbox', { name: t.reward_amount_label }), { target: { value: '12,5' } });
		expect(await screen.findByText(t.reward_amount_invalid)).toBeTruthy();
		fireEvent.change(screen.getByRole('textbox', { name: t.reward_amount_label }), { target: { value: '100' } });
		click(t.next);
		await heading(t.review_title);
		expect(screen.getByText('100 €')).toBeTruthy();
	});

	it('warns about a date older than 30 days and rejects a future one', async () => {
		show();
		await toReview();
		click(`${t.review_edit}: ${t.review_time}`);
		await heading(t.when_title);
		fireEvent.click(screen.getByRole('radio', { name: t.when_other }));
		fireEvent.change(screen.getByLabelText(t.when_date), { target: { value: '2026-09-01' } });
		expect(await screen.findByText(t.when_old)).toBeTruthy();
		fireEvent.change(screen.getByLabelText(t.when_date), { target: { value: '2026-10-17' } });
		click(t.next);
		expect(await screen.findByText(t.when_future)).toBeTruthy();
	});

	it('with a saved pet skips the details and offers to update the open search on DUPLICATE_OPEN_REPORT', async () => {
		api.pets = [pet];
		api.createReport.mockRejectedValueOnce({
			status: 409,
			data: { code: 'DUPLICATE_OPEN_REPORT', message: 'x', details: { short_code: 'Pq7xYz12' } },
		});
		show({ initialPet: pet.id });
		await heading(t.pet_title);
		// The `?pet=` link marks its pet; one press on the row goes on (no Naprej on this step).
		expect(button(`${pet.name} · Pes`).getAttribute('aria-current')).toBe('true');
		expect(screen.queryByRole('button', { name: t.next })).toBeNull();
		expect(bars()).toBe('Korak 1 od 6');
		click(`${pet.name} · Pes`);
		await heading(t.photos_title);
		// The pet's photos are listed first and go on the report too (TASK-114.5).
		expect(api.picker.saved).toEqual(pet.photos);
		photosUp();
		click(t.next);
		await heading(sl.location.title_lost);
		click(sl.location.confirm);
		await heading(t.when_title);
		click(t.next);
		await heading(t.circumstances_title);
		click(t.next);
		await heading(t.review_title);
		click(t.publish);

		expect(await screen.findByText(t.duplicate_title)).toBeTruthy();
		expect(api.createReport.mock.calls[0]![0].body).toMatchObject({ pet_id: pet.id, species: 'dog' });
		expect(screen.getByRole('radio', { name: t.duplicate_update }).getAttribute('aria-checked')).toBe('true');
		click(t.publish);
		await heading(t.done_title);
		expect(api.updateReport).toHaveBeenCalledWith(
			expect.objectContaining({ code: 'Pq7xYz12', body: expect.objectContaining({ photo_ids: ['photo-1'] }) })
		);
		// Only a created report is a report_lost_submit.
		expect(api.getReport).not.toHaveBeenCalled();
	});

	it('creates a new report with the pet inline when the owner chooses so after a 409', async () => {
		api.pets = [pet];
		api.createReport.mockRejectedValueOnce({
			status: 409,
			data: { code: 'DUPLICATE_OPEN_REPORT', message: 'x', details: { short_code: 'Pq7xYz12' } },
		});
		show({ initialPet: pet.id });
		await heading(t.pet_title);
		click(`${pet.name} · Pes`);
		await heading(t.photos_title);
		photosUp();
		click(t.next);
		await heading(sl.location.title_lost);
		click(sl.location.confirm);
		await heading(t.when_title);
		click(t.next);
		await heading(t.circumstances_title);
		click(t.next);
		await heading(t.review_title);
		click(t.publish);
		await screen.findByText(t.duplicate_title);
		fireEvent.click(screen.getByRole('radio', { name: t.duplicate_new }));
		click(t.publish);
		await heading(t.done_title);
		const second = api.createReport.mock.calls[1]![0];
		expect(second.body).not.toHaveProperty('pet_id');
		expect(second.body).toMatchObject({ name: pet.name, colours: pet.colours });
		expect(second.idempotencyKey).not.toBe(api.createReport.mock.calls[0]![0].idempotencyKey);
	});

	it('sends the owner to the photos step with a retry-or-remove message when a photo failed', async () => {
		show();
		await toReview();
		photosUp([{ key: 'k1', preview: 'blob:1', status: 'failed' }]);
		click(t.publish);
		await heading(t.photos_title);
		expect(screen.getByText(t.photos_failed)).toBeTruthy();
		expect(api.createReport).not.toHaveBeenCalled();
	});

	it('does not drop a failed photo when another one uploaded', async () => {
		show();
		await toReview();
		photosUp([uploaded, { key: 'k2', preview: 'blob:2', status: 'failed' }]);
		click(t.publish);
		await heading(t.photos_title);
		expect(api.createReport).not.toHaveBeenCalled();
	});

	it('takes a new key and the new event_at when only the time was edited after a network failure', async () => {
		api.createReport.mockRejectedValueOnce({ status: 0, data: { code: 'NETWORK', message: 'offline' } });
		show();
		await toReview();
		click(t.publish);
		await screen.findByText(t.send_failed);
		click(`${t.review_edit}: ${t.review_time}`);
		await heading(t.when_title);
		fireEvent.click(screen.getByRole('radio', { name: t.when_other }));
		fireEvent.change(screen.getByLabelText(t.when_date), { target: { value: '2026-10-15' } });
		fireEvent.change(screen.getByLabelText(t.when_time), { target: { value: '10:00' } });
		click(t.next);
		await heading(t.review_title);
		click(t.publish);
		await heading(t.done_title);
		const [first, second] = api.createReport.mock.calls.map(([arg]) => arg);
		expect(second.idempotencyKey).not.toBe(first.idempotencyKey);
		expect(second.body.event_at).toBe(new Date(2026, 9, 15, 10, 0).toISOString());
	});

	it.each([
		['a gateway 502', { status: 502, data: { code: 'INTERNAL', message: 'bad gateway' } }],
		['a 429', { status: 429, data: { code: 'RATE_LIMITED', message: 'x', details: { retry_after_s: 90 } } }],
		[
			'a 409 CONFLICT (the same key still in progress, C1)',
			{ status: 409, data: { code: 'CONFLICT', message: 'x' } },
		],
	])('keeps the key after %s, so the retry cannot create a second report', async (_name, failure) => {
		api.createReport.mockRejectedValueOnce(failure);
		show();
		await toReview();
		click(t.publish);
		await screen.findByRole('alert');
		click(t.publish);
		await heading(t.done_title);
		const [first, second] = api.createReport.mock.calls.map(([arg]) => arg);
		expect(second.idempotencyKey).toBe(first.idempotencyKey);
		expect(second.body).toEqual(first.body);
	});

	it('takes a new key after a definitive refusal', async () => {
		api.createReport.mockRejectedValueOnce({ status: 403, data: { code: 'FORBIDDEN', message: 'x' } });
		show();
		await toReview();
		click(t.publish);
		await screen.findByRole('alert');
		click(t.publish);
		await heading(t.done_title);
		const [first, second] = api.createReport.mock.calls.map(([arg]) => arg);
		expect(second.idempotencyKey).not.toBe(first.idempotencyKey);
	});

	it('names the wait in minutes on RATE_LIMITED with retry_after_s', async () => {
		api.createReport.mockRejectedValueOnce({
			status: 429,
			data: { code: 'RATE_LIMITED', message: 'x', details: { retry_after_s: 100 } },
		});
		show();
		await toReview();
		click(t.publish);
		expect(await screen.findByText(/čez 2 minuti/)).toBeTruthy();
	});

	it('sends a VALIDATION on photo_ids to the photos step, and one on species to the details step', async () => {
		api.createReport.mockRejectedValueOnce({
			status: 422,
			data: { code: 'VALIDATION', message: 'x', issues: [{ path: 'photo_ids', message: 'INVALID' }] },
		});
		api.createReport.mockRejectedValueOnce({
			status: 422,
			data: { code: 'VALIDATION', message: 'x', issues: [{ path: 'species', message: 'INVALID' }] },
		});
		show();
		await toReview();
		click(t.publish);
		await heading(t.photos_title);
		// Never a silent jump (TASK-114.5): the step says what went wrong.
		expect(screen.getByRole('alert').textContent).toBe(sl.photos.rejected);
		click(t.next);
		await heading(t.review_title);
		click(t.publish);
		await heading(t.details_title);
		expect(screen.queryByText(sl.photos.rejected)).toBeNull();
	});

	it('names the 5-photo limit on the photos step when photo_ids is refused with more than 5', async () => {
		api.createReport.mockRejectedValueOnce({
			status: 400,
			data: { code: 'VALIDATION', message: 'x', issues: [{ path: 'photo_ids', message: 'Too big' }] },
		});
		show();
		await toReview();
		photosUp(Array.from({ length: 6 }, (_, i) => ({ ...uploaded, key: `k${i}`, photoId: `photo-${i}` })));
		click(t.publish);
		await heading(t.photos_title);
		expect(screen.getByRole('alert').textContent).toBe(sl.photos.limit);
	});

	it('starts one publish for a double click', async () => {
		let release!: (value: unknown) => void;
		api.createReport.mockReturnValueOnce(new Promise((resolve) => (release = resolve)));
		show();
		await toReview();
		const publish = button(t.publish);
		fireEvent.click(publish);
		fireEvent.click(publish);
		await waitFor(() => expect(api.createReport).toHaveBeenCalledTimes(1));
		release({ id: 'r1', short_code: 'Hk3vT9qP', moderation_state: 'visible', warnings: [] });
		await heading(t.done_title);
		expect(api.createReport).toHaveBeenCalledTimes(1);
	});

	it('keeps Publish closed once the report is created, until the confirmation shows (one POST)', async () => {
		let cleared!: () => void;
		api.clearPhotoDraft.mockImplementationOnce(() => new Promise<void>((resolve) => (cleared = resolve)));
		show();
		await toReview();
		const form = screen.getByRole('heading', { level: 1, name: t.review_title }).closest('form')!;
		click(t.publish);
		// The POST has answered: the flow is clearing the draft on its way to the confirmation.
		await waitFor(() => expect(api.clearPhotoDraft).toHaveBeenCalled());
		cleared();
		// The send has returned and React has not shown the confirmation yet (microtasks only): a second press now.
		for (let i = 0; i < 20; i++) await Promise.resolve();
		form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
		await heading(t.done_title);
		await new Promise((resolve) => setTimeout(resolve, 20));
		expect(api.createReport).toHaveBeenCalledTimes(1);
	});

	it('forgets the open search found for one pet when another pet is chosen', async () => {
		const other = { ...pet, id: 'pet-2', name: 'Muri' };
		api.pets = [pet, other];
		api.createReport.mockRejectedValueOnce({
			status: 409,
			data: { code: 'DUPLICATE_OPEN_REPORT', message: 'x', details: { short_code: 'Pq7xYz12' } },
		});
		// Another pet re-seeds the picker, which restores the draft's photos (here: what it reports on mount).
		api.picker.photos = [uploaded];
		show({ initialPet: pet.id });
		await heading(t.pet_title);
		click(`${pet.name} · Pes`);
		await heading(t.photos_title);
		click(t.next);
		await heading(sl.location.title_lost);
		click(sl.location.confirm);
		await heading(t.when_title);
		click(t.next);
		await heading(t.circumstances_title);
		click(t.next);
		await heading(t.review_title);
		click(t.publish);
		await screen.findByText(t.duplicate_title);

		click(`${t.review_edit}: ${t.review_pet}`);
		await heading(t.pet_title);
		click(`${other.name} · Pes`);
		await heading(t.review_title);
		expect(screen.queryByText(t.duplicate_title)).toBeNull();
		click(t.publish);
		await heading(t.done_title);
		expect(api.updateReport).not.toHaveBeenCalled();
		expect(api.createReport.mock.calls[1]![0].body).toMatchObject({ pet_id: 'pet-2' });
	});

	it.each([
		['without saved pets', [], 'Korak 4 od 6'],
		['with saved pets (the pet step counts)', [pet], 'Korak 5 od 7'],
	])('offers to resume a saved draft at its step, %s', async (_name, pets, step) => {
		api.pets = pets;
		api.store.set('draft:lost:lost', {
			step: 'when',
			values: { pet: 'new', species: 'cat', colours: ['black'], when: 'now', date: '', time: '' },
			at: new Date(2026, 9, 15).getTime(),
		});
		show();
		expect(await screen.findByText(t.resume_title)).toBeTruthy();
		click(t.resume_continue);
		await heading(t.when_title);
		expect(bars()).toBe(step);
		expect(screen.getByText(t.draft_saved)).toBeTruthy();
	});

	it('with saved pets asks first: one press on a row goes on, and the choice is marked on the way back', async () => {
		api.pets = [pet];
		show();
		await heading(t.pet_title);
		const other = new RegExp(`^${t.pet_other}`);
		// Buttons, not radios: arrow keys never move on, Enter and Space press the row.
		expect(screen.queryByRole('radio')).toBeNull();
		expect(screen.getByRole('group', { name: t.pet_title })).toBeTruthy();
		expect(button(other).getAttribute('aria-current')).toBeNull();
		expect(bars()).toBe('Korak 1 od 7');

		fireEvent.click(button(other));
		await heading(t.photos_title);
		expect(document.activeElement).toBe(screen.getByRole('heading', { level: 1 }));
		expect(bars()).toBe('Korak 2 od 7');
		click(t.back);
		await heading(t.pet_title);
		expect(document.activeElement).toBe(screen.getByRole('heading', { level: 1 }));
		expect(button(other).getAttribute('aria-current')).toBe('true');
		expect(button(`${pet.name} · Pes`).getAttribute('aria-current')).toBeNull();

		click(`${pet.name} · Pes`);
		await heading(t.photos_title);
		expect(bars()).toBe('Korak 2 od 6');
		await waitFor(() =>
			expect(api.store.get('draft:lost:lost')).toMatchObject({ step: 'photos', values: { pet: pet.id } })
		);
	});

	it('asks nothing until the saved pets are in, then starts at the step that applies', async () => {
		api.auth = { gate: 'loading', me: null, isVerified: false };
		const view = show();
		expect(screen.getByText(sl.common.loading)).toBeTruthy();
		expect(screen.queryByRole('heading', { level: 1 })).toBeNull();
		expect(screen.queryByRole('button', { name: t.next })).toBeNull();

		api.auth = { gate: 'ok', me, isVerified: true };
		view.rerender();
		await heading(t.photos_title);
		// Settling on the first step is not a move: focus stays where it was.
		expect(document.activeElement).toBe(document.body);
	});

	describe('signed out (C3 draft hand-off)', () => {
		const kept: Emitted = { key: 'k1', preview: 'blob:1', status: 'kept' };
		const HANDOFF = new Date(2026, 9, 16, 14, 20).getTime();
		const NONCE = 'n-7f3a';
		/** Back from sign-in: the address carries the nonce the gate's `next` took along. */
		const backFromSignIn = (nonce = NONCE) =>
			window.history.replaceState(null, '', nonce ? `/?handoff=${nonce}` : '/');
		const draft = (handoff?: number, values: Record<string, unknown> = {}) => ({
			step: 'review',
			values: {
				pet: 'new',
				species: 'cat',
				colours: ['black'],
				location: COARSE,
				radius_m: 1000,
				when: 'now',
				date: '',
				time: '',
				...values,
			},
			at: HANDOFF,
			handoff: handoff === undefined ? undefined : { at: handoff, nonce: NONCE },
		});
		beforeEach(() => {
			// The session is not wired on a signed-out page until the gate opens: it never resolves.
			api.auth = { gate: 'loading', me: null, isVerified: false };
		});

		/** Pes in Rjava with a kept photo, to the review. */
		async function fillToReview() {
			// Signed out there are no saved pets to choose from: the flow starts at the photos.
			await heading(t.photos_title);
			expect(screen.queryByText(t.pet_title)).toBeNull();
			expect(bars()).toBe('Korak 1 od 6');
			// Nothing leaves the browser before sign-in: the picker keeps the photos.
			expect(api.picker.hold).toBe(true);
			photosUp([kept]);
			click(t.next);
			await heading(t.details_title);
			fireEvent.click(
				within(await species()).getByRole('radio', {
					name: 'Pes',
				})
			);
			fireEvent.click(screen.getByRole('button', { name: 'Rjava' }));
			click(t.next);
			await heading(sl.location.title_lost);
			click(sl.location.confirm);
			await heading(t.when_title);
			click(t.next);
			await heading(t.circumstances_title);
			click(t.next);
			await heading(t.review_title);
		}

		it('lets a visitor fill every step, then asks for an account at Publish with the draft kept and marked', async () => {
			show({ signedIn: false });
			await fillToReview();
			click(t.publish);

			expect(await screen.findByRole('dialog', { name: t.gate_title })).toBeTruthy();
			expect(screen.getByText(t.gate_body)).toBeTruthy();
			expect(screen.queryByText(t.photos_wait)).toBeNull();
			expect(api.createReport).not.toHaveBeenCalled();
			expect(api.store.get('draft:lost:lost')).toMatchObject({
				step: 'review',
				values: { species: 'dog', colours: ['brown'], location: COARSE },
				handoff: { at: Date.now(), nonce: expect.any(String) },
			});
			// The nonce rides in the address, so the gate's `next` brings it back.
			const { nonce } = (api.store.get('draft:lost:lost') as { handoff: { nonce: string } }).handoff;
			expect(new URLSearchParams(window.location.search).get('handoff')).toBe(nonce);

			// Prekliči: the draft stays, without the mark.
			act(() => api.gate.onOpenChange!(false));
			expect(screen.queryByRole('dialog')).toBeNull();
			expect(window.location.search).toBe('');
			await waitFor(() =>
				expect((api.store.get('draft:lost:lost') as { handoff?: number }).handoff).toBeUndefined()
			);
			expect(api.store.get('draft:lost:lost')).toMatchObject({ step: 'review', values: { species: 'dog' } });
		});

		it('publishes once signed in, after the kept photos are uploaded by the new account', async () => {
			const view = show({ signedIn: false });
			await fillToReview();
			click(t.publish);
			await screen.findByRole('dialog', { name: t.gate_title });

			// Signed in without leaving the page (another tab), the address not confirmed yet: the gate only calls
			// onReady for verified accounts, so the flow closes it itself and goes on (P6).
			api.auth = { gate: 'ok', me, isVerified: false };
			view.rerender();
			expect(api.picker.hold).toBe(false);
			await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
			expect(window.location.search).toBe('');
			photosUp([{ ...kept, status: 'uploading' }]);
			expect(button(t.publishing)).toBeTruthy();
			expect(api.createReport).not.toHaveBeenCalled();

			photosUp();
			await heading(t.done_title);
			expect(api.createReport).toHaveBeenCalledTimes(1);
			expect(api.createReport.mock.calls[0]![0].body).toMatchObject({
				species: 'dog',
				colours: ['brown'],
				photo_ids: ['photo-1'],
			});
			expect(done()).toMatchObject({ unverified: true });
			expect(api.store.size).toBe(0);
		});

		it('back from sign-in or sign-up, restores the marked draft at the review and publishes it by itself', async () => {
			api.store.set('draft:lost:lost', draft(HANDOFF));
			api.auth = { gate: 'ok', me, isVerified: true };
			vi.setSystemTime(new Date(2026, 9, 16, 14, 32));
			backFromSignIn();
			show();

			await heading(t.review_title);
			expect(screen.queryByText(t.resume_title)).toBeNull();
			expect(api.picker.hold).toBe(false);
			// The picker restores the photo from this browser and uploads it; the send waits for it.
			photosUp([{ ...kept, status: 'uploading' }]);
			expect(api.createReport).not.toHaveBeenCalled();
			photosUp();

			await heading(t.done_title);
			expect(api.createReport).toHaveBeenCalledTimes(1);
			const { body } = api.createReport.mock.calls[0]![0];
			// "Pravkar" is when Publish was pressed, not after the sign-in detour.
			expect(body).toMatchObject({
				species: 'cat',
				colours: ['black'],
				location: COARSE,
				event_at: new Date(HANDOFF).toISOString(),
				photo_ids: ['photo-1'],
			});
			expect(api.store.size).toBe(0);
			// The param is used up.
			expect(window.location.search).toBe('');
		});

		it.each([
			['still signed out', false, HANDOFF, NONCE],
			['signed in, a day later', true, HANDOFF - 25 * 60 * 60 * 1000, NONCE],
			['signed in, an unmarked draft', true, undefined, NONCE],
			['signed in, no nonce in the address (another account on a shared device)', true, HANDOFF, ''],
			['signed in, another nonce in the address', true, HANDOFF, 'other'],
		])('asks to resume instead when %s', async (_name, signedIn, handoff, nonce) => {
			backFromSignIn(nonce);
			api.store.set('draft:lost:lost', draft(handoff));
			if (signedIn) api.auth = { gate: 'ok', me, isVerified: true };
			show({ signedIn });
			expect(await screen.findByText(t.resume_title)).toBeTruthy();
			photosUp();
			await new Promise((resolve) => setTimeout(resolve, 20));
			expect(api.createReport).not.toHaveBeenCalled();
			expect(window.location.search).toBe('');
		});

		it('uses the hand-off up: after a lost answer a reload asks first and a retry keeps its key', async () => {
			api.createReport.mockRejectedValueOnce({ status: 0, data: { code: 'NETWORK', message: 'offline' } });
			api.store.set('draft:lost:lost', draft(HANDOFF));
			api.auth = { gate: 'ok', me, isVerified: true };
			backFromSignIn();
			show();
			await heading(t.review_title);
			photosUp();
			expect(await screen.findByText(t.send_failed)).toBeTruthy();
			expect((api.store.get('draft:lost:lost') as { handoff?: unknown }).handoff).toBeUndefined();

			// A reload (even with the address kept) does not publish again.
			cleanup();
			backFromSignIn();
			show();
			expect(await screen.findByText(t.resume_title)).toBeTruthy();
			photosUp();
			await new Promise((resolve) => setTimeout(resolve, 20));
			expect(api.createReport).toHaveBeenCalledTimes(1);
		});

		it('keeps the retry manual with the same key in the page that handed off', async () => {
			api.createReport.mockRejectedValueOnce({ status: 0, data: { code: 'NETWORK', message: 'offline' } });
			api.store.set('draft:lost:lost', draft(HANDOFF));
			api.auth = { gate: 'ok', me, isVerified: true };
			backFromSignIn();
			show();
			await heading(t.review_title);
			photosUp();
			await screen.findByText(t.send_failed);
			await new Promise((resolve) => setTimeout(resolve, 20));
			expect(api.createReport).toHaveBeenCalledTimes(1);
			click(t.publish);
			await heading(t.done_title);
			const [first, second] = api.createReport.mock.calls.map(([arg]) => arg);
			expect(second.idempotencyKey).toBe(first.idempotencyKey);
		});

		it.each([
			['today', new Date(2026, 9, 16, 23, 50)],
			['yesterday', new Date(2026, 9, 15, 23, 50)],
		] as const)('resolves "%s" and its hour against the press, not after midnight', async (when, expected) => {
			const pressed = new Date(2026, 9, 16, 23, 55).getTime();
			api.store.set('draft:lost:lost', draft(pressed, { when, time: '23:50' }));
			api.auth = { gate: 'ok', me, isVerified: true };
			vi.setSystemTime(new Date(2026, 9, 17, 0, 10));
			backFromSignIn();
			show();
			await heading(t.review_title);
			photosUp();
			await heading(t.done_title);
			expect(api.createReport.mock.calls[0]![0].body.event_at).toBe(expected.toISOString());
		});
	});
});
