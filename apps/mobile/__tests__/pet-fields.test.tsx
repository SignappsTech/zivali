import { fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { FormProvider } from 'react-hook-form';
import { AccessibilityInfo } from 'react-native';
import { IntlProvider } from 'use-intl';

import sl from '@zivali/i18n/dist/sl.json';
import { formatChip, PetFields, type PetFieldsVariant, usePetForm } from '@/components/pets/pet-fields';
import { Button } from '@/components/ui/button';

const t = sl.pets;

function Harness({ onValid, variant }: { onValid: (values: unknown) => void; variant?: PetFieldsVariant }) {
	const form = usePetForm();
	return (
		<IntlProvider locale="sl" messages={sl} timeZone="Europe/Ljubljana">
			<FormProvider {...form}>
				<PetFields variant={variant} />
				<Button onPress={form.handleSubmit(onValid)}>Shrani</Button>
			</FormProvider>
		</IntlProvider>
	);
}

async function setup(variant?: PetFieldsVariant) {
	const onValid = jest.fn();
	await render(<Harness onValid={onValid} variant={variant} />);
	return onValid;
}

const save = () => fireEvent.press(screen.getByRole('button', { name: 'Shrani' }));
const chipInput = () => screen.getByLabelText(t.chip_label);

async function fillRequired(species: 'Pes' | 'Mačka' = 'Pes') {
	await fireEvent.press(screen.getByRole('radio', { name: species }));
	await fireEvent.changeText(screen.getByLabelText(t.name_label), 'Runo');
}

describe('PetFields', () => {
	let announce: jest.SpyInstance;
	beforeEach(() => {
		announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});
	});
	afterEach(() => announce.mockRestore());

	test('blocks saving without species and name, with the errors shown and announced', async () => {
		const onValid = await setup();

		await save();

		await waitFor(() => expect(screen.getAllByRole('alert')).toHaveLength(2));
		const [speciesError, nameError] = screen.getAllByRole('alert');
		expect(speciesError).toHaveTextContent(t.species_required);
		expect(nameError).toHaveTextContent(t.name_required);
		expect(announce).toHaveBeenCalledWith(t.species_required);
		expect(announce).toHaveBeenCalledWith(t.name_required);
		// The name error is read with the field.
		expect(screen.getByLabelText(t.name_label).props.accessibilityHint).toBe(t.name_required);
		expect(onValid).not.toHaveBeenCalled();
	});

	test('saves the PetInput values once species and name are given', async () => {
		const onValid = await setup();
		await fillRequired();
		await fireEvent.press(screen.getByRole('radio', { name: 'Samica' }));
		await fireEvent.press(screen.getByRole('checkbox', { name: 'Črna' }));
		await fireEvent.press(screen.getByRole('checkbox', { name: 'Bela' }));
		await fireEvent.press(screen.getByRole('checkbox', { name: 'Črna' }));

		await save();

		await waitFor(() => expect(onValid).toHaveBeenCalledTimes(1));
		expect(onValid.mock.calls[0][0]).toMatchObject({
			species: 'dog',
			name: 'Runo',
			sex: 'female',
			colours: ['white'],
			breed_codes: [],
		});
		expect(screen.getByRole('radio', { name: 'Samica' })).toBeChecked();
		expect(screen.queryByRole('alert')).toBeNull();
	});

	test('chip: digits grouped as typed, help and register note, no link', async () => {
		await setup();

		await fireEvent.changeText(chipInput(), '705-1234.5678x9012');

		expect(chipInput().props.value).toBe('705 1234 5678 9012');
		expect(chipInput().props.accessibilityHint).toBe(t.chip_help);
		expect(chipInput().props.keyboardType).toBe('number-pad');
		expect(screen.getByText(t.chip_register_note)).toBeOnTheScreen();
		expect(screen.queryAllByRole('link')).toHaveLength(0);
		expect(screen.queryByText(t.chip_warning)).toBeNull();
	});

	test('chip: a short number warns once the field is left, and saving still goes through', async () => {
		const onValid = await setup();
		await fillRequired();

		await fireEvent.changeText(chipInput(), '705 1234');
		expect(screen.queryByText(t.chip_warning)).toBeNull();
		await fireEvent(chipInput(), 'blur');

		expect(within(screen.getByRole('status')).getByText(t.chip_warning)).toBeOnTheScreen();
		await save();
		await waitFor(() => expect(onValid).toHaveBeenCalledTimes(1));
		expect(onValid.mock.calls[0][0]).toMatchObject({ chip: '705 1234' });

		// A valid number takes the warning away.
		await fireEvent.changeText(chipInput(), '705123456789012');
		expect(screen.queryByText(t.chip_warning)).toBeNull();
	});

	test('chip field is the same for dogs and cats', async () => {
		await setup();
		await fireEvent.press(screen.getByRole('radio', { name: 'Pes' }));
		expect(chipInput()).toBeOnTheScreen();
		await fireEvent.press(screen.getByRole('radio', { name: 'Mačka' }));
		expect(chipInput()).toBeOnTheScreen();
		expect(screen.getByText(t.chip_register_note)).toBeOnTheScreen();
	});

	test('asks whether CRHŽ has the current phone number, with the vet reminder on no or not sure', async () => {
		const onValid = await setup();
		await fillRequired();
		const question = screen.getByLabelText(t.crhz_label);
		expect(within(question).getAllByRole('radio')).toHaveLength(3);
		expect(screen.queryByText(t.crhz_reminder)).toBeNull();

		await fireEvent.press(within(question).getByRole('radio', { name: 'Da' }));
		expect(screen.queryByText(t.crhz_reminder)).toBeNull();
		await fireEvent.press(within(question).getByRole('radio', { name: 'Ne' }));
		expect(screen.getByText(t.crhz_reminder)).toBeOnTheScreen();
		await fireEvent.press(within(question).getByRole('radio', { name: t.answer_unknown }));
		expect(screen.getByText(t.crhz_reminder)).toBeOnTheScreen();

		await save();
		await waitFor(() => expect(onValid).toHaveBeenCalledTimes(1));
		expect(onValid.mock.calls[0][0]).toMatchObject({ chip_registered_crhz: 'unknown' });
	});

	test('cats get ear tip and where they live; switching to a dog clears them', async () => {
		const onValid = await setup();
		expect(screen.queryByLabelText(t.ear_tip_label)).toBeNull();
		expect(screen.queryByLabelText(t.lifestyle_label)).toBeNull();

		await fillRequired('Mačka');
		const earTip = screen.getByLabelText(t.ear_tip_label);
		await fireEvent.press(within(earTip).getByRole('radio', { name: t.answer_unknown }));
		expect(within(earTip).getByRole('radio', { name: t.answer_unknown })).toBeChecked();
		expect(screen.getByText(t.ear_tip_help)).toBeOnTheScreen();
		await fireEvent.press(within(earTip).getByRole('radio', { name: t.answer_yes }));
		await fireEvent.press(screen.getByRole('radio', { name: t.lifestyle.outdoor }));
		// Cats show three sizes, dogs five with the weight help.
		const sizes = screen.getByLabelText(t.size_label);
		expect(within(sizes).getAllByRole('radio')).toHaveLength(3);
		await fireEvent.press(within(sizes).getByRole('radio', { name: 'Majhna' }));

		await save();
		await waitFor(() => expect(onValid).toHaveBeenCalledTimes(1));
		expect(onValid.mock.calls[0][0]).toMatchObject({
			species: 'cat',
			ear_tip: true,
			lifestyle: 'outdoor',
			size: 's',
		});

		await fireEvent.press(screen.getByRole('radio', { name: 'Pes' }));
		expect(screen.queryByLabelText(t.ear_tip_label)).toBeNull();
		expect(within(screen.getByLabelText(t.size_label)).getAllByRole('radio')).toHaveLength(5);
		expect(screen.getByText(sl.attributes.size_help_dog)).toBeOnTheScreen();
		await save();
		await waitFor(() => expect(onValid).toHaveBeenCalledTimes(2));
		expect(onValid.mock.calls[1][0]).toMatchObject({ species: 'dog', ear_tip: null, lifestyle: null, size: 's' });
	});

	test('breed is searched among the chosen species, with Mixed breed and Not sure when nothing matches', async () => {
		const onValid = await setup();
		const breed = () => screen.getByPlaceholderText(t.breed_search);
		expect(breed().props.editable).toBe(false);
		expect(breed().props.accessibilityHint).toBe(t.species_first);

		await fillRequired();
		await fireEvent.changeText(breed(), 'labr');
		const results = () => within(screen.getAllByLabelText(t.breed_label)[1]!).getAllByRole('radio');
		// Matches first, then Mixed breed and Not sure, always last.
		expect(results().map((row) => within(row).getByText(/./).props.children)).toEqual([
			'Labradorec',
			'Mešanec',
			'Ne vem',
		]);
		await fireEvent.press(screen.getByRole('radio', { name: 'Labradorec' }));
		expect(breed().props.value).toBe('Labradorec');
		expect(screen.queryByRole('radio', { name: 'Mešanec' })).toBeNull();

		await fireEvent.changeText(breed(), 'zzq');
		expect(breed().props.accessibilityHint).toBe(t.breed_none);
		expect(results().map((row) => within(row).getByText(/./).props.children)).toEqual(['Mešanec', 'Ne vem']);

		// Accents and case are ignored; cat breeds are not offered for a dog.
		await fireEvent.changeText(breed(), 'SARPL');
		expect(screen.getByRole('radio', { name: 'Šarplaninec' })).toBeOnTheScreen();
		await fireEvent.changeText(breed(), 'evropska');
		expect(screen.getByText(t.breed_none)).toBeOnTheScreen();

		await save();
		await waitFor(() => expect(onValid).toHaveBeenCalledTimes(1));
		expect(onValid.mock.calls[0][0]).toMatchObject({ breed_codes: ['dog.labrador_retriever'] });
	});

	test('the breed search text goes on blur without a pick and with a species change; rows are 44 pt or more', async () => {
		const onValid = await setup();
		const breed = () => screen.getByPlaceholderText(t.breed_search);
		await fillRequired();

		await fireEvent.changeText(breed(), 'labr');
		const row = screen.getByRole('radio', { name: 'Labradorec' });
		const minHeight = Number(/\bmin-h-(\d+)\b/.exec(row.props.className)?.[1]) * 4;
		expect(minHeight).toBeGreaterThanOrEqual(44);
		// Left without a pick: the field shows the saved breed (none), not the search.
		await fireEvent(breed(), 'blur');
		expect(breed().props.value).toBe('');
		expect(screen.queryByRole('radio', { name: 'Labradorec' })).toBeNull();

		await fireEvent.changeText(breed(), 'labr');
		await fireEvent.press(screen.getByRole('radio', { name: 'Labradorec' }));
		await fireEvent.changeText(breed(), 'beag');
		await fireEvent(breed(), 'blur');
		expect(breed().props.value).toBe('Labradorec');

		// A species switch drops the search with the dog breed.
		await fireEvent.changeText(breed(), 'evrop');
		await fireEvent.press(screen.getByRole('radio', { name: 'Mačka' }));
		expect(breed().props.value).toBe('');
		expect(screen.queryByRole('radio', { name: 'Evropska kratkodlaka' })).toBeNull();

		await save();
		await waitFor(() => expect(onValid).toHaveBeenCalledTimes(1));
		expect(onValid.mock.calls[0][0]).toMatchObject({ species: 'cat', breed_codes: [] });
	});

	test('blank notes are no value, so saving is not blocked', async () => {
		const onValid = await setup();
		await fillRequired();
		await fireEvent.changeText(screen.getByLabelText(t.collar_label), 'Rdeča');
		await fireEvent.changeText(screen.getByLabelText(t.collar_label), '  ');
		await fireEvent.changeText(screen.getByLabelText(t.notes_label), 'Plašna');

		await save();

		await waitFor(() => expect(onValid).toHaveBeenCalledTimes(1));
		expect(onValid.mock.calls[0][0]).toMatchObject({ collar: null, notes: 'Plašna' });
		expect(screen.getByText(t.notes_private)).toBeOnTheScreen();
	});

	test('the lost flow variant leaves out the profile-only fields', async () => {
		await setup('report');

		expect(screen.getByLabelText(t.name_label)).toBeOnTheScreen();
		expect(chipInput()).toBeOnTheScreen();
		expect(screen.getByLabelText(t.collar_label)).toBeOnTheScreen();
		expect(screen.queryByRole('combobox', { name: t.birth_year_label })).toBeNull();
		expect(screen.queryByLabelText(t.crhz_label)).toBeNull();
		expect(screen.queryByLabelText(t.notes_label)).toBeNull();
	});

	test('formatChip keeps at most 20 digits', () => {
		expect(formatChip('')).toBe('');
		expect(formatChip('7051')).toBe('705 1');
		expect(formatChip('1'.repeat(25)).replace(/ /g, '')).toHaveLength(20);
	});
});
