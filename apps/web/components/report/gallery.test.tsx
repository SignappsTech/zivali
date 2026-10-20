import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it } from 'vitest';

import en from '@zivali/i18n/dist/en.json';
import type { PublicPhoto } from '@zivali/types';

import { Gallery, photoSources } from './gallery';

afterEach(cleanup);

// A portrait 3:4 phone photo and a landscape 4:3 one (TASK-114.43).
const photos: PublicPhoto[] = [
	{
		url: 'https://media.test/tall.webp',
		thumb_url: 'https://media.test/tall-t.webp',
		alt: 'Tall',
		width: 900,
		height: 1200,
	},
	{
		url: 'https://media.test/wide.webp',
		thumb_url: 'https://media.test/wide-t.webp',
		alt: 'Wide',
		width: 1200,
		height: 900,
	},
];

const show = (list: PublicPhoto[]) =>
	render(
		<NextIntlClientProvider locale="en" messages={en}>
			<Gallery photos={list} />
		</NextIntlClientProvider>
	);

describe('Gallery photo frames (TASK-114.43)', () => {
	it.each(photos)('shows the main $alt photo whole in its 4:3 frame, letterboxed on bg-muted', (photo) => {
		show([photo]);
		const main = screen.getByRole('img', { name: photo.alt });
		expect(main.className).toContain('object-contain');
		expect(main.className).toContain('aspect-[4/3]');
		expect(main.className).toContain('bg-muted');
		expect(main.className).not.toContain('object-cover');
	});

	// TASK-18.5: a phone loads the 480 px thumb, not the 300 KB display JPEG; the WebP display stays for large screens.
	it('offers the thumb and the WebP display with the width the photo shows at', () => {
		show([
			{
				...photos[0]!,
				url: 'https://media.test/r/1/2/display.jpg',
				thumb_url: 'https://media.test/r/1/2/thumb.webp',
			},
		]);
		const main = screen.getByRole('img', { name: 'Tall' });
		expect(main.getAttribute('src')).toBe('https://media.test/r/1/2/display.jpg');
		// TASK-18.9: the 360 px thumb counts as 378w, so a 412 px phone at DPR 1.75 (needs 366 px) takes it.
		expect(main.getAttribute('srcset')).toBe(
			'https://media.test/r/1/2/thumb.webp 378w, https://media.test/r/1/2/display.webp 900w'
		);
		// 3:4 in the 4:3 frame fills 56.25 % of its width.
		expect(main.getAttribute('sizes')).toBe(
			'(min-width: 1024px) 360px, (min-width: 768px) calc((100vw - 96px) * 0.5625), calc((100vw - 40px) * 0.5625)'
		);
		expect(main.getAttribute('fetchpriority')).toBe('high');
	});

	it('sizes a wide photo to the whole frame, and skips a thumb that is no smaller', () => {
		expect(photoSources(photos[1]!)).toEqual({
			srcSet: 'https://media.test/wide-t.webp 504w, https://media.test/wide.webp 1200w',
			sizes: '(min-width: 1024px) 640px, (min-width: 768px) calc((100vw - 96px) * 1), calc((100vw - 40px) * 1)',
		});
		const small = { ...photos[1]!, width: 400, height: 320 };
		expect(photoSources(small).srcSet).toBe('https://media.test/wide.webp 400w');
	});

	it('crops the thumbnails near the top, so the head stays in view', () => {
		const { container } = show(photos);
		const thumbs = container.querySelectorAll('li img');
		expect(thumbs).toHaveLength(2);
		for (const thumb of thumbs) expect(thumb.className).toContain('object-cover object-[50%_10%]');
	});

	it('wraps the controls under the thumbnails instead of overflowing at 200% text (TASK-18.11)', () => {
		const { container } = show(photos);
		const row = container.querySelector('ul')!;
		expect(row.parentElement!.className).toContain('flex-wrap');
		expect(row.className).toContain('basis-24');
	});

	// TASK-18.9: in view, Chrome raises lazy thumbnails to High, where they compete with the main photo (the LCP).
	it('loads the thumbnails at low priority, the main photo at high', () => {
		const { container } = show(photos);
		for (const thumb of container.querySelectorAll('li img')) {
			expect(thumb.getAttribute('fetchpriority')).toBe('low');
		}
		expect(screen.getByRole('img', { name: 'Tall' }).getAttribute('fetchpriority')).toBe('high');
	});
});

describe('Gallery opens the fullscreen gallery (GH #4, #7)', () => {
	it('opens at the main photo, which stays the same image in the page (the LCP)', () => {
		const { container } = show(photos);
		// Only the main photo and the thumbnails until it opens: no large file loads before.
		expect(container.querySelectorAll('img')).toHaveLength(3);
		expect(screen.queryByRole('dialog')).toBeNull();
		const button = screen.getByRole('button', { name: 'Tall Open full screen' });
		expect(button.querySelector('img')!.getAttribute('fetchpriority')).toBe('high');
		fireEvent.click(button);
		const dialog = screen.getByRole('dialog', { name: 'Photos' });
		expect(within(dialog).getByRole('img', { name: 'Tall' }).getAttribute('src')).toBe(photos[0]!.url);
		expect(within(dialog).getByText('1 / 2')).toBeTruthy();
	});

	it('opens at a thumbnail, shows it in the page too and returns focus to it on close', async () => {
		show(photos);
		const thumb = screen.getByRole('button', { name: 'Show photo 2' });
		// No focus before the click, as in Safari: the thumbnail takes it itself.
		fireEvent.click(thumb);
		const dialog = screen.getByRole('dialog', { name: 'Photos' });
		expect(within(dialog).getByRole('img', { name: 'Wide' })).toBeTruthy();
		expect(within(dialog).getByRole('button', { name: 'Show photo 2' }).getAttribute('aria-current')).toBe('true');
		fireEvent.keyDown(dialog, { key: 'Escape' });
		expect(screen.queryByRole('dialog')).toBeNull();
		await waitFor(() => expect(document.activeElement).toBe(thumb));
		expect(screen.getByRole('button', { name: 'Wide Open full screen' })).toBeTruthy();
		expect(thumb.getAttribute('aria-current')).toBe('true');
	});

	it('does not open from the placeholder of a photo that failed', () => {
		show([photos[0]!]);
		fireEvent.error(screen.getByRole('img', { name: 'Tall' }));
		expect(screen.queryByRole('button')).toBeNull();
	});
});
