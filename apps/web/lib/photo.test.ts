import * as fs from 'node:fs';
import * as path from 'node:path';

import { describe, expect, it } from 'vitest';

import { PHOTO_FOCUS, photoCrop, photoWhole } from './photo';

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

	// Report and pet photo frames take the shared classes, not their own fit or position values.
	it('leaves no own crop in a photo component', () => {
		const root = path.join(import.meta.dirname, '..');
		// Not report or pet photos: ad creatives, the home page's own placeholder art, the shadcn people avatar.
		const other = new Set([
			'app/[locale]/page.tsx',
			'components/ads/ad-view.tsx',
			'components/admin/ads/ad-form.tsx',
			'components/admin/ads/ads-admin.tsx',
			'components/admin/ads/house-ads.tsx',
			'components/ui/avatar.tsx',
		]);
		const own = ['app', 'components']
			.flatMap((dir) =>
				fs
					.readdirSync(path.join(root, dir), { recursive: true, encoding: 'utf8' })
					.map((file) => `${dir}/${file.replaceAll('\\', '/')}`)
			)
			.filter((file) => /\.tsx?$/.test(file) && !/\.test\.tsx?$/.test(file))
			.filter((file) => {
				const source = fs.readFileSync(path.join(root, file), 'utf8');
				return /object-(cover|top|center|\[)|objectFit/.test(source) && !source.includes('PHOTO_FOCUS');
			})
			.filter((file) => !other.has(file));
		expect(own).toEqual([]);
	});
});
