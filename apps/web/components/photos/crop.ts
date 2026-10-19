import type { PercentCrop } from 'react-image-crop';

// C19 §Crop 2 (TASK-41.5): the crop frame on the prepared JPEG the form holds. Pure, so the rules are tested apart.

/** MIN_PHOTO_EDGE (C5): both sides of a crop stay at least this many pixels, so the copy passes POST /v1/photos. */
export const MIN_CROP_EDGE = 320;
/** A region of the prepared image, in its pixels. */
export type CropRect = { x: number; y: number; width: number; height: number };

const side = (start: number, size: number, total: number) => {
	const length = Math.min(total, Math.max(MIN_CROP_EDGE, Math.round((size / 100) * total)));
	return [Math.min(total - length, Math.max(0, Math.round((start / 100) * total))), length] as const;
};

/** The frame as whole pixels of the image: inside it and never under 320 px on either side. */
export function toImageRect(crop: PercentCrop, width: number, height: number): CropRect {
	const [x, w] = side(crop.x, crop.width, width);
	const [y, h] = side(crop.y, crop.height, height);
	return { x, y, width: w, height: h };
}

/** The frame the tool opens with: the whole photo less a 5 % margin, never under the minimum. */
export function initialCrop(width: number, height: number): PercentCrop {
	const w = Math.min(width, Math.max(MIN_CROP_EDGE, width * 0.9)) / width;
	const h = Math.min(height, Math.max(MIN_CROP_EDGE, height * 0.9)) / height;
	return { unit: '%', x: ((1 - w) / 2) * 100, y: ((1 - h) / 2) * 100, width: w * 100, height: h * 100 };
}

/** A frame over the whole photo changes nothing. */
export const isWholePhoto = (rect: CropRect, width: number, height: number) =>
	rect.x === 0 && rect.y === 0 && rect.width === width && rect.height === height;
