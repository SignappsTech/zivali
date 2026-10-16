import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { useEffect } from 'react';
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
type Emitted = { key: string; preview: string; photoId?: string; status: 'uploading' | 'uploaded' | 'failed' };
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
	picker: { photos: [] as Emitted[], onChange: undefined as undefined | ((photos: Emitted[]) => void) },
	exif: undefined as undefined | ((exif: { lat?: number; lng?: number }) => void),
	suggested: undefined as unknown,
	mutation: (fn: (arg: unknown) => unknown) => () => [(arg: unknown) => ({ unwrap: async () => fn(arg) })],
}));
vi.mock('@zivali/api/auth', () => ({
	useRequireAuth: () => ({ gate: 'ok', me, isVerified: true }),
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
vi.mock('@zivali/analytics', () => ({ track: api.track, getConsent: () => api.consent }));
vi.mock('idb-keyval', () => ({
	get: async (key: string) => api.store.get(key),
	set: async (key: string, value: unknown) => void api.store.set(key, value),
	del: async (key: string) => void api.store.delete(key),
}));
vi.mock('@/components/photos/use-photo-uploads', () => ({ clearPhotoDraft: api.clearPhotoDraft }));
// PhotoPicker and LocationPicker have their own tests: here they report what the test sets, as the real ones do.
vi.mock('@/components/photos/photo-picker', () => ({
	PhotoPicker: ({
		onChange,
		onExif,
	}: {
		onChange: (photos: Emitted[]) => void;
		onExif: (exif: { lat?: number; lng?: number }) => void;
	}) => {
		api.picker.onChange = onChange;
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

function show(props: React.ComponentProps<typeof LostFlow> = {}) {
	return render(
		<NextIntlClientProvider locale="sl" messages={sl} timeZone={timeZone}>
			<LostFlow {...props} />
		</NextIntlClientProvider>
	);
}
const button = (name: string | RegExp) => screen.getByRole('button', { name });
const click = (name: string | RegExp) => fireEvent.click(button(name));
const heading = (name: string) => screen.findByRole('heading', { level: 1, name });
const bars = () => screen.getByRole('progressbar').getAttribute('aria-label');
const photosUp = (photos: Emitted[] = [uploaded]) => act(() => api.picker.onChange!(photos));

/** From the pet step to the review with a new pet: photos, Pes in Rjava, the picker's point, now, no reward. */
async function toReview() {
	await heading(t.pet_title);
	click(t.next);
	await heading(t.photos_title);
	photosUp();
	click(t.next);
	await heading(t.details_title);
	fireEvent.click(
		within(screen.getByRole('radiogroup', { name: sl.pets.species_label })).getByRole('radio', { name: 'Pes' })
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

beforeEach(() => {
	vi.useFakeTimers({ toFake: ['Date'] });
	vi.setSystemTime(new Date(2026, 9, 16, 14, 20));
	api.pets = [];
	api.picker.photos = [];
	api.consent = { analytics: true };
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
});

describe('LostFlow', () => {
	it('walks a new pet through seven steps and publishes once, with the coarsened point (AC#1, AC#2, AC#3)', async () => {
		show();
		expect(api.track).toHaveBeenCalledWith('report_lost_start');
		await heading(t.pet_title);
		// Without saved pets "Vnesi podatke" is the only row, and chosen.
		expect(screen.getByRole('radio', { name: t.pet_enter }).getAttribute('aria-checked')).toBe('true');
		expect(bars()).toBe('Korak 1 od 7');

		click(t.next);
		await heading(t.photos_title);
		expect(document.activeElement).toBe(screen.getByRole('heading', { level: 1 }));
		click(t.next);
		expect(await screen.findByText(t.photos_required)).toBeTruthy();
		photosUp();
		click(t.next);

		await heading(t.details_title);
		click(t.next);
		expect(await screen.findByText(t.validation_summary)).toBeTruthy();
		expect(screen.getByText(t.colour_required)).toBeTruthy();
		fireEvent.click(
			within(screen.getByRole('radiogroup', { name: sl.pets.species_label })).getByRole('radio', { name: 'Pes' })
		);
		fireEvent.click(screen.getByRole('button', { name: 'Rjava' }));
		fireEvent.change(screen.getByRole('textbox', { name: sl.pets.name_label }), { target: { value: 'Medo' } });
		click(t.next);

		await heading(sl.location.title_lost);
		expect(bars()).toBe('Korak 4 od 7');
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
		await heading(t.done_title);
		expect(screen.getByText(t.done_lede_named.replace('{name}', 'Medo'))).toBeTruthy();
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
		await heading(t.pet_title);
		click(t.next);
		await heading(t.photos_title);
		act(() => api.exif!(RAW_EXIF));
		photosUp();
		click(t.next);
		await heading(t.details_title);
		fireEvent.click(
			within(screen.getByRole('radiogroup', { name: sl.pets.species_label })).getByRole('radio', { name: 'Pes' })
		);
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
		expect(screen.getByRole('radio', { name: `${pet.name} · Pes` }).getAttribute('aria-checked')).toBe('true');
		expect(bars()).toBe('Korak 1 od 6');
		click(t.next);
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
		click(t.next);
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
		click(t.next);
		await heading(t.review_title);
		click(t.publish);
		await heading(t.details_title);
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

	it('forgets the open search found for one pet when another pet is chosen', async () => {
		const other = { ...pet, id: 'pet-2', name: 'Muri' };
		api.pets = [pet, other];
		api.createReport.mockRejectedValueOnce({
			status: 409,
			data: { code: 'DUPLICATE_OPEN_REPORT', message: 'x', details: { short_code: 'Pq7xYz12' } },
		});
		show({ initialPet: pet.id });
		await heading(t.pet_title);
		click(t.next);
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

		click(`${t.review_edit}: ${t.review_pet}`);
		await heading(t.pet_title);
		fireEvent.click(screen.getByRole('radio', { name: `${other.name} · Pes` }));
		click(t.next);
		await heading(t.review_title);
		expect(screen.queryByText(t.duplicate_title)).toBeNull();
		click(t.publish);
		await heading(t.done_title);
		expect(api.updateReport).not.toHaveBeenCalled();
		expect(api.createReport.mock.calls[1]![0].body).toMatchObject({ pet_id: 'pet-2' });
	});

	it('offers to resume a saved draft at its step', async () => {
		api.store.set('draft:lost:lost', {
			step: 'when',
			values: { pet: 'new', species: 'cat', colours: ['black'], when: 'now', date: '', time: '' },
			at: new Date(2026, 9, 15).getTime(),
		});
		show();
		expect(await screen.findByText(t.resume_title)).toBeTruthy();
		click(t.resume_continue);
		await heading(t.when_title);
		expect(bars()).toBe('Korak 5 od 7');
		expect(screen.getByText(t.draft_saved)).toBeTruthy();
	});
});
