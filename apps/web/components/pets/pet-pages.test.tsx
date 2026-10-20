import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { useEffect } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { pet } from '@zivali/api/__fixtures__/pets';
import en from '@zivali/i18n/dist/en.json';
import sl from '@zivali/i18n/dist/sl.json';
import { timeZone } from '@zivali/i18n/format';
import type { Pet } from '@zivali/types';

import { PetDetail, PetDetailById } from './pet-detail';
import { PetForm } from './pet-form';
import { PetList } from './pet-list';

// Radix radios measure themselves; jsdom has no ResizeObserver.
globalThis.ResizeObserver ??= class {
	observe() {}
	unobserve() {}
	disconnect() {}
} as unknown as typeof ResizeObserver;

type Query = { data?: unknown; isError?: boolean; error?: unknown; isFetching?: boolean; refetch?: () => void };
type Emitted = { key: string; photoId?: string; status: 'uploading' | 'uploaded' | 'failed' };
const api = vi.hoisted(() => ({
	list: {} as Query,
	get: {} as Query,
	createPet: vi.fn(),
	updatePet: vi.fn(),
	setPetPhotos: vi.fn(),
	deletePet: vi.fn(),
	archivePet: vi.fn(),
	push: vi.fn(),
	toast: { success: vi.fn(), error: vi.fn() },
	clearPhotoDraft: vi.fn(async () => {}),
	picker: { draft: '', next: [] as Emitted[] },
	/** RTK's mutation hook shape: a trigger whose result unwraps to `fn`'s. */
	mutation: (fn: (arg: unknown) => unknown) => () => [(arg: unknown) => ({ unwrap: async () => fn(arg) })],
}));
vi.mock('@zivali/api/pets', () => ({
	useListPetsQuery: () => api.list,
	useGetPetQuery: () => api.get,
	useCreatePetMutation: api.mutation((arg) => api.createPet(arg)),
	useUpdatePetMutation: api.mutation((arg) => api.updatePet(arg)),
	useSetPetPhotosMutation: api.mutation((arg) => api.setPetPhotos(arg)),
	useDeletePetMutation: api.mutation((arg) => api.deletePet(arg)),
	useArchivePetMutation: api.mutation((arg) => api.archivePet(arg)),
}));
vi.mock('next/navigation', async (actual) => ({
	...(await actual()),
	useRouter: () => ({ push: api.push, replace: vi.fn(), prefetch: vi.fn() }),
	usePathname: () => '/moje-zivali',
	useParams: () => ({ locale: 'sl' }),
}));
vi.mock('sonner', () => ({ toast: api.toast }));
// AI off (C19): no attributes polling; the pre-fill has its own tests (use-prefill.test.tsx).
vi.mock('@zivali/api/config', () => ({ useGetPublicConfigQuery: () => ({ data: { 'ai.enabled': false } }) }));
vi.mock('@zivali/api/photos', () => ({
	useGetPhotoAttributesQuery: () => ({ currentData: undefined, isError: false, refetch: vi.fn() }),
}));
vi.mock('@/components/photos/use-photo-uploads', () => ({ clearPhotoDraft: api.clearPhotoDraft }));
// The PhotoPicker itself is covered by photo-picker.test.tsx: here it reports what the test sets, as the real one does.
vi.mock('@/components/photos/photo-picker', () => ({
	PhotoPicker: ({
		draft,
		saved = [],
		onChange,
	}: {
		draft: string;
		saved?: Pet['photos'];
		onChange: (photos: Emitted[]) => void;
	}) => {
		api.picker.draft = draft;
		useEffect(() => onChange(saved.map(({ id }) => ({ key: id, photoId: id, status: 'uploaded' }))), []); // eslint-disable-line react-hooks/exhaustive-deps
		return (
			<button type="button" onClick={() => onChange(api.picker.next)}>
				photos
			</button>
		);
	},
}));

const conflict = (details: object) => ({ status: 409, data: { code: 'CONFLICT', message: 'x', details } });
const make = (n: number, fields: Partial<Pet> = {}): Pet => ({ ...pet, id: `pet-${n}`, ...fields });

function show(ui: React.ReactNode, locale: 'sl' | 'en' = 'sl') {
	return render(
		<NextIntlClientProvider locale={locale} messages={locale === 'en' ? en : sl} timeZone={timeZone}>
			{ui}
		</NextIntlClientProvider>
	);
}
const click = (name: string | RegExp) => fireEvent.click(screen.getByRole('button', { name }));
/** Saves; `photos` first hands the form what the picker would report. */
const save = async (photos?: Emitted[]) => {
	if (photos) {
		api.picker.next = photos;
		click('photos');
	}
	fireEvent.click(screen.getAllByRole('button', { name: 'Shrani' })[0]!);
};

