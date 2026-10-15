// C5 on mobile: preparePhoto (EXIF read from the picker, re-encode with expo-image-manipulator, sha256) and the file
// `put` for uploadPhoto. The native encoders write a fresh JPEG from the decoded pixels; stripJpegMetadata then drops
// any metadata segment left, so the upload never carries GPS, time or camera data (FR-003). The outbox reuses both.
import { CryptoDigestAlgorithm, digest } from 'expo-crypto';
import { File } from 'expo-file-system';
import { ImageManipulator, type ImageRef, SaveFormat } from 'expo-image-manipulator';

import { ApiError } from '@zivali/api/client';
import type { PreparedPhoto, PutFile } from '@zivali/api/photos';

/** MAX_PHOTO_BYTES in @zivali/validation (1 MiB); the presigned PUT is pinned to the declared size. */
const MAX_BYTES = 1024 * 1024;
const LONG_EDGE = 1600;
const THUMB_EDGE = 480;
/** MIN_PHOTO_EDGE in @zivali/validation: the short side must be at least this many pixels. */
const MIN_EDGE = 320;
const QUALITIES = [0.85, 0.75, 0.65, 0.5];

/** Read from the picker only to offer the place and time; never stored, logged or uploaded. */
export type PhotoExif = { lat?: number; lng?: number; takenAt?: Date };
/** Files in the app cache until the draft moves them; `file` is the JPEG to upload, `thumb` the local preview. */
export type MobilePreparedPhoto = PreparedPhoto & { file: { uri: string }; thumb: { uri: string } };

/** Not a decodable image (`UPLOAD_TYPE`), too large even after re-encoding (`UPLOAD_SIZE`) or under 320 px (`TOO_SMALL`). */
export class PhotoFileError extends Error {
	constructor(readonly code: 'UPLOAD_TYPE' | 'UPLOAD_SIZE' | 'TOO_SMALL') {
		super(code);
	}
}

/** iOS gives unsigned degrees with an N/S, E/W ref, Android signed degrees (and the ref). */
function degrees(value: unknown, ref: unknown, negative: 'S' | 'W') {
	const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
	return Number.isFinite(n) ? Math.abs(n) * (ref === negative ? -1 : 1) : undefined;
}

/** Place and capture time from the picker's `exif` (expo-image-picker flattens the GPS tags on both platforms). */
export function readExif(tags: Record<string, unknown> | null | undefined): PhotoExif {
	const lat = degrees(tags?.GPSLatitude, tags?.GPSLatitudeRef, 'S');
	const lng = degrees(tags?.GPSLongitude, tags?.GPSLongitudeRef, 'W');
	// "2026:10:14 09:30:00", the camera's local time.
	const time = String(tags?.DateTimeOriginal ?? '').match(/^(\d{4}):(\d\d):(\d\d) (\d\d):(\d\d):(\d\d)/);
	const takenAt = time && new Date(+time[1], +time[2] - 1, +time[3], +time[4], +time[5], +time[6]);
	return {
		...(lat !== undefined && lng !== undefined && { lat, lng }),
		...(takenAt && !Number.isNaN(takenAt.getTime()) && { takenAt }),
	};
}

/**
 * The JPEG without its metadata segments: APP1 to APP15 (Exif, XMP, IPTC, maker notes) except APP2 (ICC colour profile)
 * and APP14 (Adobe colour transform), and comments. Everything from the start of scan on is image data and is kept.
 */
export function stripJpegMetadata(jpeg: Uint8Array<ArrayBuffer>): Uint8Array<ArrayBuffer> {
	if (jpeg[0] !== 0xff || jpeg[1] !== 0xd8) throw new PhotoFileError('UPLOAD_TYPE');
	const kept = [jpeg.subarray(0, 2)];
	let at = 2;
	while (at + 4 <= jpeg.length && jpeg[at] === 0xff && jpeg[at + 1] !== 0xda) {
		const marker = jpeg[at + 1];
		const end = at + 2 + ((jpeg[at + 2] << 8) | jpeg[at + 3]);
		const metadata = (marker >= 0xe1 && marker <= 0xef && marker !== 0xe2 && marker !== 0xee) || marker === 0xfe;
		if (!metadata) kept.push(jpeg.subarray(at, end));
		at = end;
	}
	kept.push(jpeg.subarray(at));
	const length = kept.reduce((sum, part) => sum + part.length, 0);
	if (length === jpeg.length) return jpeg;
	const out = new Uint8Array(length);
	kept.reduce((offset, part) => (out.set(part, offset), offset + part.length), 0);
	return out;
}

