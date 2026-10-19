import { describe, expect, it } from 'vitest';

import { initialCrop, isWholePhoto, MIN_CROP_EDGE, toImageRect } from './crop';

const pc = (x: number, y: number, width: number, height: number) => ({ unit: '%' as const, x, y, width, height });

describe('crop rectangle (C19 §Crop 2)', () => {
	it('turns the frame into whole pixels of the prepared image', () => {
		expect(toImageRect(pc(6, 12, 50, 76), 1600, 1200)).toEqual({ x: 96, y: 144, width: 800, height: 912 });
		expect(toImageRect(pc(10.04, 0.03, 33.37, 99.97), 1600, 1200)).toEqual({
			x: 161,
			y: 0,
			width: 534,
			height: 1200,
		});
	});

	it('keeps both sides at least 320 px, growing a smaller frame inside the photo', () => {
		expect(MIN_CROP_EDGE).toBe(320);
		// 10 % of 1600 × 1200 is 160 × 120 px: grown to the minimum from the same corner.
		expect(toImageRect(pc(20, 20, 10, 10), 1600, 1200)).toEqual({ x: 320, y: 240, width: 320, height: 320 });
		// At the bottom right edge it grows back into the photo.
		expect(toImageRect(pc(95, 95, 5, 5), 1600, 1200)).toEqual({ x: 1280, y: 880, width: 320, height: 320 });
	});

	it('never leaves the photo', () => {
		expect(toImageRect(pc(-4, -2, 110, 120), 1600, 1200)).toEqual({ x: 0, y: 0, width: 1600, height: 1200 });
		expect(toImageRect(pc(80, 70, 40, 50), 1600, 1200)).toEqual({ x: 960, y: 600, width: 640, height: 600 });
	});

	it('crops a photo with a 320 px short side along its long side only', () => {
		const rect = toImageRect(pc(25, 25, 50, 50), 1600, 320);
		expect(rect).toEqual({ x: 400, y: 0, width: 800, height: 320 });
	});

	it('opens on the whole photo less a 5 % margin, never under the minimum', () => {
		expect(toImageRect(initialCrop(1600, 1200), 1600, 1200)).toEqual({ x: 80, y: 60, width: 1440, height: 1080 });
		// 90 % of 340 px is 306 px: the frame keeps 320 px.
		expect(toImageRect(initialCrop(1600, 340), 1600, 340)).toEqual({ x: 80, y: 10, width: 1440, height: 320 });
	});

	it('tells a frame over the whole photo, which changes nothing', () => {
		expect(isWholePhoto({ x: 0, y: 0, width: 1600, height: 1200 }, 1600, 1200)).toBe(true);
		expect(isWholePhoto({ x: 0, y: 0, width: 1599, height: 1200 }, 1600, 1200)).toBe(false);
	});
});
