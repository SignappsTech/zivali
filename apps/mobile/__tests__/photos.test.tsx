/// <reference types="node" />
// node:sqlite, node:fs and node:crypto stand in for the native modules; the image decoder and encoder are faked.
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { AccessibilityInfo } from 'react-native';
import { IntlProvider } from 'use-intl';

import { ApiError } from '@zivali/api/client';
import { uploadPhoto } from '@zivali/api/photos';
import sl from '@zivali/i18n/dist/sl.json';
import { PhotoPicker } from '@/components/photos/photo-picker';
import * as Pipeline from '@/components/photos/prepare-photo';
import { clearPhotoDraft } from '@/components/photos/use-photo-uploads';
import { getDb } from '@/lib/db';
import { draftsDir } from '@/lib/db/files';

const mockFileUpload = jest.fn();
jest.mock('expo-file-system', () => {
	const nodeFs = jest.requireActual<typeof import('node:fs')>('node:fs');
	const nodePath = jest.requireActual<typeof import('node:path')>('node:path');
	const root = nodeFs.mkdtempSync(nodePath.join(jest.requireActual('node:os').tmpdir(), 'zivali-photos-'));
	const join = (parts: (string | { uri: string })[]) =>
		nodePath.join(...parts.map((part) => (typeof part === 'string' ? part : part.uri)));
	class Directory {
		uri: string;
		constructor(...parts: (string | { uri: string })[]) {
			this.uri = join(parts);
		}
		get exists() {
			return nodeFs.existsSync(this.uri);
		}
		create() {
			nodeFs.mkdirSync(this.uri, { recursive: true });
		}
		delete() {
			nodeFs.rmSync(this.uri, { recursive: true });
		}
	}
	class File {
		uri: string;
		constructor(...parts: (string | { uri: string })[]) {
			this.uri = join(parts);
		}
		get exists() {
			return nodeFs.existsSync(this.uri);
		}
		async bytes() {
			return new Uint8Array(nodeFs.readFileSync(this.uri));
		}
		write(bytes: Uint8Array) {
			nodeFs.writeFileSync(this.uri, bytes);
		}
		delete() {
			nodeFs.rmSync(this.uri);
		}
		async move(to: { uri: string }) {
			nodeFs.renameSync(this.uri, to.uri);
			this.uri = to.uri;
		}
		upload(url: string, options: unknown) {
			return mockFileUpload(this.uri, url, options);
		}
	}
	const cache = new Directory(root, 'cache');
	cache.create();
	return { Directory, File, Paths: { cache, document: new Directory(root, 'document') } };
});
// Real SQL on the real C17 schema: node:sqlite stands in for expo-sqlite (in memory).
jest.mock('expo-sqlite', () => {
	const { DatabaseSync } = jest.requireActual<typeof import('node:sqlite')>('node:sqlite');
	return {
		openDatabaseAsync: async () => {
			const db = new DatabaseSync(':memory:');
			return {
				execAsync: async (sql: string) => db.exec(sql),
				getFirstAsync: async (sql: string, ...params: never[]) => db.prepare(sql).get(...params) ?? null,
				runAsync: async (sql: string, ...params: never[]) => db.prepare(sql).run(...params),
				withExclusiveTransactionAsync: async (task: (txn: unknown) => Promise<void>) => {
					db.exec('begin');
					await task({ execAsync: async (sql: string) => db.exec(sql) });
					db.exec('commit');
				},
			};
		},
	};
});
jest.mock('expo-crypto', () => {
	const crypto = jest.requireActual<typeof import('node:crypto')>('node:crypto');
	return {
		CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
		digest: async (_algorithm: string, data: Uint8Array) => {
			const hash = crypto.createHash('sha256').update(data).digest();
			return hash.buffer.slice(hash.byteOffset, hash.byteOffset + hash.length);
		},
		randomUUID: () => crypto.randomUUID(),
	};
});
// The decoder knows the size of each test image by its uri; the encoder writes a JPEG whose size follows the pixels
// and the quality, and (like a careless encoder) keeps an Exif segment with GPS in it.
const mockSources = new Map<string, { width: number; height: number }>();
const mockBytesPerPixel = { value: 0.4 };
jest.mock('expo-image-manipulator', () => {
	class Image {
		release = jest.fn();
		width: number;
		height: number;
		constructor(size: { width: number; height: number }) {
			this.width = size.width;
			this.height = size.height;
		}
		async saveAsync({ compress }: { compress: number }) {
			const { File: FsFile, Paths: FsPaths } = jest.requireMock('expo-file-system');
			const file = new FsFile(FsPaths.cache, `${jest.requireActual('node:crypto').randomUUID()}.jpg`);
			file.write(mockJpeg(Math.round(this.width * this.height * compress * mockBytesPerPixel.value)));
			return { uri: file.uri, width: this.width, height: this.height };
		}
	}
	const manipulate = (source: string | Image) => {
		let size = typeof source === 'string' ? mockSources.get(source) : source;
		return {
			resize({ width, height }: { width?: number; height?: number }) {
				const scale = width ? width / size!.width : height! / size!.height;
				size = { width: Math.round(size!.width * scale), height: Math.round(size!.height * scale) };
				return this;
			},
			renderAsync: async () => {
				if (!size) throw new Error('Could not decode');
				return new Image(size);
			},
		};
	};
	return { ImageManipulator: { manipulate }, SaveFormat: { JPEG: 'jpeg' } };
});
jest.mock('expo-image-picker', () => ({
	UIImagePickerPreferredAssetRepresentationMode: { Compatible: 'compatible' },
	getCameraPermissionsAsync: jest.fn(),
	requestCameraPermissionsAsync: jest.fn(),
	launchCameraAsync: jest.fn(),
	launchImageLibraryAsync: jest.fn(),
}));
jest.mock('expo-network', () => {
	const React = jest.requireActual<typeof import('react')>('react');
	const listeners = new Set<() => void>();
	let state = { isConnected: true, isInternetReachable: true };
	return {
		NetworkStateType: {},
		addNetworkStateListener: jest.fn(),
		getNetworkStateAsync: jest.fn(),
		useNetworkState: () =>
			React.useSyncExternalStore(
				(listener: () => void) => (listeners.add(listener), () => void listeners.delete(listener)),
				() => state
			),
		mockSetNetwork: (next: typeof state) => {
			state = next;
			for (const listener of listeners) listener();
		},
	};
});
jest.mock('@zivali/api/photos', () => ({ uploadPhoto: jest.fn() }));
jest.mock('@/lib/store', () => ({ apiClient: { request: jest.fn() } }));
jest.mock('@/components/photos/prepare-photo', () => ({
	...jest.requireActual('@/components/photos/prepare-photo'),
	preparePhoto: jest.fn(),
}));

