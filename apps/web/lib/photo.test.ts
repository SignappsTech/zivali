import * as fs from 'node:fs';
import * as path from 'node:path';

import { describe, expect, it } from 'vitest';

import { PHOTO_FOCUS, photoCrop, photoCropThenWhole, photoWhole } from './photo';

/** An object-fit or object-position of a file's own: a Tailwind class or a style property. */
const OWN_FIT =
	/\bobject-(contain|cover|fill|none|scale-down|top|bottom|left|right|center|\[)|\bobject(Fit|Position)\b/;

describe('photo frames (TASK-114.43)', () => {
	it('crops cover, anchored near the top and centred across', () => {
		const [x, y] = PHOTO_FOCUS.split(' ').map(parseFloat);
		expect(x).toBe(50);
		expect(y).toBeLessThanOrEqual(20);
		expect(photoCrop.split(' ')).toEqual(['object-cover', `object-[${PHOTO_FOCUS.replace(' ', '_')}]`]);
	});

	it('shows full views whole, never cropped', () => {
		expect(photoWhole).toBe('object-contain');
	});

	it('crops a thumbnail below lg and shows it whole and centred from lg', () => {
		expect(photoCropThenWhole.split(' ')).toEqual([
			...photoCrop.split(' '),
			'lg:object-contain',
			'lg:object-center',
		]);
	});

	// Report and pet photo frames take the shared classes, not their own fit or position values.
	it('leaves no own crop in a photo component', () => {
		const root = path.join(import.meta.dirname, '..');
		const other = new Set([
			// Not report or pet photos: ad creatives, the home page's own placeholder art, the shadcn people avatar.
			'app/[locale]/page.tsx',
			'components/ads/ad-view.tsx',
			'components/admin/ads/ad-form.tsx',
			'components/admin/ads/ads-admin.tsx',
			'components/admin/ads/house-ads.tsx',
			'components/ui/avatar.tsx',
			// next/og takes styles, not classes: objectFit with objectPosition PHOTO_FOCUS.
			'app/r/[code]/opengraph-image/route.tsx',
			'app/r/[code]/square.png/route.tsx',
		]);
		const own = ['app', 'components']
			.flatMap((dir) =>
				fs
					.readdirSync(path.join(root, dir), { recursive: true, encoding: 'utf8' })
					.map((file) => `${dir}/${file.replaceAll('\\', '/')}`)
			)
			.filter((file) => /\.tsx?$/.test(file) && !/\.test\.tsx?$/.test(file))
			.filter((file) => !other.has(file))
			.filter((file) => OWN_FIT.test(fs.readFileSync(path.join(root, file), 'utf8')));
		expect(own, 'use photoCrop / photoWhole from @/lib/photo, or add the file to the allowlist').toEqual([]);
	});
});
