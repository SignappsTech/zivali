// C5 preparePhoto on the web: EXIF read first, then a fresh JPEG drawn on a canvas. Canvas encoders write no EXIF,
// so the upload never carries GPS, time or camera data (FR-003); the worker strips again with sharp.
import type { PreparedPhoto } from '@zivali/api/photos';

/** MAX_PHOTO_BYTES in @zivali/validation (1 MiB); the presigned PUT is pinned to the declared size. */
const MAX_BYTES = 1024 * 1024;
const LONG_EDGE = 1600;
const THUMB_EDGE = 480;
const QUALITIES = [0.85, 0.75, 0.65, 0.5];

/** Read from the original file only to offer the place and time; never stored, logged or uploaded raw. */
export type PhotoExif = { lat?: number; lng?: number; takenAt?: Date };
export type WebPreparedPhoto = PreparedPhoto & { file: Blob; thumb: Blob };

/** Not a decodable image, or too large even after re-encoding: `errors.UPLOAD_TYPE` / `errors.UPLOAD_SIZE`. */
export class PhotoFileError extends Error {
	constructor(readonly code: 'UPLOAD_TYPE' | 'UPLOAD_SIZE') {
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

/** EXIF first, then a JPEG with a long edge ≤ 1600 px and ≤ 1 MiB, a 480 px thumbnail and its SHA-256. */
export async function preparePhoto(file: File): Promise<{ photo: WebPreparedPhoto; exif: PhotoExif }> {
	if (!file.type.startsWith('image/')) throw new PhotoFileError('UPLOAD_TYPE');
	const exif = await readExif(file);
	// Upright per the EXIF orientation, which the re-encoded file no longer carries.
	const image = await createImageBitmap(file, { imageOrientation: 'from-image' }).catch(() => {
		throw new PhotoFileError('UPLOAD_TYPE');
	});
	try {
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
