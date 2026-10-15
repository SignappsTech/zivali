import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Button } from './button';

afterEach(cleanup);

describe('Button', () => {
	it('is a plain button by default', () => {
		const onClick = vi.fn();
		render(<Button onClick={onClick}>Prijavi izgubljeno žival</Button>);
		const button = screen.getByRole('button', { name: 'Prijavi izgubljeno žival' });

		fireEvent.click(button);

		expect(onClick).toHaveBeenCalledOnce();
		expect(button.getAttribute('aria-busy')).toBeNull();
		expect(button.querySelector('[data-slot=spinner]')).toBeNull();
	});

	it('keeps the label, shows a spinner, sets aria-busy and ignores presses while loading', () => {
		const onClick = vi.fn();
		const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
		render(
			<form onSubmit={onSubmit}>
				<Button type="submit" loading onClick={onClick}>
					Pošlji
				</Button>
			</form>
		);
		const button = screen.getByRole('button', { name: 'Pošlji' });

		fireEvent.click(button);

		expect(button.getAttribute('aria-busy')).toBe('true');
		expect(button.textContent).toBe('Pošlji');
		expect(button.querySelector('[data-slot=spinner]')?.getAttribute('aria-hidden')).toBe('true');
		// Still focusable (not disabled), so focus does not jump away while the action runs.
		expect((button as HTMLButtonElement).disabled).toBe(false);
		expect(onClick).not.toHaveBeenCalled();
		expect(onSubmit).not.toHaveBeenCalled();
	});

	it('puts the spinner in place of the leading icon', () => {
		render(
			<Button variant="ghost" loading>
				<svg data-testid="icon" aria-hidden="true" />
				Deli ali natisni plakat
			</Button>
		);
		const button = screen.getByRole('button', { name: 'Deli ali natisni plakat' });

		// The icon is hidden by the aria-busy:[&>svg]:hidden rule, so the spinner takes its slot.
		expect(button.className).toContain('aria-busy:[&>svg]:hidden');
		expect(button.firstElementChild?.getAttribute('data-slot')).toBe('spinner');
	});
});