/** The image with its long edge at most `longEdge` (never upscaled). */
const scaled = async (image: ImageRef, longEdge: number) =>
	Math.max(image.width, image.height) <= longEdge
		? image
		: ImageManipulator.manipulate(image)
				.resize(image.width >= image.height ? { width: longEdge } : { height: longEdge })
				.renderAsync();

/** Saves a JPEG, rewritten without metadata; returns its bytes. */
async function saveJpeg(image: ImageRef, compress: number) {
	const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress });
	const file = new File(saved.uri);
	const raw = await file.bytes();
	const bytes = stripJpegMetadata(raw);
	if (bytes !== raw) file.write(bytes);
	return { ...saved, bytes };
}

/**
 * EXIF first, then a JPEG with a long edge ≤ 1600 px and ≤ 1 MiB without metadata, a 480 px thumbnail and its SHA-256.
 * HEIC from the gallery is decoded by the OS (iOS hands over a JPEG in Compatible mode) and re-encoded as JPEG.
 */
export async function preparePhoto(asset: {
	uri: string;
	exif?: Record<string, unknown> | null;
}): Promise<{ photo: MobilePreparedPhoto; exif: PhotoExif }> {
	const exif = readExif(asset.exif);
	// Decoded upright (the manipulator applies the EXIF orientation, which the new file no longer carries).
	const original = await ImageManipulator.manipulate(asset.uri)
		.renderAsync()
		.catch(() => {
			throw new PhotoFileError('UPLOAD_TYPE');
		});
	const images = [original];
	const leftovers: string[] = [];
	try {
		const display = await scaled(original, LONG_EDGE);
		images.push(display);
		// After scaling, so a panorama that ends up under 320 px on its short side is caught too.
		if (Math.min(display.width, display.height) < MIN_EDGE) throw new PhotoFileError('TOO_SMALL');
		let jpeg: Awaited<ReturnType<typeof saveJpeg>> | undefined;
		for (const quality of QUALITIES) {
			if (jpeg) leftovers.push(jpeg.uri);
			jpeg = await saveJpeg(display, quality);
			if (jpeg.bytes.length <= MAX_BYTES) break;
		}
		if (!jpeg || jpeg.bytes.length > MAX_BYTES) {
			if (jpeg) leftovers.push(jpeg.uri);
			throw new PhotoFileError('UPLOAD_SIZE');
		}
		const small = await scaled(original, THUMB_EDGE);
		images.push(small);
		const thumb = await saveJpeg(small, 0.8);
		const sha256 = Array.from(new Uint8Array(await digest(CryptoDigestAlgorithm.SHA256, jpeg.bytes)), (byte) =>
			byte.toString(16).padStart(2, '0')
		).join('');
		const { uri, width, height, bytes } = jpeg;
		return {
			photo: { sha256, width, height, bytes: bytes.length, file: { uri }, thumb: { uri: thumb.uri } },
			exif,
		};
	} finally {
		for (const uri of leftovers) new File(uri).delete();
		// Decoded bitmaps are large; free them now rather than at the next GC.
		for (const image of new Set(images)) image.release();
	}
}

/**
 * The `put` for uploadPhoto on mobile: the file goes from disk with exactly the presigned method and headers; the OS
 * sets Content-Length from the file, which is the declared `bytes`. A foreground session, so abort works.
 */
export const filePut: PutFile = async (upload, file, { onProgress, signal }) => {
	if (file instanceof Blob) throw new TypeError('filePut sends a file URI');
	const result = await new File(file.uri)
		.upload(upload.url, {
			httpMethod: upload.method,
			headers: upload.headers,
			sessionType: 'foreground',
			signal,
			onProgress: ({ bytesSent, totalBytes }) => totalBytes > 0 && onProgress?.(bytesSent / totalBytes),
		})
		.catch((error: unknown) => {
			if (signal?.aborted) throw error;
			throw new ApiError('NETWORK', 'Upload failed');
		});
	if (result.status >= 300) {
		throw new ApiError('INTERNAL', `Upload failed: HTTP ${result.status}`, { status: result.status });
	}
};