beforeEach(() => {
	api.createPet.mockImplementation(async ({ body }: { body: object }) => ({ ...pet, ...body, id: 'pet-new' }));
	api.updatePet.mockImplementation(async ({ id }: { id: string }) => ({ ...pet, id }));
	api.setPetPhotos.mockResolvedValue(undefined);
});
afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

describe('PetList', () => {
	it('lists each pet with photo, name, species and breed and chip status, never the chip number', () => {
		api.list = {
			data: {
				items: [
					make(1, { archived_at: '2026-10-10T10:00:00Z' }),
					make(2, {
						name: 'Muri',
						species: 'cat',
						breed_codes: [],
						chip_number: null,
						chip_status: 'none',
						photos: [],
					}),
					make(3, { name: 'Bela', chip_number: null, chip_status: 'invalid' }),
				],
			},
		};
		const { container } = show(<PetList />);

		expect(screen.getByRole('heading', { level: 1, name: 'Moje živali' })).toBeTruthy();
		expect(screen.getByText('3 živali')).toBeTruthy();
		expect(screen.getByRole('link', { name: 'Dodaj žival' }).getAttribute('href')).toBe('/moje-zivali/nova');
		// Active first, archived last.
		const rows = within(screen.getByRole('list', { name: 'Moje živali' })).getAllByRole('link');
		expect(rows.map((row) => row.textContent)).toEqual([
			'MuriMačkaBrez čipa',
			'BelaPes · LabradorecČip ni znan',
			'RunoPes · LabradorecČip vpisanArhiviran',
		]);
		expect(rows[2]!.getAttribute('href')).toBe('/moje-zivali/pet-1');
		expect(within(rows[1]!).getByRole('img', { name: 'Bela' }).getAttribute('src')).toBe(pet.photos[0]!.thumb_url);
		// AC#2: the list never carries a chip number, not even hidden.
		expect(container.innerHTML).not.toMatch(/705\s?0{3,}/);
	});

	it('puts focus on the heading, where a delete lands', () => {
		api.list = { data: { items: [make(1)] } };
		show(<PetList />);
		expect(document.activeElement).toBe(screen.getByRole('heading', { level: 1, name: 'Moje živali' }));
	});

	it('shows the quiet free-limit note at two active pets, and the add action stays', () => {
		api.list = { data: { items: [make(1), make(2)] } };
		show(<PetList />);
		expect(screen.getByRole('status').textContent).toBe(
			'Brezplačno lahko shranite 2 profila živali, več jih omogoča Premium Zaščita. Izgubljeno žival lahko vedno prijavite tudi brez profila.'
		);
		expect(screen.getByRole('link', { name: 'Dodaj žival' })).toBeTruthy();
		cleanup();

		// An archived pet does not count.
		api.list = { data: { items: [make(1), make(2, { archived_at: '2026-10-10T10:00:00Z' })] } };
		show(<PetList />);
		expect(screen.queryByRole('status')).toBeNull();
	});

	it('works in English', () => {
		api.list = { data: { items: [make(1), make(2)] } };
		show(<PetList />, 'en');
		expect(screen.getByRole('heading', { level: 1, name: 'My pets' })).toBeTruthy();
		expect(screen.getByText('2 pets')).toBeTruthy();
		expect(screen.getByRole('link', { name: 'Add a pet' }).getAttribute('href')).toBe('/en/my-pets/new');
		expect(screen.getAllByText('Dog · Labrador Retriever')).toHaveLength(2);
		expect(screen.getByRole('status').textContent).toContain(
			'You can save 2 pet profiles for free; Premium Protect'
		);
	});

	it('has an empty state, announces loading and offers a retry on error', () => {
		api.list = { data: { items: [] } };
		show(<PetList />);
		// An h2 under the page's h1, the P8 slice's copy as exact names.
		expect(screen.getByRole('heading', { level: 2, name: 'Še nimate shranjenih živali' })).toBeTruthy();
		expect(screen.getByText(sl.pets.empty_body)).toBeTruthy();
		expect(screen.getByRole('link', { name: 'Dodaj žival' })).toBeTruthy();
		cleanup();

		show(<PetList />, 'en');
		expect(screen.getByRole('heading', { level: 2, name: 'You have not saved any pets yet' })).toBeTruthy();
		expect(screen.getByText(en.pets.empty_body)).toBeTruthy();
		expect(screen.getByRole('link', { name: 'Add a pet' })).toBeTruthy();
		cleanup();

		api.list = {};
		show(<PetList />);
		expect(screen.getByRole('status').textContent).toBe(sl.common.loading);
		cleanup();

		const refetch = vi.fn();
		api.list = { isError: true, refetch };
		show(<PetList />);
		click(sl.common.inline_error_retry);
		expect(refetch).toHaveBeenCalled();
	});
});

