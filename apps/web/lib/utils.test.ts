import { afterEach, describe, expect, it } from 'vitest';

import { focusHeading } from './utils';

afterEach(() => {
	document.body.innerHTML = '';
});

describe('focusHeading', () => {
	it('focuses the first shown h1, skipping one in a hidden part of the flow', () => {
		document.body.innerHTML = '<main><form hidden><h1>Hidden</h1></form><h1>Shown</h1></main>';
		const cleanup = focusHeading(document.querySelector('main'));
		expect(document.activeElement?.textContent).toBe('Shown');
		expect((document.activeElement as HTMLElement).tabIndex).toBe(-1);
		expect(cleanup).toBeUndefined();
	});

	it('waits for the heading of a step that loads lazily (TASK-112)', async () => {
		document.body.innerHTML = '<main><form hidden><h1>Hidden</h1></form></main>';
		const main = document.querySelector('main')!;
		const cleanup = focusHeading(main);
		expect(document.activeElement).toBe(document.body);

		main.insertAdjacentHTML('afterbegin', '<div><h1>Kje ste ga nazadnje videli?</h1></div>');
		await Promise.resolve();
		expect(document.activeElement?.textContent).toBe('Kje ste ga nazadnje videli?');
		cleanup?.();
	});

	it('stops waiting on cleanup (the step changed before its heading came)', async () => {
		document.body.innerHTML = '<main></main>';
		const main = document.querySelector('main')!;
		focusHeading(main)?.();
		main.innerHTML = '<h1>Late</h1>';
		await Promise.resolve();
		expect(document.activeElement).toBe(document.body);
	});

	it('does nothing without a root', () => {
		expect(focusHeading(null)).toBeUndefined();
	});
});
