import { zodResolver } from '@hookform/resolvers/zod';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { FormProvider, useForm } from 'react-hook-form';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { z } from 'zod';

import sl from '@zivali/i18n/dist/sl.json';
import { timeZone } from '@zivali/i18n/format';
import { PetInput } from '@zivali/validation/pets.schema';

import { emptyPetFields, groupChip, PetFields, type PetFieldValues } from './pet-fields';

// Radix radios measure themselves; jsdom has no ResizeObserver.
globalThis.ResizeObserver ??= class {
	observe() {}
	unobserve() {}
	disconnect() {}
} as unknown as typeof ResizeObserver;

type Saved = z.output<typeof PetInput>;

function Harness({ onSave }: { onSave: (pet: Saved) => void }) {
	const form = useForm<PetFieldValues, unknown, Saved>({
		resolver: zodResolver(PetInput),
		defaultValues: emptyPetFields,
	});
	return (
		<NextIntlClientProvider locale="sl" messages={sl} timeZone={timeZone}>
			<FormProvider {...form}>
				<form noValidate onSubmit={form.handleSubmit(onSave)}>
					<PetFields />
					<button type="submit">Shrani</button>
				</form>
			</FormProvider>
		</NextIntlClientProvider>
	);
}

function setup() {
	const onSave = vi.fn<(pet: Saved) => void>();
	const view = render(<Harness onSave={onSave} />);
	const save = async () => {
		fireEvent.click(screen.getByRole('button', { name: 'Shrani' }));
		// The resolver is async: wait for the submit to settle either way.
		await waitFor(() => expect(screen.getByRole('button', { name: 'Shrani' })).toBeTruthy());
	};
	const saved = async () => {
		await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
		return onSave.mock.calls[0]![0];
	};
	const chooseSpecies = (name: 'Pes' | 'Mačka') =>
		fireEvent.click(within(screen.getByRole('radiogroup', { name: 'Vrsta' })).getByRole('radio', { name }));
	const typeName = (value: string) =>
		fireEvent.change(screen.getByRole('textbox', { name: 'Ime' }), { target: { value } });
	const chip = () => screen.getByRole('textbox', { name: 'Številka čipa' }) as HTMLInputElement;
	const group = (name: string) => screen.getByRole('radiogroup', { name });
	return { ...view, onSave, save, saved, chooseSpecies, typeName, chip, group };
}

const chipWarning =
	'Številka čipa je običajno dolga 15 števk. Shranili jo bomo kot neznano, preverite jo, ko boste lahko.';

afterEach(cleanup);

describe('PetFields validation', () => {
	it('asks for the species and the name, focuses the first error and saves nothing', async () => {
		const { save, onSave } = setup();
		await save();

		expect(await screen.findByText('Izberite, ali je pes ali mačka.')).toBeTruthy();
		expect(screen.getByText('Vpišite ime.')).toBeTruthy();
		expect(screen.getByRole('radiogroup', { name: 'Vrsta' }).getAttribute('aria-invalid')).toBe('true');
		expect(screen.getByRole('textbox', { name: 'Ime' }).getAttribute('aria-invalid')).toBe('true');
		await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('radio', { name: 'Pes' })));
		expect(onSave).not.toHaveBeenCalled();
	});

	it('saves the parsed PetInput once species and name are given', async () => {
		const { save, saved, chooseSpecies, typeName } = setup();
		chooseSpecies('Pes');
		typeName('  Rex ');
		fireEvent.click(screen.getByRole('button', { name: 'Rjava' }));
		fireEvent.click(screen.getByRole('button', { name: 'Bela' }));
		fireEvent.click(screen.getByRole('radio', { name: 'Samec' }));
		fireEvent.change(screen.getByRole('textbox', { name: 'Opombe' }), { target: { value: 'Plašen' } });
		await save();

		expect(await saved()).toMatchObject({
			species: 'dog',
			name: 'Rex',
			colours: ['brown', 'white'],
			sex: 'male',
			collar: null,
			notes: 'Plašen',
			ear_tip: null,
			lifestyle: null,
		});
	});
});

