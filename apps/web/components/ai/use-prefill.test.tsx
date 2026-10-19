import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { FormProvider, useForm } from 'react-hook-form';
import { Provider } from 'react-redux';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
	attributesMultipleAnimals,
	attributesPending,
	attributesPendingThenReady,
	attributesReady,
	attributesUnavailable,
} from '@zivali/api/__fixtures__/ai';
import { createMockApi, type MockRoutes, mockError } from '@zivali/api/mock';
import { createApiStore } from '@zivali/api/rtk';
import sl from '@zivali/i18n/dist/sl.json';
import { timeZone } from '@zivali/i18n/format';
import { emptyPetFields, PetFields, type PetFieldValues } from '@/components/pets/pet-fields';
import type { PickedPhoto } from '@/components/photos/use-photo-uploads';

import { AiSlot } from './ai-parts';
import { PET_AI_FIELDS } from './prefill';
import { useFormPrefill } from './use-prefill';

// TASK-41.2: the AI pre-fill of PetFields (P6, P8) against the mock API (C19 client fixtures), with real timers: the
// form polls every 750 ms for at most 10 s.

// Radix radios measure themselves; jsdom has no ResizeObserver.
globalThis.ResizeObserver ??= class {
	observe() {}
	unobserve() {}
	disconnect() {}
} as unknown as typeof ResizeObserver;
vi.mock('next/navigation', async (actual) => ({
	...(await actual()),
	useRouter: () => ({ replace: vi.fn(), push: vi.fn(), prefetch: vi.fn() }),
	usePathname: () => '/moje-zivali/nova',
	useParams: () => ({ locale: 'sl' }),
}));

const uploaded = { key: 'k1', photoId: 'photo-1', status: 'uploaded', progress: 1, preview: 'blob:1' } as PickedPhoto;
const ATTRIBUTES = 'GET /v1/photos/:id/attributes';
const cropFirst = vi.fn();

function Harness({ photos }: { photos: PickedPhoto[] }) {
	const form = useForm<PetFieldValues>({ defaultValues: emptyPetFields });
	const ai = useFormPrefill(() => form, photos, { fields: PET_AI_FIELDS });
	return (
		<FormProvider {...form}>
			<PetFields ai={ai} />
			<AiSlot ai={ai} note="save" notice onChangePhoto={() => {}} onCrop={cropFirst} />
			{/* What the photo picker's onCropped does for the first photo (TASK-41.5). */}
			<button type="button" onClick={ai.recheck}>
				Cropped
			</button>
		</FormProvider>
	);
}

/** The mock API, with `swap` to give the form other photos (a replaced, removed or reordered first one). */
function show(routes: MockRoutes, photos: PickedPhoto[] = [uploaded]) {
	const api = createMockApi({ 'GET /v1/config/public': { 'ai.enabled': true }, ...routes });
	const store = createApiStore(api);
	const tree = (next: PickedPhoto[]) => (
		<NextIntlClientProvider locale="sl" messages={sl} timeZone={timeZone}>
			<Provider store={store}>
				<Harness photos={next} />
			</Provider>
		</NextIntlClientProvider>
	);
	const { rerender } = render(tree(photos));
	return Object.assign(api, { swap: (next: PickedPhoto[]) => rerender(tree(next)) });
}
const polls = (api: ReturnType<typeof createMockApi>) => api.calls.filter((call) => call.path.endsWith('/attributes'));
const radio = (group: string, name: string) =>
	within(screen.getByRole('radiogroup', { name: group })).getByRole('radio', { name });
const describedBy = (element: HTMLElement) =>
	(element.getAttribute('aria-describedby') ?? '')
		.split(' ')
		.map((id) => document.getElementById(id)?.textContent)
		.join(' ');
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const CHECKING = 'Pregledujemo fotografijo … Obrazec lahko medtem izpolnjujete naprej.';
const LOW = 'Iz fotografije tega ne moremo zanesljivo razbrati. Izberite sami.';
const COLLAR = 'Na fotografiji je videti ovratnica. Če lahko, jo opišite: barva, obesek, zvonček.';
/** The photo notice's own action (the live region keeps the announcement, so the title alone does not tell). */
const keep = () => screen.queryByRole('button', { name: 'Obdrži fotografijo' });

