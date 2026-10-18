import { afterEach, expect, test, vi } from 'vitest';

import { themeScript } from './theme';

const html = document.documentElement;
const settle = () => new Promise((resolve) => setTimeout(resolve));
const observers: MutationObserver[] = [];

/** Runs the inline script against a stubbed OS setting; `setDark` changes it live, as the OS would. */
function run(dark: boolean) {
	let onChange = () => {};
	const query = {
		matches: dark,
		addEventListener: (_type: string, listener: () => void) => (onChange = listener),
	};
	vi.stubGlobal('matchMedia', () => query);
	// Tracked, so each test disconnects its observer and the next one starts clean.
	vi.stubGlobal(
		'MutationObserver',
		class extends MutationObserver {
			constructor(callback: MutationCallback) {
				super(callback);
				observers.push(this);
			}
		}
	);
	new Function(themeScript)();
	return {
		setDark(next: boolean) {
			query.matches = next;
			onChange();
		},
	};
}

afterEach(() => {
	for (const observer of observers.splice(0)) observer.disconnect();
	vi.unstubAllGlobals();
	html.removeAttribute('class');
});

test('dark follows the OS on the first run and live after it', async () => {
	const os = run(true);
	expect(html.classList.contains('dark')).toBe(true);

	os.setDark(false);
	await settle();
	expect(html.classList.contains('dark')).toBe(false);

	os.setDark(true);
	expect(html.classList.contains('dark')).toBe(true);
});

test('dark comes back when React remounts <html> and clears its attributes (language switch)', async () => {
	run(true);
	html.removeAttribute('class');
	await settle();
	expect(html.classList.contains('dark')).toBe(true);

	// Other classes stay as React sets them.
	html.className = 'other';
	await settle();
	expect(html.className).toBe('other dark');
});

test('light stays light after the remount', async () => {
	run(false);
	html.className = '';
	await settle();
	expect(html.classList.contains('dark')).toBe(false);
});