// --- JPEG bytes ---

const ascii = (text: string) => [...text].map((char) => char.charCodeAt(0));
const segment = (marker: number, payload: number[]) => [
	0xff,
	marker,
	(payload.length + 2) >> 8,
	(payload.length + 2) & 0xff,
	...payload,
];
const JFIF = segment(0xe0, ascii('JFIF\0\x01\x01\0\0\x01\0\x01\0\0'));
const EXIF = segment(0xe1, ascii('Exif\0\0MM\0*GPS 46.0569N 14.5058E 2026:10:14 09:30:00'));
const ICC = segment(0xe2, ascii('ICC_PROFILE\0\x01\x01'));
/** SOI, the given segments, a start of scan with `scan` bytes of image data, EOI. */
function jpegWith(segments: number[][], scan = 16) {
	const head = [0xff, 0xd8, ...segments.flat(), ...segment(0xda, [1, 1, 0, 0, 0x3f, 0])];
	const bytes = new Uint8Array(head.length + scan + 2);
	bytes.set(head);
	bytes.fill(0x5a, head.length);
	bytes.set([0xff, 0xd9], bytes.length - 2);
	return bytes;
}
function mockJpeg(scan: number) {
	return jpegWith([JFIF, EXIF], scan);
}
/** Markers before the start of scan. */
function markers(jpeg: Uint8Array) {
	const found: number[] = [];
	for (let at = 2; jpeg[at] === 0xff && jpeg[at + 1] !== 0xda; at += 2 + ((jpeg[at + 2] << 8) | jpeg[at + 3])) {
		found.push(jpeg[at + 1]);
	}
	return found;
}
const sha256 = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');