afterEach(cleanup);

describe('useFormPrefill with PetFields (C19 §Client rules)', () => {
	it('polls nothing with ai.enabled false', async () => {
		const attributes = vi.fn(() => attributesReady);
		const api = show({ 'GET /v1/config/public': { 'ai.enabled': false }, [ATTRIBUTES]: attributes });
		await waitFor(() => expect(api.calls.some((call) => call.path === '/v1/config/public')).toBe(true));
		await wait(900);
		expect(attributes).not.toHaveBeenCalled();
		expect(screen.queryByText(CHECKING)).toBeNull();
	});

	it('does not check a saved photo (P8 edit)', async () => {
		const api = show({ [ATTRIBUTES]: attributesReady }, [{ ...uploaded, saved: true }]);
		await waitFor(() => expect(api.calls.some((call) => call.path === '/v1/config/public')).toBe(true));
		await wait(900);
		expect(polls(api)).toHaveLength(0);
	});

	it('fills the empty fields marked Predlog, hints the uncertain ones, announces once and saves nothing', async () => {
		const api = show({ [ATTRIBUTES]: attributesPendingThenReady(attributesReady, 1) });
		expect(await screen.findByText(CHECKING)).toBeTruthy();
		// One polite announcement with the number actually filled.
		const live = await screen.findByText('Iz fotografije smo predlagali 4 podatke. Preverite jih.', undefined, {
			timeout: 3000,
		});
		expect(live.closest('[aria-live="polite"]')).toBeTruthy();
		expect(screen.queryByText(CHECKING)).toBeNull();
		expect(polls(api).length).toBe(2);

		expect(radio('Vrsta', 'Pes').getAttribute('aria-checked')).toBe('true');
		expect((screen.getByRole('combobox', { name: 'Pasma' }) as HTMLInputElement).value).toBe('Labradorec');
		expect(screen.getByRole('button', { name: 'Črna' }).getAttribute('aria-pressed')).toBe('true');
		// The mark sits after each filled field's label with its confidence, out of the accessible name, and is the
		// field's description.
		expect(screen.getAllByText('Predlog')).toHaveLength(4);
		expect(screen.getByText('· 98 %')).toBeTruthy();
		expect(screen.getByText('· 81 %')).toBeTruthy();
		expect(describedBy(screen.getByRole('radiogroup', { name: 'Vrsta' }))).toMatch(
			/Predlog iz fotografije, verjetnost 98\s%\. Preverite ga\./
		);
		expect(describedBy(screen.getByRole('combobox', { name: 'Pasma' }))).toMatch(/verjetnost 81\s%/);
		// Size below the minimum confidence: empty, with the hint; a collar was seen: only the hint.
		expect(radio('Velikost', 'Srednja').getAttribute('aria-checked')).toBe('false');
		expect(describedBy(screen.getByRole('radiogroup', { name: 'Velikost' }))).toContain(LOW);
		expect(screen.getByText(COLLAR)).toBeTruthy();
		// The check before saving: a quiet note by Save, with the info.
		expect(screen.getByText(/zato jih preverite, preden shranite\./)).toBeTruthy();
		fireEvent.click(screen.getByRole('button', { name: 'Kako nastanejo predlogi?' }));
		expect(screen.getByRole('link', { name: 'Več v politiki zasebnosti' }).getAttribute('href')).toBe(
			'/zasebnost#s8'
		);

		// Editing a suggestion makes it the person's own: its mark goes.
		fireEvent.click(screen.getByRole('button', { name: 'Bela' }));
		expect(screen.getAllByText('Predlog')).toHaveLength(3);
		await wait(900);
		expect(polls(api).length).toBe(2);
		expect(api.calls.every((call) => call.method === 'GET')).toBe(true);
	});

	it('a late suggestion (after 3 s) never overwrites what the person chose; another species is only a hint', async () => {
		show({ [ATTRIBUTES]: attributesPendingThenReady(attributesReady, 5) });
		fireEvent.click(radio('Vrsta', 'Mačka'));
		fireEvent.click(screen.getByRole('button', { name: 'Bela' }));
		const started = Date.now();
		expect(
			await screen.findByText('Iz fotografije smo predlagali 1 podatek. Preverite ga.', undefined, {
				timeout: 8000,
			})
		).toBeTruthy();
		expect(Date.now() - started).toBeGreaterThan(3000);

		expect(radio('Vrsta', 'Mačka').getAttribute('aria-checked')).toBe('true');
		expect(screen.getByRole('button', { name: 'Bela' }).getAttribute('aria-pressed')).toBe('true');
		expect(screen.getByRole('button', { name: 'Črna' }).getAttribute('aria-pressed')).toBe('false');
		expect(
			screen.getByText('Na fotografiji je videti pes. Če ste vrsto izbrali pravilno, jo pustite.')
		).toBeTruthy();
		// Late: no new hint lines under the fields.
		expect(screen.queryByText(LOW)).toBeNull();

		// The person's own switch: the empty fields valid for a dog fill now, with the mark.
		fireEvent.click(screen.getByRole('button', { name: 'Izberi psa' }));
		await waitFor(() =>
			expect((screen.getByRole('combobox', { name: 'Pasma' }) as HTMLInputElement).value).toBe('Labradorec')
		);
		expect(radio('Vrsta', 'Pes').getAttribute('aria-checked')).toBe('true');
		expect(screen.queryByText(/Na fotografiji je videti pes\./)).toBeNull();
		expect(screen.getByRole('button', { name: 'Bela' }).getAttribute('aria-pressed')).toBe('true');
	}, 15_000);

	it('shows nothing extra when the suggestion is unavailable, and stops polling', async () => {
		const api = show({ [ATTRIBUTES]: attributesPendingThenReady(attributesUnavailable, 1) });
		expect(await screen.findByText(CHECKING)).toBeTruthy();
		await waitFor(() => expect(screen.queryByText(CHECKING)).toBeNull(), { timeout: 3000 });
		await wait(900);
		expect(polls(api)).toHaveLength(2);
		expect(screen.queryByText('Predlog')).toBeNull();
		expect(screen.queryByText(LOW)).toBeNull();
		expect(screen.queryByText(/zato jih preverite/)).toBeNull();
		expect(radio('Vrsta', 'Pes').getAttribute('aria-checked')).toBe('false');
	});

	it('stops polling after 10 s without an answer and clears the checking line', async () => {
		vi.useFakeTimers({ shouldAdvanceTime: true });
		try {
			const api = show({ [ATTRIBUTES]: attributesPending });
			expect(await screen.findByText(CHECKING)).toBeTruthy();
			await vi.advanceTimersByTimeAsync(10_000);
			await waitFor(() => expect(screen.queryByText(CHECKING)).toBeNull());
			const count = polls(api).length;
			expect(count).toBeGreaterThan(1);
			await vi.advanceTimersByTimeAsync(3000);
			expect(polls(api)).toHaveLength(count);
			expect(screen.queryByText('Predlog')).toBeNull();
		} finally {
			vi.useRealTimers();
		}
	});

	it('drops the notice and the hints of a first photo once another photo is first', async () => {
		const second = { ...uploaded, key: 'k2', photoId: 'photo-2' } as PickedPhoto;
		const saved = { ...uploaded, key: 'k0', photoId: 'photo-0', saved: true } as PickedPhoto;
		const api = show({
			[ATTRIBUTES]: ({ params }) =>
				params.id === 'photo-1' ? { ...attributesReady, notice: 'multiple_animals' } : attributesUnavailable,
		});
		await waitFor(() => expect(keep()).toBeTruthy(), { timeout: 3000 });
		expect(screen.getAllByText('Na fotografiji je videti več živali').length).toBeGreaterThan(0);
		expect(screen.getByText(LOW)).toBeTruthy();
		expect(screen.getByText(COLLAR)).toBeTruthy();

		// A saved photo moved first: it is not checked, and the first photo's notice and hints are not about it.
		api.swap([saved, uploaded]);
		expect(keep()).toBeNull();
		expect(screen.queryByText(LOW)).toBeNull();
		expect(screen.queryByText(COLLAR)).toBeNull();

		// A new first photo that comes back unavailable: still nothing of the old one.
		api.swap([second]);
		await waitFor(() => expect(polls(api).some((call) => call.path.includes('photo-2'))).toBe(true));
		await waitFor(() => expect(screen.queryByText(CHECKING)).toBeNull());
		expect(keep()).toBeNull();
		expect(screen.queryByText(LOW)).toBeNull();
		expect(screen.queryByText(COLLAR)).toBeNull();
		// What was filled stays: it is in the form now.
		expect(radio('Vrsta', 'Pes').getAttribute('aria-checked')).toBe('true');
	});

	it('checks a cropped first photo again: marked fields emptied, the copy polled and filling them (C19 §Crop 6)', async () => {
		let copyPolls = 0;
		const api = show({
			[ATTRIBUTES]: ({ params }) =>
				params.id === 'photo-1'
					? attributesMultipleAnimals
					: copyPolls++ < 1
						? attributesPending
						: attributesReady,
		});
		// Several animals: the notice offers the crop tool first.
		await waitFor(() => expect(keep()).toBeTruthy(), { timeout: 3000 });
		fireEvent.click(screen.getByRole('button', { name: 'Obreži fotografijo' }));
		expect(cropFirst).toHaveBeenCalledOnce();
		expect((screen.getByRole('combobox', { name: 'Pasma' }) as HTMLInputElement).value).toBe('Border collie');
		// The person's own size stays through the crop.
		fireEvent.click(radio('Velikost', 'Velika'));

		fireEvent.click(screen.getByRole('button', { name: 'Cropped' }));
		expect(keep()).toBeNull();
		expect(screen.queryByText('Predlog')).toBeNull();
		expect(radio('Vrsta', 'Pes').getAttribute('aria-checked')).toBe('false');
		expect((screen.getByRole('combobox', { name: 'Pasma' }) as HTMLInputElement).value).toBe('');
		expect(screen.getByRole('button', { name: 'Črna' }).getAttribute('aria-pressed')).toBe('false');
		expect(radio('Velikost', 'Velika').getAttribute('aria-checked')).toBe('true');

		// The copy uploads as a new photo and is checked from pending.
		api.swap([{ ...uploaded, key: 'k9', photoId: undefined, status: 'uploading', progress: 0 } as PickedPhoto]);
		api.swap([{ ...uploaded, key: 'k9', photoId: 'photo-9' } as PickedPhoto]);
		expect(await screen.findByText(CHECKING)).toBeTruthy();
		expect(
			await screen.findByText('Iz fotografije smo predlagali 4 podatke. Preverite jih.', undefined, {
				timeout: 3000,
			})
		).toBeTruthy();
		expect(polls(api).filter((call) => call.path.includes('photo-9')).length).toBe(2);
		expect(radio('Vrsta', 'Pes').getAttribute('aria-checked')).toBe('true');
		expect((screen.getByRole('combobox', { name: 'Pasma' }) as HTMLInputElement).value).toBe('Labradorec');
		expect(screen.getByRole('button', { name: 'Črna' }).getAttribute('aria-pressed')).toBe('true');
		expect(screen.getByRole('button', { name: 'Bela' }).getAttribute('aria-pressed')).toBe('false');
		expect(radio('Velikost', 'Velika').getAttribute('aria-checked')).toBe('true');
		expect(keep()).toBeNull();
	});

	it('shows nothing extra after an error, and does not poll again', async () => {
		const api = show({ [ATTRIBUTES]: () => mockError('NOT_FOUND') });
		await waitFor(() => expect(polls(api)).toHaveLength(1));
		await waitFor(() => expect(screen.queryByText(CHECKING)).toBeNull());
		await wait(900);
		expect(polls(api)).toHaveLength(1);
		expect(screen.queryByText('Predlog')).toBeNull();
	});
});
