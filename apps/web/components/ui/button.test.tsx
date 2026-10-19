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

	// TASK-18.8: at 200 % text a label wider than its container wraps inside the pill (e2e/large-text.spec.ts measures it).
	it('wraps a label that does not fit instead of overflowing; the side padding stops at its 100 % size', () => {
		render(
			<>
				<Button size="sm">Nazaj</Button>
				<Button>Sporoči opažanje</Button>
				<Button size="lg">Deli ali natisni plakat</Button>
				<Button variant="text" size="lg">
					To je moja žival
				</Button>
			</>
		);
		const [sm, md, lg, text] = screen.getAllByRole('button');

		for (const button of [sm, md, lg, text]) {
			expect(button.className).not.toContain('whitespace-nowrap');
			expect(button.className.split(' ')).toEqual(
				expect.arrayContaining(['max-w-full', 'min-w-fit', 'wrap-anywhere', 'py-2'])
			);
		}
		expect(sm!.className).toContain('px-[min(1.125rem,18px)]');
		expect(md!.className).toContain('px-[min(1.5rem,24px)]');
		expect(lg!.className).toContain('px-[min(2rem,32px)]');
		// The quiet text button keeps its 12 px padding in rem: call sites offset it with -ml-3 to align the label.
		expect(text!.className.split(' ')).toContain('px-3');
		expect(text!.className).not.toContain('px-[min(');
	});
});