const { preparePhoto, readExif, stripJpegMetadata, filePut, PhotoFileError } = jest.requireActual<typeof Pipeline>(
	'@/components/photos/prepare-photo'
);
const cacheFiles = () => fs.readdirSync(Paths.cache.uri);

beforeEach(() => {
	for (const name of cacheFiles()) fs.rmSync(path.join(Paths.cache.uri, name));
	mockBytesPerPixel.value = 0.4;
});

describe('preparePhoto', () => {
	it('re-encodes to ≤ 1600 px and ≤ 1 MiB, with no EXIF in the bytes it uploads, a 480 px thumbnail and its sha256', async () => {
		mockSources.set('camera.heic', { width: 4032, height: 3024 });

		const { photo } = await preparePhoto({ uri: 'camera.heic' });

		expect([photo.width, photo.height]).toEqual([1600, 1200]);
		const uploaded = new Uint8Array(fs.readFileSync(photo.file.uri));
		expect(photo.bytes).toBe(uploaded.length);
		expect(photo.bytes).toBeLessThanOrEqual(1024 * 1024);
		expect(photo.sha256).toBe(sha256(uploaded));
		// The encoder left an Exif segment with GPS; the uploaded file has none, and nothing that reads like it.
		expect(markers(uploaded)).toEqual([0xe0]);
		expect(Buffer.from(uploaded).includes('Exif')).toBe(false);
		expect(Buffer.from(uploaded).includes('GPS')).toBe(false);
		expect(uploaded.subarray(-2)).toEqual(Uint8Array.from([0xff, 0xd9]));
		expect(markers(new Uint8Array(fs.readFileSync(photo.thumb.uri)))).toEqual([0xe0]);
		expect(cacheFiles().sort()).toEqual([path.basename(photo.file.uri), path.basename(photo.thumb.uri)].sort());
	});

	it('deletes the picker copy of the original from the cache, and only a file under the cache', async () => {
		const copy = new File(Paths.cache, 'ImagePicker', 'orig.jpg');
		fs.mkdirSync(path.dirname(copy.uri), { recursive: true });
		fs.writeFileSync(copy.uri, 'original with GPS');
		mockSources.set(copy.uri, { width: 1600, height: 1200 });
		const outside = path.join(path.dirname(Paths.cache.uri), 'outside.jpg');
		fs.writeFileSync(outside, 'x');
		mockSources.set(outside, { width: 1600, height: 1200 });

		await preparePhoto({ uri: copy.uri });
		await preparePhoto({ uri: outside });

		expect(fs.existsSync(copy.uri)).toBe(false);
		expect(fs.existsSync(outside)).toBe(true);
		fs.rmSync(path.dirname(copy.uri), { recursive: true });
	});

	it('lowers the quality until the photo fits in 1 MiB and keeps no rejected attempt on disk', async () => {
		mockSources.set('big.jpg', { width: 1600, height: 1200 });
		// 0.85 and 0.75 are over 1 MiB, 0.65 fits.
		mockBytesPerPixel.value = 0.8;

		const { photo } = await preparePhoto({ uri: 'big.jpg' });

		expect(photo.bytes).toBeLessThanOrEqual(1024 * 1024);
		expect(photo.bytes).toBeGreaterThan(900_000);
		expect(cacheFiles()).toHaveLength(2);

		mockBytesPerPixel.value = 2;
		await expect(preparePhoto({ uri: 'big.jpg' })).rejects.toEqual(new PhotoFileError('UPLOAD_SIZE'));
	});

	it('rejects a short edge under 320 px (also a panorama once scaled) and files it cannot decode', async () => {
		mockSources.set('small.jpg', { width: 400, height: 300 });
		mockSources.set('panorama.jpg', { width: 8000, height: 1200 });

		await expect(preparePhoto({ uri: 'small.jpg' })).rejects.toMatchObject({ code: 'TOO_SMALL' });
		await expect(preparePhoto({ uri: 'panorama.jpg' })).rejects.toMatchObject({ code: 'TOO_SMALL' });
		await expect(preparePhoto({ uri: 'scan.pdf' })).rejects.toMatchObject({ code: 'UPLOAD_TYPE' });
		expect(cacheFiles()).toEqual([]);
	});

	it('reads GPS and the capture time from the picker EXIF of both platforms', () => {
		// iOS: unsigned degrees with refs; Android: signed degrees (and the refs).
		const ios = { GPSLatitude: 46.0569, GPSLatitudeRef: 'N', GPSLongitude: 14.5058, GPSLongitudeRef: 'E' };
		const android = { GPSLatitude: -33.8688, GPSLatitudeRef: 'S', GPSLongitude: -70.6693, GPSLongitudeRef: 'W' };

		expect(readExif({ ...ios, DateTimeOriginal: '2026:10:14 09:30:00' })).toEqual({
			lat: 46.0569,
			lng: 14.5058,
			takenAt: new Date(2026, 9, 14, 9, 30, 0),
		});
		expect(readExif(android)).toEqual({ lat: -33.8688, lng: -70.6693 });
		expect(readExif({ Make: 'Apple' })).toEqual({});
		expect(readExif(null)).toEqual({});
		// 0,0 is a camera without a fix.
		expect(readExif({ GPSLatitude: 0, GPSLatitudeRef: 'N', GPSLongitude: 0, GPSLongitudeRef: 'E' })).toEqual({});
	});

	it('hands the photo to the presigned PUT with exactly its method, headers and declared length', async () => {
		mockSources.set('camera.jpg', { width: 4032, height: 3024 });
		const { photo } = await preparePhoto({ uri: 'camera.jpg' });
		const upload = {
			url: 'https://r2.example/uploads/u1/p1.jpg?X-Amz-Signature=…',
			method: 'PUT' as const,
			headers: { 'Content-Type': 'image/jpeg' },
			expires_at: '2026-10-15T10:05:00Z',
		};
		const onProgress = jest.fn();
		mockFileUpload.mockImplementationOnce(async (_uri, _url, options) => {
			options.onProgress({ bytesSent: 50, totalBytes: 200 });
			return { status: 200, body: '', headers: {} };
		});

		await filePut(upload, photo.file, { onProgress });

		const [uri, url, options] = mockFileUpload.mock.calls[0];
		expect(url).toBe(upload.url);
		expect(options).toMatchObject({ httpMethod: 'PUT', headers: upload.headers, sessionType: 'foreground' });
		// The OS sends the file's own length, which is the declared `bytes`.
		expect(fs.statSync(uri).size).toBe(photo.bytes);
		expect(onProgress).toHaveBeenCalledWith(0.25);

		mockFileUpload.mockResolvedValueOnce({ status: 403, body: '', headers: {} });
		await expect(filePut(upload, photo.file, {})).rejects.toMatchObject({ code: 'INTERNAL' });
		mockFileUpload.mockRejectedValueOnce(new Error('offline'));
		await expect(filePut(upload, photo.file, {})).rejects.toMatchObject({ code: 'NETWORK' });
	});
});

