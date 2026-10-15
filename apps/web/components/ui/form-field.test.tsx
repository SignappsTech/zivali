import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it } from 'vitest';

import { FormField } from './form-field';
import { Input } from './input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';
import { Textarea } from './textarea';

afterEach(cleanup);

const label = 'Številka čipa (neobvezno)';
const hint = 'Običajno ima 15 števk, na primer 705 1234 5678 901.';
const warning = 'Številka čipa je običajno dolga 15 števk.';

/** A chip-number form that validates on submit, like a feature form would. */
function ChipForm() {
	const [error, setError] = useState<string>();
	return (
		<form
			onSubmit={(event) => {
				event.preventDefault();
				const chip = new FormData(event.currentTarget).get('chip')?.toString().replace(/\s/g, '') ?? '';
				setError(chip.length === 15 ? undefined : warning);
			}}
		>
			<FormField label={label} hint={hint} error={error}>
				<Input name="chip" />
			</FormField>
			<button type="submit">Pošlji</button>
		</form>
	);
}

const describedBy = (element: HTMLElement) => (element.getAttribute('aria-describedby') ?? '').split(' ');

describe('FormField', () => {
	it('labels the control and describes it with the help text', () => {
		render(<ChipForm />);
		const input = screen.getByLabelText(label);

		expect(input.tagName).toBe('INPUT');
		expect(input.getAttribute('aria-invalid')).toBeNull();
		expect(describedBy(input)).toEqual([screen.getByText(hint).id]);
		expect(screen.queryByRole('alert')).toBeNull();
	});

	it('announces the error on submit and ties it to the control', () => {
		render(<ChipForm />);
		const input = screen.getByLabelText(label);
		fireEvent.change(input, { target: { value: '705 1234 567' } });
		fireEvent.click(screen.getByRole('button', { name: 'Pošlji' }));

		// role="alert" is a live region: screen readers read it as it appears.
		const alert = screen.getByRole('alert');
		expect(alert.textContent).toBe(warning);
		expect(input.getAttribute('aria-invalid')).toBe('true');
		expect(describedBy(input)).toEqual([screen.getByText(hint).id, alert.id]);
		// The control's description includes the error, so it is read again when the field gets focus.
		expect(alert.id).not.toBe('');
	});

	it('clears the error once the value is valid', () => {
		render(<ChipForm />);
		const input = screen.getByLabelText(label);
		fireEvent.click(screen.getByRole('button', { name: 'Pošlji' }));
		expect(screen.getByRole('alert')).toBeTruthy();

		fireEvent.change(input, { target: { value: '705 1234 5678 9012' } });
		fireEvent.click(screen.getByRole('button', { name: 'Pošlji' }));

		expect(screen.queryByRole('alert')).toBeNull();
		expect(input.getAttribute('aria-invalid')).toBeNull();
		expect(describedBy(input)).toEqual([screen.getByText(hint).id]);
	});

	it('disables the control and keeps the reason in the help text', () => {
		render(
			<FormField label={label} hint="Ta prijava je zaključena." disabled>
				<Textarea />
			</FormField>
		);
		const textarea = screen.getByLabelText(label);

		expect(textarea.tagName).toBe('TEXTAREA');
		expect((textarea as HTMLTextAreaElement).disabled).toBe(true);
		expect(describedBy(textarea)).toEqual([screen.getByText('Ta prijava je zaključena.').id]);
	});

	it('wires a Select trigger the same way', () => {
		render(
			<FormField label="Regija" error="Izberite regijo.">
				<Select>
					<SelectTrigger>
						<SelectValue placeholder="Vsa Slovenija" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="gorenjska">Gorenjska</SelectItem>
					</SelectContent>
				</Select>
			</FormField>
		);
		const trigger = screen.getByRole('combobox', { name: 'Regija' });

		expect(trigger.getAttribute('aria-invalid')).toBe('true');
		expect(describedBy(trigger)).toEqual([screen.getByRole('alert').id]);
	});
});
