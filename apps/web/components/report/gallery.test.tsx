import { cleanup, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it } from 'vitest';

import en from '@zivali/i18n/dist/en.json';
import type { PublicPhoto } from '@zivali/types';

import { Gallery } from './gallery';

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

	it('crops the thumbnails near the top, so the head stays in view', () => {
		const { container } = show(photos);
		const thumbs = container.querySelectorAll('button img');
		expect(thumbs).toHaveLength(2);
		for (const thumb of thumbs) expect(thumb.className).toContain('object-cover object-[50%_10%]');
	});
});