describe('stripJpegMetadata', () => {
	it('drops Exif, XMP, IPTC and comments, keeps JFIF, the colour profile and the image data', () => {
		const xmp = segment(0xe1, ascii('http://ns.adobe.com/xap/1.0/\0<x:xmpmeta exif:GPSLatitude="46,3"/>'));
		const iptc = segment(0xed, ascii('Photoshop 3.0\0Ljubljana'));
		const comment = segment(0xfe, ascii('IMG_0001.HEIC'));
		const original = jpegWith([JFIF, EXIF, xmp, ICC, iptc, comment]);

		const stripped = stripJpegMetadata(original);

		expect(stripped).toEqual(jpegWith([JFIF, ICC]));
		const clean = jpegWith([JFIF]);
		expect(stripJpegMetadata(clean)).toBe(clean);
		expect(() => stripJpegMetadata(Uint8Array.from(ascii('%PDF-1.7')))).toThrow(PhotoFileError);
	});

	it('drops the MPF index, the trailing gain-map image and its hdrgm XMP; rejects a file with no scan or no EOI', () => {
		const mpf = segment(0xe2, ascii('MPF MM *'));
		const xmp = segment(0xe1, ascii('http://ns.adobe.com/xap/1.0/ <x:xmpmeta hdrgm:Version="1.0"/>'));
		const gainMap = jpegWith([JFIF, EXIF]);
		const ultraHdr = new Uint8Array([...jpegWith([JFIF, xmp, mpf, ICC]), ...gainMap]);

		expect(stripJpegMetadata(ultraHdr)).toEqual(jpegWith([JFIF, ICC]));

		const noScan = Uint8Array.from([0xff, 0xd8, ...JFIF, 0xff, 0xe1, 0xff]);
		expect(() => stripJpegMetadata(noScan)).toThrow(PhotoFileError);
		expect(() => stripJpegMetadata(Uint8Array.from([0xff, 0xd8, ...JFIF, 1, 2, 3, 4]))).toThrow(PhotoFileError);
		expect(() => stripJpegMetadata(jpegWith([JFIF]).subarray(0, 30) as Uint8Array<ArrayBuffer>)).toThrow(
			PhotoFileError
		);
	});
});

