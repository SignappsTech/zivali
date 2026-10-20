import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import * as React from 'react';
import { afterEach, describe, expect, it } from 'vitest';

import en from '@zivali/i18n/dist/en.json';

import { focusOpener, Lightbox, type LightboxPhoto } from './lightbox';

afterEach(cleanup);

const photos: LightboxPhoto[] = ['a', 'b', 'c'].map((name) => ({
	url: `https://media.test/r/1/${name}/display.jpg`,
	thumb_url: `https://media.test/r/1/${name}/thumb.webp`,
	alt: `Photo ${name}`,
	width: 1200,
	height: 900,
}));

/** A button that opens the gallery at `at`, as the report, pet and manage pages do. */
function Harness({ list = photos, at = 1 }: { list?: LightboxPhoto[]; at?: number }) {
	const [index, setIndex] = React.useState<number | null>(null);
	return (
		<NextIntlClientProvider locale="en" messages={en}>
			<button
				type="button"
				onClick={(event) => {
					focusOpener(event);
					setIndex(at);
				}}
			>
				Open
			</button>
			<Lightbox photos={list} index={index} onIndexChange={setIndex} />
		</NextIntlClientProvider>
	);
}

/** Opens with a click on an unfocused button, as in Safari, which does not focus a button on click. */
function open(props?: { list?: LightboxPhoto[]; at?: number }) {
	render(<Harness {...props} />);
	const opener = screen.getByRole('button', { name: 'Open' });
	fireEvent.click(opener);
	return { opener, dialog: screen.getByRole('dialog', { name: 'Photos' }) };
}

const shown = (dialog: HTMLElement) => within(dialog).getAllByRole('img')[0]!.getAttribute('alt');
const current = (dialog: HTMLElement) =>
	within(dialog)
		.getAllByRole('button', { name: /^Show photo/ })
		.find((thumb) => thumb.getAttribute('aria-current') === 'true')
		?.getAttribute('aria-label');

describe('Lightbox (GH #4, #7)', () => {
	it('is not in the page while closed, so no large file loads before it opens', () => {
		render(<Harness />);
		expect(screen.queryByRole('dialog')).toBeNull();
		expect(document.querySelectorAll('img')).toHaveLength(0);
	});

	it('opens fullscreen at the photo asked for, with the count, the selected thumbnail and named 44 px controls', () => {
		const { dialog } = open();
		expect(dialog.getAttribute('aria-modal')).toBe('true');
		expect(dialog.className).toContain('fixed inset-0');
		const big = within(dialog).getByRole('img', { name: 'Photo b' });
		// The C5 display file, as WebP where the gallery has one.
		expect(big.getAttribute('src')).toBe(photos[1]!.url);
		expect(big.getAttribute('srcset')).toBe('https://media.test/r/1/b/display.webp');
		expect(big.className).toContain('object-contain');
		expect(within(dialog).getByText('2 / 3').getAttribute('aria-live')).toBe('polite');
		expect(current(dialog)).toBe('Show photo 2');
		for (const name of ['Close', 'Previous photo', 'Next photo'])
			expect(within(dialog).getByRole('button', { name }).className).toContain('size-11');
		// Focus starts inside, on the close button.
		expect(document.activeElement).toBe(within(dialog).getByRole('button', { name: 'Close' }));
	});

	it('moves with the arrow buttons and the arrow keys, round the set', () => {
		const { dialog } = open();
		fireEvent.click(within(dialog).getByRole('button', { name: 'Next photo' }));
		expect(shown(dialog)).toBe('Photo c');
		fireEvent.click(within(dialog).getByRole('button', { name: 'Next photo' }));
		expect(shown(dialog)).toBe('Photo a');
		expect(within(dialog).getByText('1 / 3')).toBeTruthy();
		expect(current(dialog)).toBe('Show photo 1');
		fireEvent.click(within(dialog).getByRole('button', { name: 'Previous photo' }));
		expect(shown(dialog)).toBe('Photo c');

		fireEvent.keyDown(document.activeElement!, { key: 'ArrowLeft' });
		expect(shown(dialog)).toBe('Photo b');
		fireEvent.keyDown(document.activeElement!, { key: 'ArrowRight' });
		expect(shown(dialog)).toBe('Photo c');
	});

	it('moves with a sideways swipe and ignores taps and vertical moves', () => {
		const { dialog } = open();
		const area = within(dialog).getByRole('img', { name: 'Photo b' }).parentElement!;
		const swipe = (from: [number, number], to: [number, number]) => {
			const start = [{ clientX: from[0], clientY: from[1] }];
			fireEvent.touchStart(area, { touches: start, changedTouches: start });
			fireEvent.touchEnd(area, { touches: [], changedTouches: [{ clientX: to[0], clientY: to[1] }] });
		};
		swipe([300, 200], [120, 210]);
		expect(shown(dialog)).toBe('Photo c');
		swipe([100, 200], [280, 190]);
		expect(shown(dialog)).toBe('Photo b');
		swipe([200, 200], [215, 200]);
		swipe([200, 100], [150, 400]);
		expect(shown(dialog)).toBe('Photo b');
	});

	it('jumps to a thumbnail and marks it', () => {
		const { dialog } = open();
		fireEvent.click(within(dialog).getByRole('button', { name: 'Show photo 3' }));
		expect(shown(dialog)).toBe('Photo c');
		expect(current(dialog)).toBe('Show photo 3');
	});

	it.each([
		[
			'the close button',
			(dialog: HTMLElement) => fireEvent.click(within(dialog).getByRole('button', { name: 'Close' })),
		],
		['Escape', (dialog: HTMLElement) => fireEvent.keyDown(dialog, { key: 'Escape' })],
	])('closes with %s and returns focus to what opened it', async (_, close) => {
		const { opener, dialog } = open();
		close(dialog);
		expect(screen.queryByRole('dialog')).toBeNull();
		// Radix moves focus on close after a tick.
		await waitFor(() => expect(document.activeElement).toBe(opener));
	});

	it('shows one photo without the count, arrows or thumbnails', () => {
		const { dialog } = open({ list: [photos[0]!], at: 0 });
		expect(within(dialog).getByRole('img', { name: 'Photo a' })).toBeTruthy();
		expect(
			within(dialog)
				.getAllByRole('button')
				.map((button) => button.getAttribute('aria-label'))
		).toEqual(['Close']);
		expect(within(dialog).queryByText('1 / 1')).toBeNull();
	});

	it('shows the placeholder for a photo that fails to load', () => {
		const { dialog } = open();
		fireEvent.error(within(dialog).getByRole('img', { name: 'Photo b' }));
		expect(within(dialog).getByRole('img', { name: en.report.photo_failed })).toBeTruthy();
		fireEvent.click(within(dialog).getByRole('button', { name: 'Next photo' }));
		expect(shown(dialog)).toBe('Photo c');
	});
});
