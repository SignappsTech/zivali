// C5 preparePhoto on the web: EXIF read first, then a fresh JPEG drawn on a canvas. Canvas encoders write no EXIF,
// so the upload never carries GPS, time or camera data (FR-003); the worker strips again with sharp.
import type { PreparedPhoto } from '@zivali/api/photos';

import type { CropRect } from './crop';

/** MAX_PHOTO_BYTES in @zivali/validation (1 MiB); the presigned PUT is pinned to the declared size. */
const MAX_BYTES = 1024 * 1024;
const LONG_EDGE = 1600;
const THUMB_EDGE = 480;
/** MIN_PHOTO_EDGE in @zivali/validation: the short side must be at least this many pixels. */
const MIN_EDGE = 320;
const QUALITIES = [0.85, 0.75, 0.65, 0.5];

/** Read from the original file only to offer the place and time; never stored, logged or uploaded raw. */
export type PhotoExif = { lat?: number; lng?: number; takenAt?: Date };
export type WebPreparedPhoto = PreparedPhoto & { file: Blob; thumb: Blob };

/**
 * Not a decodable image (`UPLOAD_TYPE`), a HEIC this browser cannot open (`HEIC`), too large even after re-encoding
 * (`UPLOAD_SIZE`) or under 320 px on the short side once scaled (`TOO_SMALL`).
 */
export class PhotoFileError extends Error {
	constructor(readonly code: 'UPLOAD_TYPE' | 'UPLOAD_SIZE' | 'TOO_SMALL' | 'HEIC') {
		super(code);
	}
}

export async function readExif(file: Blob): Promise<PhotoExif> {
	try {
		const { default: exifr } = await import('exifr');
		const tags = await exifr.parse(file, {
			pick: ['DateTimeOriginal', 'GPSLatitudeRef', 'GPSLatitude', 'GPSLongitudeRef', 'GPSLongitude'],
		});
		const gps = Number.isFinite(tags?.latitude) && Number.isFinite(tags?.longitude);
		return {
			...(gps && { lat: tags.latitude, lng: tags.longitude }),
			...(tags?.DateTimeOriginal instanceof Date && { takenAt: tags.DateTimeOriginal }),
		};
	} catch {
		// No or broken EXIF: nothing to offer.
		return {};
	}
}

async function encode(image: ImageBitmap, longEdge: number, quality: number) {
	const scale = Math.min(1, longEdge / Math.max(image.width, image.height));
	const canvas = new OffscreenCanvas(Math.round(image.width * scale), Math.round(image.height * scale));
	const context = canvas.getContext('2d');
	if (!context) throw new PhotoFileError('UPLOAD_TYPE');
	context.imageSmoothingQuality = 'high';
	context.drawImage(image, 0, 0, canvas.width, canvas.height);
	return {
		blob: await canvas.convertToBlob({ type: 'image/jpeg', quality }),
		width: canvas.width,
		height: canvas.height,
	};
}

/**
 * EXIF first, then a JPEG with a long edge ≤ 1600 px and ≤ 1 MiB, a 480 px thumbnail and its SHA-256. `crop`: only
 * that region of a prepared photo (C19 §Crop 3), which has no EXIF left to read.
 */
export async function preparePhoto(file: File, crop?: CropRect): Promise<{ photo: WebPreparedPhoto; exif: PhotoExif }> {
	const exif = crop ? {} : await readExif(file);
	// Upright per the EXIF orientation, which the re-encoded file no longer carries.
	// The decoder decides what is an image (no MIME pre-check: phones often leave the type empty).
	const options: ImageBitmapOptions = { imageOrientation: 'from-image' };
	const decoded = crop
		? createImageBitmap(file, crop.x, crop.y, crop.width, crop.height, options)
		: createImageBitmap(file, options);
	const image = await decoded.catch(() => {
		const heic = /\.hei[cf]$/i.test(file.name) || /^image\/hei[cf]$/i.test(file.type);
		throw new PhotoFileError(heic ? 'HEIC' : 'UPLOAD_TYPE');
	});
	try {
		// After scaling to 1600 px, so a panorama that ends up under 320 px on its short side is caught too.
		const scale = Math.min(1, LONG_EDGE / Math.max(image.width, image.height));
		if (Math.round(Math.min(image.width, image.height) * scale) < MIN_EDGE) throw new PhotoFileError('TOO_SMALL');
		let jpeg: Awaited<ReturnType<typeof encode>> | undefined;
		for (const quality of QUALITIES) {
			jpeg = await encode(image, LONG_EDGE, quality);
			if (jpeg.blob.size <= MAX_BYTES) break;
		}
		if (!jpeg || jpeg.blob.size > MAX_BYTES) throw new PhotoFileError('UPLOAD_SIZE');
		const { blob: thumb } = await encode(image, THUMB_EDGE, 0.8);
		const digest = await crypto.subtle.digest('SHA-256', await jpeg.blob.arrayBuffer());
		const sha256 = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
		const { blob, width, height } = jpeg;
		return { photo: { sha256, width, height, bytes: blob.size, file: blob, thumb }, exif };
	} finally {
		image.close();
	}
}