describe('PetForm', () => {
	const typeName = (value: string) =>
		fireEvent.change(screen.getByRole('textbox', { name: 'Ime' }), { target: { value } });
	const chooseDog = () =>
		fireEvent.click(within(screen.getByRole('radiogroup', { name: 'Vrsta' })).getByRole('radio', { name: 'Pes' }));

	it('creates a pet, then sets its photos in order, clears the draft and opens the profile', async () => {
		show(<PetForm />);
		expect(screen.getByRole('heading', { level: 1, name: 'Nova žival' })).toBeTruthy();
		expect(api.picker.draft).toBe('pet:new');
		chooseDog();
		typeName('Rex');
		await save([
			{ key: 'a', photoId: 'photo-2', status: 'uploaded' },
			{ key: 'b', photoId: 'photo-1', status: 'uploaded' },
			{ key: 'c', status: 'failed' },
		]);

		await waitFor(() => expect(api.push).toHaveBeenCalledWith('/moje-zivali/pet-new'));
		expect(api.createPet).toHaveBeenCalledWith({
			body: expect.objectContaining({ species: 'dog', name: 'Rex' }),
			idempotencyKey: expect.stringMatching(
				/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
			),
		});
		expect(api.setPetPhotos).toHaveBeenCalledWith({ id: 'pet-new', body: { photo_ids: ['photo-2', 'photo-1'] } });
		expect(api.clearPhotoDraft).toHaveBeenCalledWith('pet:new');
		expect(api.toast.success).toHaveBeenCalledWith('Profil je shranjen.');
	});

	it('waits for uploads: Save is busy while a photo is still uploading', async () => {
		show(<PetForm />);
		chooseDog();
		typeName('Rex');
		await save([{ key: 'a', status: 'uploading' }]);
		await act(async () => {});
		expect(screen.getAllByRole('button', { name: 'Shrani' })[0]!.getAttribute('aria-busy')).toBe('true');
		expect(api.createPet).not.toHaveBeenCalled();
	});

	it('shows the free-limit note on PET_LIMIT, keeps what was typed and creates nothing twice', async () => {
		api.createPet.mockRejectedValueOnce(conflict({ code: 'PET_LIMIT', limit: 2 }));
		show(<PetForm />);
		chooseDog();
		typeName('Rex');
		await save();

		const note = (await screen.findByText(/^Brezplačno lahko shranite/)).closest<HTMLElement>('[role=status]')!;
		expect(note.textContent).toContain(
			'Brezplačno lahko shranite 2 profila živali, več jih omogoča Premium Zaščita.'
		);
		expect(note.textContent).toContain('Izgubljeno žival lahko vedno prijavite tudi brez profila.');
		await waitFor(() => expect(document.activeElement).toBe(note));
		expect((screen.getByRole('textbox', { name: 'Ime' }) as HTMLInputElement).value).toBe('Rex');
		expect(api.push).not.toHaveBeenCalled();
		expect(api.toast.error).not.toHaveBeenCalled();
	});

	it('sends one Idempotency-Key per create chain: a retry repeats it, an edit or PET_LIMIT starts a new one', async () => {
		const network = { status: 0, data: { code: 'NETWORK', message: 'x' } };
		api.createPet
			.mockRejectedValueOnce(network)
			.mockRejectedValueOnce(network)
			.mockRejectedValueOnce(conflict({ code: 'PET_LIMIT', limit: 2 }));
		show(<PetForm />);
		chooseDog();
		typeName('Rex');
		const attempt = async (n: number) => {
			await save();
			await waitFor(() => expect(api.createPet).toHaveBeenCalledTimes(n));
			await act(async () => {});
		};
		// The response is lost; the retry with the same values sends the same key, so the API replays the first pet.
		await attempt(1);
		await attempt(2);
		// An edit is another body: a new key (the old one would be refused with CONFLICT).
		typeName('Rexo');
		await attempt(3);
		await screen.findByText(/^Brezplačno lahko shranite/);
		// PET_LIMIT is a stored answer: the next Save, same values, starts a new chain.
		await attempt(4);
		await waitFor(() => expect(api.push).toHaveBeenCalledWith('/moje-zivali/pet-new'));

		const calls = api.createPet.mock.calls.map(
			([arg]) => arg as { body: { name: string }; idempotencyKey: string }
		);
		const keys = calls.map((call) => call.idempotencyKey);
		expect(calls.map((call) => call.body.name)).toEqual(['Rex', 'Rex', 'Rexo', 'Rexo']);
		expect(keys[1]).toBe(keys[0]);
		expect(new Set(keys.slice(1)).size).toBe(3);
	});

	it('after a failed photo step, Save again updates the pet it created instead of creating another', async () => {
		api.setPetPhotos.mockRejectedValueOnce({ status: 0, data: { code: 'NETWORK', message: 'x' } });
		show(<PetForm />);
		chooseDog();
		typeName('Rex');
		await save([{ key: 'a', photoId: 'photo-1', status: 'uploaded' }]);
		await waitFor(() => expect(api.toast.error).toHaveBeenCalled());

		await save();
		await waitFor(() => expect(api.push).toHaveBeenCalledWith('/moje-zivali/pet-new'));
		expect(api.createPet).toHaveBeenCalledTimes(1);
		expect(api.updatePet).toHaveBeenCalledWith(expect.objectContaining({ id: 'pet-new' }));
		expect(api.setPetPhotos).toHaveBeenCalledTimes(2);
	});

	it('edits a pet: its values and photos are filled in, and only the changes are sent', async () => {
		const runo = make(1, { photos: [pet.photos[0]!, { id: 'photo-b', thumb_url: 'https://media.test/b.webp' }] });
		show(<PetForm pet={runo} />);
		expect(screen.getByRole('heading', { level: 1, name: 'Uredi profil' })).toBeTruthy();
		expect(api.picker.draft).toBe('pet:pet-1');
		expect((screen.getByRole('textbox', { name: 'Številka čipa' }) as HTMLInputElement).value).toBe(
			'705 0000 0012 3456'
		);
		typeName('Runo Drugi');
		await save();
		await waitFor(() => expect(api.push).toHaveBeenCalledWith('/moje-zivali/pet-1'));
		expect(api.updatePet).toHaveBeenCalledWith({ id: 'pet-1', body: { name: 'Runo Drugi' } });
		// Same photos in the same order: no photo call.
		expect(api.setPetPhotos).not.toHaveBeenCalled();
		expect(api.createPet).not.toHaveBeenCalled();
	});

	it('sends no PATCH for a photos-only edit', async () => {
		show(<PetForm pet={make(1)} />);
		await save([{ key: 'x', photoId: 'photo-x', status: 'uploaded' }]);
		await waitFor(() =>
			expect(api.setPetPhotos).toHaveBeenCalledWith({ id: 'pet-1', body: { photo_ids: ['photo-x'] } })
		);
		expect(api.updatePet).not.toHaveBeenCalled();
		expect(api.createPet).not.toHaveBeenCalled();
	});

	it('asks before leaving with unsaved changes: keep editing, or discard and go back to the list', async () => {
		show(<PetForm />);
		const back = screen.getByRole('link', { name: 'Moje živali' });
		expect(back.getAttribute('href')).toBe('/moje-zivali');
		typeName('Rex');
		fireEvent.click(back);

		const dialog = await screen.findByRole('alertdialog', { name: sl.common.discard_title });
		expect(document.activeElement).toBe(within(dialog).getByRole('button', { name: sl.common.keep_editing }));
		fireEvent.click(within(dialog).getByRole('button', { name: sl.common.keep_editing }));
		await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
		expect(api.push).not.toHaveBeenCalled();

		fireEvent.click(back);
		fireEvent.click(await screen.findByRole('button', { name: sl.common.discard_confirm }));
		await waitFor(() => expect(api.push).toHaveBeenCalledWith('/moje-zivali'));
		expect(api.clearPhotoDraft).toHaveBeenCalledWith('pet:new');
	});
});