describe('PetFields chip', () => {
	it('groups the digits as typed and drops anything else', () => {
		const { chip } = setup();
		fireEvent.change(chip(), { target: { value: '705-1234.567890 12' } });
		expect(chip().value).toBe('705 1234 5678 9012');
		expect(chip().getAttribute('inputmode')).toBe('numeric');
		expect(groupChip('70512')).toBe('705 12');
		expect(groupChip('abc')).toBe('');
	});

	it('warns about a short number after leaving the field, without blocking the save', async () => {
		const { chip, save, saved, chooseSpecies, typeName } = setup();
		chooseSpecies('Mačka');
		typeName('Luna');
		fireEvent.change(chip(), { target: { value: '7051234' } });
		expect(screen.queryByText(chipWarning)).toBeNull(); // not while typing

		fireEvent.blur(chip());
		const warning = await screen.findByText(chipWarning);
		const status = warning.closest('[role="status"]')!;
		expect(chip().getAttribute('aria-describedby')).toContain(status.id);
		expect(chip().getAttribute('aria-invalid')).toBeNull();

		await save();
		expect(await saved()).toMatchObject({ species: 'cat', name: 'Luna', chip: '705 1234' });
	});

	it('shows no warning for a 15-digit number or an empty field', async () => {
		const { chip } = setup();
		fireEvent.blur(chip());
		fireEvent.change(chip(), { target: { value: '705123456789012' } });
		fireEvent.blur(chip());
		await waitFor(() => expect(chip().value).toBe('705 1234 5678 9012'));
		expect(screen.queryByText(chipWarning)).toBeNull();
	});

	it('is the same field for dogs and cats, with the vet note, the CRHŽ question and no lookup link', async () => {
		const { container, chooseSpecies, group, save, saved, typeName } = setup();
		for (const species of ['Pes', 'Mačka'] as const) {
			chooseSpecies(species);
			expect(screen.getByRole('textbox', { name: 'Številka čipa' })).toBeTruthy();
			expect(screen.getByText(/Čip prebere veterinar ali pristojno zavetišče/)).toBeTruthy();
		}
		expect(container.querySelector('a')).toBeNull();

		const crhz = group('Ali je čip v CRHŽ vpisan z vašo trenutno telefonsko številko?');
		expect(
			within(crhz)
				.getAllByRole('radio')
				.map((radio) => radio.textContent)
		).toEqual(['Da', 'Ne', 'Ne vem']);
		const reminder = 'Prosite veterinarja, naj v registru posodobi vašo telefonsko številko';
		expect(screen.queryByText(new RegExp(reminder))).toBeNull();
		fireEvent.click(within(crhz).getByRole('radio', { name: 'Ne' }));
		expect(screen.getByText(new RegExp(reminder))).toBeTruthy();
		fireEvent.click(within(crhz).getByRole('radio', { name: 'Da' }));
		expect(screen.queryByText(new RegExp(reminder))).toBeNull();

		typeName('Luna');
		await save();
		expect(await saved()).toMatchObject({ chip_registered_crhz: 'yes' });
	});
});

describe('PetFields species rules', () => {
	it('asks cats about the ear tip and indoor or outdoor, and clears both when the species becomes dog', async () => {
		const { chooseSpecies, group, typeName, save, saved } = setup();
		expect(screen.queryByRole('radiogroup', { name: 'Ali ima prirezano konico ušesa?' })).toBeNull();

		chooseSpecies('Mačka');
		fireEvent.click(within(group('Ali ima prirezano konico ušesa?')).getByRole('radio', { name: 'Da' }));
		fireEvent.click(within(group('Kje živi?')).getByRole('radio', { name: 'Samo notri' }));
		expect(
			within(group('Velikost'))
				.getAllByRole('radio')
				.map((radio) => radio.textContent)
		).toEqual(['Majhna', 'Srednja', 'Velika']);

		chooseSpecies('Pes');
		expect(screen.queryByRole('radiogroup', { name: 'Kje živi?' })).toBeNull();
		expect(within(group('Velikost')).getAllByRole('radio')).toHaveLength(5);
		typeName('Rex');
		await save();
		expect(await saved()).toMatchObject({ species: 'dog', ear_tip: null, lifestyle: null });
	});

	it('keeps breed and pattern disabled until the species is chosen', () => {
		setup();
		const breed = screen.getByRole('combobox', { name: 'Pasma' }) as HTMLInputElement;
		expect(breed.disabled).toBe(true);
		expect(breed.getAttribute('aria-describedby')).toBeTruthy();
		expect(document.getElementById(breed.getAttribute('aria-describedby')!)?.textContent).toBe(
			'Najprej izberite vrsto.'
		);
	});

	it('finds breeds by localised name, keeps Mixed and Not sure listed, and drops a breed of the other species', async () => {
		const { chooseSpecies, typeName, save, saved, onSave } = setup();
		chooseSpecies('Pes');
		const breed = screen.getByRole('combobox', { name: 'Pasma' }) as HTMLInputElement;
		const options = () =>
			within(screen.getByRole('listbox', { name: 'Pasma' }))
				.getAllByRole('option')
				.map((option) => option.textContent);

		fireEvent.change(breed, { target: { value: 'sarp' } });
		expect(breed.getAttribute('aria-expanded')).toBe('true');
		expect(options()).toEqual(['Šarplaninec', 'Mešanec', 'Ne vem']);

		fireEvent.change(breed, { target: { value: 'zzq' } });
		expect(options()).toEqual(['Mešanec', 'Ne vem']);
		expect(screen.getByText('Te pasme ne najdemo. Izberite Mešanec ali Ne vem.')).toBeTruthy();

		// Alphabetical in Slovenian; typing highlights the first match, ArrowDown moves to the next.
		fireEvent.change(breed, { target: { value: 'nemsk' } });
		expect(options().slice(0, 2)).toEqual(['Nemška doga', 'Nemški kratkodlaki ptičar']);
		fireEvent.keyDown(breed, { key: 'ArrowDown' });
		fireEvent.keyDown(breed, { key: 'Enter' });
		expect(breed.value).toBe('Nemški kratkodlaki ptičar');
		expect(breed.getAttribute('aria-expanded')).toBe('false');

		typeName('Rex');
		await save();
		expect(await saved()).toMatchObject({ breed_codes: ['dog.german_shorthaired_pointer'] });

		chooseSpecies('Mačka');
		expect(breed.value).toBe('');
		onSave.mockClear();
		await save();
		await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
		expect(onSave.mock.calls[0]![0]).toMatchObject({ species: 'cat', breed_codes: [] });
	});
});
