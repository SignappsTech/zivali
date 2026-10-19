import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { FormProvider, useForm } from 'react-hook-form';
import { Provider } from 'react-redux';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { attributesPendingThenReady, attributesReady, attributesUnavailable } from '@zivali/api/__fixtures__/ai';
import { createMockApi, type MockRoutes, mockError } from '@zivali/api/mock';
import { createApiStore } from '@zivali/api/rtk';
import sl from '@zivali/i18n/dist/sl.json';
import { timeZone } from '@zivali/i18n/format';
import { emptyPetFields, PET_AI_FIELDS, PetFields, type PetFieldValues } from '@/components/pets/pet-fields';
import type { PickedPhoto } from '@/components/photos/use-photo-uploads';

import { AiSlot } from './ai-parts';
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

function Harness({ photos }: { photos: PickedPhoto[] }) {
	const form = useForm<PetFieldValues>({ defaultValues: emptyPetFields });
	const ai = useFormPrefill(() => form, photos, { fields: PET_AI_FIELDS });
	return (
		<FormProvider {...form}>
			<PetFields ai={ai} />
			<AiSlot ai={ai} note="save" onChangePhoto={() => {}} />
		</FormProvider>
	);
}

function show(routes: MockRoutes, photos: PickedPhoto[] = [uploaded]) {
	const api = createMockApi({ 'GET /v1/config/public': { 'ai.enabled': true }, ...routes });
	render(
		<NextIntlClientProvider locale="sl" messages={sl} timeZone={timeZone}>
			<Provider store={createApiStore(api)}>
				<Harness photos={photos} />
			</Provider>
		</NextIntlClientProvider>
	);
	return api;
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
			/Predlog iz fotografije, 98\s% verjetno pravilen\. Preverite ga\./
		);
		expect(describedBy(screen.getByRole('combobox', { name: 'Pasma' }))).toMatch(/81\s% verjetno pravilen/);
		// Size below the minimum confidence: empty, with the hint; a collar was seen: only the hint.
		expect(radio('Velikost', 'Srednja').getAttribute('aria-checked')).toBe('false');
		expect(describedBy(screen.getByRole('radiogroup', { name: 'Velikost' }))).toContain(LOW);
		expect(
			screen.getByText('Na fotografiji je videti ovratnica. Če lahko, jo opišite: barva, obesek, zvonček.')
		).toBeTruthy();
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

	it('shows nothing extra after an error, and does not poll again', async () => {
		const api = show({ [ATTRIBUTES]: () => mockError('NOT_FOUND') });
		await waitFor(() => expect(polls(api)).toHaveLength(1));
		await waitFor(() => expect(screen.queryByText(CHECKING)).toBeNull());
		await wait(900);
		expect(polls(api)).toHaveLength(1);
		expect(screen.queryByText('Predlog')).toBeNull();
	});
});