// --- PhotoPicker ---

const prepare = jest.mocked(Pipeline.preparePhoto);
const upload = jest.mocked(uploadPhoto);
const picker = jest.mocked(ImagePicker);
const { mockSetNetwork } = jest.requireMock('expo-network');
const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');

/** A prepared photo with real files in the cache, as preparePhoto leaves them; `n` makes the hash. */
function prepared(n: number) {
	const file = new File(Paths.cache, `prepared-${n}.jpg`);
	const thumb = new File(Paths.cache, `prepared-${n}.thumb.jpg`);
	file.write(jpegWith([JFIF], 100 + n));
	thumb.write(jpegWith([JFIF], 10));
	return {
		sha256: String(n).padStart(64, '0'),
		width: 1600,
		height: 1200,
		bytes: 400_000 + n,
		file: { uri: file.uri },
		thumb: { uri: thumb.uri },
	};
}
const assets = (...numbers: number[]) => ({
	canceled: false as const,
	assets: numbers.map((n) => ({ uri: `asset-${n}`, width: 4032, height: 3024, fileName: `IMG_000${n}.HEIC` })),
});
const draftRow = async (draft = 'draft-1') =>
	(await getDb()).getFirstAsync<{ kind: string; photo_paths: string }>(
		'select kind, photo_paths from drafts where id = ?',
		draft
	);
const storedPhotos = async (draft = 'draft-1') => JSON.parse((await draftRow(draft))?.photo_paths ?? '[]');

type Deferred = { resolve: (id: string) => void; reject: (error: unknown) => void; signal?: AbortSignal };
/** Each upload waits until the test settles it; `progress` reports progress. */
function pendingUploads() {
	const calls: (Deferred & { progress?: (fraction: number) => void })[] = [];
	upload.mockImplementation(
		(_client, _photo, options) =>
			new Promise((resolve, reject) =>
				calls.push({
					resolve: (photoId) => resolve({ photoId }),
					reject,
					signal: options?.signal,
					progress: options?.onProgress,
				})
			)
	);
	return calls;
}

function renderPicker(props: Partial<React.ComponentProps<typeof PhotoPicker>> = {}) {
	return render(
		<IntlProvider locale="sl" messages={sl} timeZone="Europe/Ljubljana">
			<PhotoPicker draft="draft-1" kind="lost" cameraPrimer={jest.fn(async () => true)} {...props} />
		</IntlProvider>
	);
}
const press = (name: string) => fireEvent.press(screen.getByRole('button', { name }));