describe('PetDetail', () => {
	it('shows facts and photos, and the chip number only after "Pokaži številko"', () => {
		const runo = make(1, { photos: [pet.photos[0]!, { id: 'photo-b', thumb_url: 'https://media.test/b.webp' }] });
		const { container } = show(<PetDetail pet={runo} />);

		expect(screen.getByRole('heading', { level: 1, name: 'Runo' })).toBeTruthy();
		expect(screen.getByRole('img', { name: 'Runo, fotografija 1' })).toBeTruthy();
		expect(screen.getByRole('img', { name: 'Runo, fotografija 2' })).toBeTruthy();
		const facts = [...container.querySelectorAll('dt')].map(
			(dt) => `${dt.textContent}: ${dt.nextSibling?.textContent}`
		);
		expect(facts).toEqual([
			'Vrsta: Pes',
			'Spol: Samec',
			'Pasma: Labradorec',
			'Leto rojstva: 2021',
			'Barva: Zlata',
			'Vzorec: Enobarvna',
			'Velikost: Velika',
			'Ovratnica: Rdeča ovratnica',
		]);
		expect(screen.getByRole('link', { name: 'Prijavi izgubljeno žival' }).getAttribute('href')).toBe(
			'/prijava/izgubljena-zival?pet=pet-1'
		);
		expect(screen.getByRole('link', { name: 'Uredi' }).getAttribute('href')).toBe('/moje-zivali/pet-1/uredi');

		expect(container.textContent).not.toContain('705');
		// The bullets are aria-hidden: a screen reader still hears that the number is hidden.
		expect(screen.getByText(sl.pets.chip_hidden).className).toContain('sr-only');
		click('Pokaži številko');
		expect(screen.getByText('705 0000 0012 3456')).toBeTruthy();
		click('Skrij številko');
		expect(container.textContent).not.toContain('705');
		expect(screen.getByText('Številko vidite samo vi.')).toBeTruthy();
	});

	it('opens each photo in the fullscreen gallery and returns focus to it on close (GH #7)', async () => {
		const runo = make(1, { photos: [pet.photos[0]!, { id: 'photo-b', thumb_url: 'https://media.test/b.webp' }] });
		show(<PetDetail pet={runo} />);
		const second = screen.getByRole('button', { name: 'Runo, fotografija 2 Odpri čez cel zaslon' });
		second.focus();
		fireEvent.click(second);
		const dialog = screen.getByRole('dialog', { name: 'Fotografije' });
		// A pet photo's only file is its thumb (C4).
		expect(within(dialog).getByRole('img', { name: 'Runo, fotografija 2' }).getAttribute('src')).toBe(
			'https://media.test/b.webp'
		);
		expect(within(dialog).getByText('2 / 2')).toBeTruthy();
		click('Prejšnja fotografija');
		expect(within(dialog).getByRole('img', { name: 'Runo, fotografija 1' })).toBeTruthy();
		click('Zapri');
		expect(screen.queryByRole('dialog')).toBeNull();
		await waitFor(() => expect(document.activeElement).toBe(second));
	});

	it('deletes after confirming that the photos go too, then returns to the list', async () => {
		api.deletePet.mockResolvedValue(undefined);
		show(<PetDetail pet={make(1)} />);
		click('Izbriši');
		const dialog = await screen.findByRole('alertdialog', { name: 'Izbrišete ta profil?' });
		expect(within(dialog).getByText(sl.pets.delete_body)).toBeTruthy();
		expect(document.activeElement).toBe(within(dialog).getByRole('button', { name: 'Prekliči' }));
		fireEvent.click(within(dialog).getByRole('button', { name: 'Izbriši profil' }));

		await waitFor(() => expect(api.push).toHaveBeenCalledWith('/moje-zivali'));
		expect(api.deletePet).toHaveBeenCalledWith({ id: 'pet-1' });
		expect(api.toast.success).toHaveBeenCalledWith('Profil je izbrisan.');
	});

	it('archives after confirming; an archived pet says so and cannot be reported lost from here', async () => {
		api.archivePet.mockResolvedValue(make(1, { archived_at: '2026-10-16T10:00:00Z' }));
		show(<PetDetail pet={make(1)} />);
		click('Arhiviraj');
		fireEvent.click(await screen.findByRole('button', { name: 'Arhiviraj profil' }));
		await waitFor(() => expect(api.toast.success).toHaveBeenCalledWith('Profil je arhiviran.'));
		expect(api.archivePet).toHaveBeenCalledWith({ id: 'pet-1' });
		cleanup();

		show(
			<PetDetail pet={make(1, { archived_at: '2026-10-16T10:00:00Z', chip_number: null, chip_status: 'none' })} />
		);
		expect(screen.getByText('Arhiviran')).toBeTruthy();
		expect(screen.queryByRole('link', { name: 'Prijavi izgubljeno žival' })).toBeNull();
		expect(screen.queryByRole('button', { name: 'Arhiviraj' })).toBeNull();
		expect(screen.getByText('Brez čipa')).toBeTruthy();
		expect(screen.queryByRole('button', { name: 'Pokaži številko' })).toBeNull();
	});

	it("answers someone else's pet, or none, with the 404 page", () => {
		api.get = { isError: true, error: { status: 403, data: { code: 'FORBIDDEN', message: 'x' } } };
		show(<PetDetailById id="pet-9" />);
		expect(screen.getByRole('heading', { level: 1, name: sl.errors.page_404_title })).toBeTruthy();
	});
});
