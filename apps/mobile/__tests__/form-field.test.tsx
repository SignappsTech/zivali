import { fireEvent, render, screen, within } from '@testing-library/react-native';
import { useState } from 'react';
import { AccessibilityInfo, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

const label = 'Številka čipa (neobvezno)';
const hint = 'Običajno ima 15 števk, na primer 705 1234 5678 9012.';
const warning = 'Številka čipa je običajno dolga 15 števk.';

/** A chip-number form that validates on submit, like a feature form would. */
function ChipForm() {
	const [chip, setChip] = useState('');
	const [error, setError] = useState<string>();
	return (
		<View>
			<FormField label={label} hint={hint} error={error}>
				<Input value={chip} onChangeText={setChip} />
			</FormField>
			<Button onPress={() => setError(chip.replace(/\s/g, '').length === 15 ? undefined : warning)}>
				Pošlji
			</Button>
		</View>
	);
}

describe('FormField', () => {
	let announce: jest.SpyInstance;
	beforeEach(() => {
		announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});
	});
	afterEach(() => announce.mockRestore());

	test('names the control with the label and describes it with the help text', async () => {
		await render(<ChipForm />);
		const input = screen.getByLabelText(label);

		expect(input.props.accessibilityHint).toBe(hint);
		expect(input.props.editable).toBe(true);
		expect(screen.queryByRole('alert')).toBeNull();
	});

	test('shows and announces the error on submit and reads it with the control', async () => {
		await render(<ChipForm />);
		const input = screen.getByLabelText(label);

		await fireEvent.changeText(input, '705 1234 567');
		await fireEvent.press(screen.getByRole('button', { name: 'Pošlji' }));

		expect(screen.getByRole('alert')).toHaveTextContent(warning);
		expect(announce).toHaveBeenCalledWith(warning);
		// The description includes the error, so it is read again when the field gets focus.
		expect(screen.getByLabelText(label).props.accessibilityHint).toBe(`${hint} ${warning}`);
	});

	test('clears the error once the value is valid', async () => {
		await render(<ChipForm />);
		await fireEvent.press(screen.getByRole('button', { name: 'Pošlji' }));
		expect(screen.getByRole('alert')).toBeOnTheScreen();

		await fireEvent.changeText(screen.getByLabelText(label), '705 1234 5678 9012');
		await fireEvent.press(screen.getByRole('button', { name: 'Pošlji' }));

		expect(screen.queryByRole('alert')).toBeNull();
		expect(screen.getByLabelText(label).props.accessibilityHint).toBe(hint);
	});

	test('does not announce an error that is there when the field first renders', async () => {
		await render(
			<FormField label={label} error={warning}>
				<Input />
			</FormField>
		);

		expect(screen.getByRole('alert')).toHaveTextContent(warning);
		expect(announce).not.toHaveBeenCalled();
	});

	test('disables the control and keeps the reason in the help text', async () => {
		await render(
			<FormField label={label} hint="Ta prijava je zaključena." disabled>
				<Textarea />
			</FormField>
		);
		const textarea = screen.getByLabelText(label);

		expect(textarea.props.editable).toBe(false);
		expect(textarea.props.multiline).toBe(true);
		expect(textarea.props.accessibilityHint).toBe('Ta prijava je zaključena.');
	});

	test('wires a Select trigger the same way', async () => {
		await render(
			<FormField label="Regija" error="Izberite regijo.">
				<Select defaultValue="gorenjska">
					<SelectTrigger>
						<SelectValue placeholder="Vsa Slovenija" />
					</SelectTrigger>
					<SelectContent closeLabel="Zapri">
						<SelectItem value="gorenjska">Gorenjska</SelectItem>
					</SelectContent>
				</Select>
			</FormField>
		);
		const trigger = screen.getByRole('combobox', { name: 'Regija' });

		expect(trigger.props.accessibilityHint).toBe('Izberite regijo.');
		// The chosen option's label shows before the sheet has ever opened.
		expect(within(trigger).getByText('Gorenjska')).toBeOnTheScreen();
		expect(trigger).toHaveAccessibilityValue({ text: 'Gorenjska' });
	});
});