describe('PhotoPicker', () => {
	beforeEach(async () => {
		jest.clearAllMocks();
		prepare.mockImplementation(async ({ uri }) => ({ photo: prepared(Number(uri.split('-')[1])), exif: {} }));
		picker.getCameraPermissionsAsync.mockResolvedValue({ granted: true, canAskAgain: true } as never);
		picker.launchImageLibraryAsync.mockResolvedValue(assets(1));
		picker.launchCameraAsync.mockResolvedValue(assets(1));
		// A fresh draft per test: the in-memory database lives for the whole file.
		await (await getDb()).execAsync('delete from drafts');
		if (draftsDir.exists) draftsDir.delete();
	});

	it('shows the camera primer before the OS prompt and falls back to the gallery when the camera is denied', async () => {
		const order: string[] = [];
		const cameraPrimer = jest.fn(async () => (order.push('primer'), true));
		picker.getCameraPermissionsAsync.mockResolvedValue({ granted: false, canAskAgain: true } as never);
		picker.requestCameraPermissionsAsync.mockImplementation(
			async () => (order.push('os prompt'), { granted: true, canAskAgain: true }) as never
		);
		pendingUploads();
		await renderPicker({ cameraPrimer });

		await press('Fotografiraj');
		await waitFor(() =>
			expect(picker.launchCameraAsync).toHaveBeenCalledWith(expect.objectContaining({ exif: true }))
		);
		expect(order).toEqual(['primer', 'os prompt']);

		// Denied at the OS prompt: the gallery opens instead.
		picker.requestCameraPermissionsAsync.mockResolvedValue({ granted: false, canAskAgain: false } as never);
		await press('Fotografiraj');
		await waitFor(() => expect(picker.launchImageLibraryAsync).toHaveBeenCalledTimes(1));
		// Denied for good: no primer, straight to the gallery.
		picker.getCameraPermissionsAsync.mockResolvedValue({ granted: false, canAskAgain: false } as never);
		await press('Fotografiraj');
		await waitFor(() => expect(picker.launchImageLibraryAsync).toHaveBeenCalledTimes(2));
		expect(cameraPrimer).toHaveBeenCalledTimes(2);
		expect(picker.launchCameraAsync).toHaveBeenCalledTimes(1);
	});

	it('shows previews with alt text, per-photo progress and the uploaded state, uploading one photo at a time', async () => {
		const calls = pendingUploads();
		const onChange = jest.fn();
		picker.launchImageLibraryAsync.mockResolvedValue(assets(1, 2));
		await renderPicker({ onChange });

		await press('Izberi iz galerije');
		expect(picker.launchImageLibraryAsync).toHaveBeenCalledWith(
			expect.objectContaining({ allowsMultipleSelection: true, selectionLimit: 5, exif: true })
		);
		expect(await screen.findByLabelText('Fotografija 1 od 2')).toBeOnTheScreen();
		expect(screen.getByLabelText('Fotografija 2 od 2')).toBeOnTheScreen();
		await waitFor(() => expect(calls).toHaveLength(1));
		// Exactly the C5 input and the JPEG kept in the draft folder: no thumbnail, no EXIF, no file name.
		const [, input, options] = upload.mock.calls[0];
		expect(Object.keys(input).sort()).toEqual(['bytes', 'file', 'height', 'sha256', 'width']);
		expect(input).toMatchObject({ sha256: prepared(1).sha256, width: 1600, height: 1200, bytes: 400_001 });
		expect((input.file as { uri: string }).uri.startsWith(draftsDir.uri)).toBe(true);
		expect(fs.existsSync((input.file as { uri: string }).uri)).toBe(true);
		expect(options?.put).toBe(filePut);

		await act(async () => calls[0].progress!(0.64));
		expect(screen.getByText('Nalaganje 64 %')).toBeOnTheScreen();
		expect(screen.getByLabelText('Nalaganje fotografije 1')).toHaveAccessibilityValue({ now: 64 });

		await act(async () => calls[0].resolve('photo-1'));
		expect(await screen.findByText('Naslovna fotografija')).toBeOnTheScreen();
		expect(announce).toHaveBeenCalledWith('Fotografija je naložena.');
		await waitFor(() => expect(calls).toHaveLength(2));
		await act(async () => calls[1].resolve('photo-2'));

		await waitFor(() =>
			expect(onChange).toHaveBeenLastCalledWith([
				expect.objectContaining({ status: 'uploaded', photoId: 'photo-1' }),
				expect.objectContaining({ status: 'uploaded', photoId: 'photo-2' }),
			])
		);
		expect((await storedPhotos()).map((photo: { photoId: string }) => photo.photoId)).toEqual([
			'photo-1',
			'photo-2',
		]);
		expect((await draftRow())?.kind).toBe('lost');
	});

	it('keeps at most 5 photos, skips the same photo twice and says why a photo cannot be used', async () => {
		pendingUploads();
		picker.launchImageLibraryAsync.mockResolvedValue(assets(1, 1, 2, 3, 4, 5, 6));
		await renderPicker();

		await press('Izberi iz galerije');
		expect(await screen.findByText('Dodate lahko največ 5 fotografij.')).toBeOnTheScreen();
		await waitFor(() => expect(prepare).toHaveBeenCalledTimes(5));
		expect(await screen.findByLabelText('Fotografija 4 od 4')).toBeOnTheScreen();

		// One more fits: the gallery limits the selection to it.
		prepare.mockRejectedValueOnce(new PhotoFileError('TOO_SMALL'));
		await press('Izberi iz galerije');
		expect(picker.launchImageLibraryAsync).toHaveBeenLastCalledWith(
			expect.objectContaining({ allowsMultipleSelection: false, selectionLimit: 1 })
		);
		expect(await screen.findByText(sl.photos.too_small)).toBeOnTheScreen();

		prepare.mockRejectedValueOnce(new PhotoFileError('UPLOAD_TYPE'));
		await press('Izberi iz galerije');
		expect(await screen.findByText(sl.errors.UPLOAD_TYPE)).toBeOnTheScreen();
	});

	it('maps server rejections to localised errors without retrying them', async () => {
		upload
			.mockRejectedValueOnce(new ApiError('VALIDATION', 'Long edge > 1600 px'))
			.mockRejectedValueOnce(new ApiError('RATE_LIMITED', 'Too many'));
		picker.launchImageLibraryAsync.mockResolvedValue(assets(1, 2));
		await renderPicker();

		await press('Izberi iz galerije');

		expect(await screen.findByText('Fotografija se ni naložila.')).toBeOnTheScreen();
		expect(await screen.findByText(sl.errors.RATE_LIMITED_generic)).toBeOnTheScreen();
		await act(() => new Promise((resolve) => setTimeout(resolve, 1200)));
		expect(upload).toHaveBeenCalledTimes(2);
	});

	it('retries a dropped upload with backoff, on "Poskusi znova" and when back online', async () => {
		upload.mockRejectedValue(new ApiError('NETWORK', 'Upload failed'));
		await renderPicker();

		await press('Izberi iz galerije');
		const failed = 'Fotografija se ni naložila. Preverite povezavo in poskusite znova.';
		expect(await screen.findByText(failed)).toBeOnTheScreen();
		// First automatic retry after 1 s.
		await waitFor(() => expect(upload).toHaveBeenCalledTimes(2), { timeout: 3000 });

		await press('Poskusi znova');
		await waitFor(() => expect(upload).toHaveBeenCalledTimes(3));

		upload.mockResolvedValue({ photoId: 'photo-1' });
		await screen.findByRole('button', { name: 'Poskusi znova' });
		await act(async () => mockSetNetwork({ isConnected: false, isInternetReachable: false }));
		await act(async () => mockSetNetwork({ isConnected: true, isInternetReachable: true }));
		expect(await screen.findByText('Naslovna fotografija')).toBeOnTheScreen();
	});

	it('never queues a photo twice, so repeated retries cannot multiply uploads', async () => {
		const calls = pendingUploads();
		await renderPicker();

		await press('Izberi iz galerije');
		await waitFor(() => expect(calls).toHaveLength(1));
		await act(async () => calls[0].reject(new ApiError('NETWORK', 'Upload failed')));
		await screen.findByRole('button', { name: 'Poskusi znova' });

		await press('Poskusi znova');
		await act(async () => {
			for (let i = 0; i < 3; i++) {
				mockSetNetwork({ isConnected: false, isInternetReachable: false });
				mockSetNetwork({ isConnected: true, isInternetReachable: true });
			}
		});
		await waitFor(() => expect(calls).toHaveLength(2));
		await act(() => new Promise((resolve) => setTimeout(resolve, 100)));
		expect(calls).toHaveLength(2);
	});

	it('aborts the running upload of a removed photo, deletes its files and reorders with the arrow buttons', async () => {
		const calls = pendingUploads();
		const onChange = jest.fn();
		picker.launchImageLibraryAsync.mockResolvedValue(assets(1, 2, 3));
		await renderPicker({ onChange });

		await press('Izberi iz galerije');
		await screen.findByLabelText('Fotografija 3 od 3');
		await waitFor(() => expect(calls).toHaveLength(1));
		const first = onChange.mock.lastCall![0][0];

		await press('Odstrani fotografijo 1');
		expect(calls[0].signal?.aborted).toBe(true);
		expect(fs.existsSync(first.file.uri)).toBe(false);
		expect(fs.existsSync(first.thumb.uri)).toBe(false);
		expect(screen.queryByLabelText('Fotografija 3 od 3')).toBeNull();

		await press('Premakni fotografijo 2 naprej');
		const order = () => onChange.mock.lastCall![0].map((item: { sha256: string }) => Number(item.sha256));
		expect(order()).toEqual([3, 2]);
		expect(screen.queryByRole('button', { name: 'Premakni fotografijo 1 naprej' })).toBeNull();
		await waitFor(async () =>
			expect((await storedPhotos()).map((photo: { sha256: string }) => Number(photo.sha256))).toEqual([3, 2])
		);
	});

	it('restores the draft after an app restart, resumes the upload and re-uploads a photo id near its 24 h purge', async () => {
		const hour = 60 * 60 * 1000;
		// One photo picked, then the app was killed: its files and row survive.
		pendingUploads();
		picker.launchImageLibraryAsync.mockResolvedValue(assets(1, 2, 3, 4));
		const first = await renderPicker();
		await press('Izberi iz galerije');
		await screen.findByLabelText('Fotografija 4 od 4');
		await waitFor(async () => expect(await storedPhotos()).toHaveLength(4));
		await first.unmount();

		const [a, b, c, d] = await storedPhotos();
		// a: uploaded 2 h ago (kept); b: 24 h ago (purged by C5, upload again); c: never uploaded; d: its file is gone.
		await (
			await getDb()
		).runAsync(
			'update drafts set photo_paths = ? where id = ?',
			JSON.stringify([
				{ ...a, photoId: 'photo-1', uploadedAt: Date.now() - 2 * hour },
				{ ...b, photoId: 'photo-2', uploadedAt: Date.now() - 24 * hour },
				c,
				d,
			]),
			'draft-1'
		);
		fs.rmSync(path.join(draftsDir.uri, 'draft-1', `${d.key}.jpg`));
		upload.mockReset();
		upload.mockResolvedValueOnce({ photoId: 'new-2' }).mockResolvedValueOnce({ photoId: 'new-3' });

		await renderPicker();

		expect(await screen.findByLabelText('Fotografija 3 od 3')).toBeOnTheScreen();
		await waitFor(() => expect(upload).toHaveBeenCalledTimes(2));
		expect(upload.mock.calls.map((call) => call[1].sha256)).toEqual([b.sha256, c.sha256]);
		await waitFor(async () =>
			expect((await storedPhotos()).map((photo: { photoId?: string }) => photo.photoId)).toEqual([
				'photo-1',
				'new-2',
				'new-3',
			])
		);
	});

	it('hands EXIF place and time to the page and never puts them or the file name in the draft', async () => {
		const exif = { lat: 46.0569, lng: 14.5058, takenAt: new Date('2026-10-14T07:30:00Z') };
		prepare.mockResolvedValueOnce({ photo: prepared(1), exif });
		pendingUploads();
		const onExif = jest.fn();
		await renderPicker({ onExif });

		await press('Izberi iz galerije');

		await waitFor(() => expect(onExif).toHaveBeenCalledWith(exif));
		const row = (await draftRow())!.photo_paths;
		expect(Object.keys(JSON.parse(row)[0]).sort()).toEqual(['bytes', 'height', 'key', 'sha256', 'width']);
		expect(row).not.toMatch(/46\.05|14\.50|IMG_|HEIC|2026/);
	});

	it('clears the draft photos and their files once the report is sent', async () => {
		pendingUploads();
		await renderPicker();
		await press('Izberi iz galerije');
		await waitFor(async () => expect(await storedPhotos()).toHaveLength(1));

		await clearPhotoDraft('draft-1');

		expect(await storedPhotos()).toEqual([]);
		expect(fs.existsSync(path.join(draftsDir.uri, 'draft-1'))).toBe(false);
	});
});
