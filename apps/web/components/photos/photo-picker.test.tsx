import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@zivali/api/client';
import { uploadPhoto } from '@zivali/api/photos';
import sl from '@zivali/i18n/dist/sl.json';
import { timeZone } from '@zivali/i18n/format';

import { exifSegment, FIXTURE_EXIF } from '../../e2e/exif-fixture';
import { PhotoPicker } from './photo-picker';
import { PhotoFileError, preparePhoto, readExif } from './prepare-photo';

// IndexedDB, the canvas pipeline (covered in a real browser by e2e/photos.spec.ts) and the network are faked here.
const idb = vi.hoisted(() => new Map<string, unknown>());
vi.mock('idb-keyval', () => ({
	get: async (key: string) => idb.get(key),
	set: async (key: string, value: unknown) => void idb.set(key, value),
	del: async (key: string) => void idb.delete(key),
}));
vi.mock('./prepare-photo', async (actual) => ({
	...(await actual<typeof import('./prepare-photo')>()),
	preparePhoto: vi.fn(),
}));
vi.mock('@zivali/api/photos', () => ({ uploadPhoto: vi.fn() }));
vi.mock('@/lib/store', () => ({ makeApiClient: () => ({ request: vi.fn() }) }));

const prepare = vi.mocked(preparePhoto);
const upload = vi.mocked(uploadPhoto);

type Deferred = { resolve: (id: string) => void; reject: (error: unknown) => void; signal?: AbortSignal };
/** Each upload waits until the test settles it; `onProgress` is kept to report progress. */
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

const photo = (n: number) => ({
	sha256: String(n).padStart(64, '0'),
	width: 1600,
	height: 1200,
	bytes: 400_000 + n,
	file: new Blob([`jpeg ${n}`], { type: 'image/jpeg' }),
	thumb: new Blob([`thumb ${n}`], { type: 'image/jpeg' }),
});
const file = (n: number, type = 'image/jpeg') => new File([`original ${n}`], `IMG_000${n}.jpg`, { type });

function renderPicker(props: Partial<React.ComponentProps<typeof PhotoPicker>> = {}) {
	return render(
		<NextIntlClientProvider locale="sl" messages={sl} timeZone={timeZone}>
			<PhotoPicker draft="lost" {...props} />
		</NextIntlClientProvider>
	);
}
const pick = (...files: File[]) =>
	fireEvent.change(document.querySelector('input[type=file][multiple]')!, { target: { files } });

beforeEach(() => {
	idb.clear();
	let previews = 0;
	URL.createObjectURL = vi.fn(() => `blob:preview-${++previews}`);
	URL.revokeObjectURL = vi.fn();
	// Each file prepares to its own photo (a fake re-encode), keyed by the digit in its name.
	prepare.mockImplementation(async (input: File) => {
		if (!input.type.startsWith('image/')) throw new PhotoFileError('UPLOAD_TYPE');
		return { photo: photo(Number(input.name.match(/\d/g)!.join(''))), exif: {} };
	});
});
afterEach(() => {
	cleanup();
	vi.resetAllMocks();
});

describe('PhotoPicker', () => {
	it('offers the camera, the gallery and the desktop drop area, with a camera input on phones', () => {
		renderPicker();

		expect(screen.getByRole('button', { name: 'Fotografiraj' })).toBeTruthy();
		expect(screen.getByRole('button', { name: 'Izberi iz galerije' })).toBeTruthy();
		expect(screen.getByRole('button', { name: 'Izberi fotografije ali jih povlecite sem' })).toBeTruthy();
		expect(document.querySelector('input[type=file][capture=environment]')?.getAttribute('accept')).toBe('image/*');
	});

	it('shows previews, per-photo progress and the uploaded state, uploading one photo at a time', async () => {
		const calls = pendingUploads();
		const onChange = vi.fn();
		renderPicker({ onChange });

		pick(file(1), file(2));
		const first = await screen.findByRole('listitem', { name: 'Fotografija 1 od 2' });
		expect(within(first).getByRole('img', { name: 'Fotografija 1 od 2' }).getAttribute('src')).toBe(
			'blob:preview-1'
		);
		await waitFor(() => expect(calls).toHaveLength(1));
		// Exactly the C5 input and the JPEG: no thumbnail, no EXIF, no file name.
		expect(upload.mock.calls[0][1]).toEqual({
			sha256: photo(1).sha256,
			width: 1600,
			height: 1200,
			bytes: 400_001,
			file: photo(1).file,
		});

		act(() => calls[0].progress!(0.64));
		expect(within(first).getByText('Nalaganje 64 %')).toBeTruthy();
		expect(
			within(first).getByRole('progressbar', { name: 'Nalaganje fotografije 1' }).getAttribute('aria-valuenow')
		).toBe('64');

		await act(async () => calls[0].resolve('photo-1'));
		expect(await within(first).findByText('Naslovna fotografija')).toBeTruthy();
		expect(screen.getByText('Fotografija je naložena.')).toBeTruthy();
		await waitFor(() => expect(calls).toHaveLength(2));
		await act(async () => calls[1].resolve('photo-2'));

		await waitFor(() =>
			expect(onChange).toHaveBeenLastCalledWith([
				expect.objectContaining({ status: 'uploaded', photoId: 'photo-1' }),
				expect.objectContaining({ status: 'uploaded', photoId: 'photo-2' }),
			])
		);
	});

	it('keeps at most 5 photos, skips the same photo twice and rejects files that are not photos', async () => {
		pendingUploads();
		renderPicker();

		pick(file(1), file(1), file(2), file(3), file(4), file(5), file(6));
		expect(await screen.findByText('Dodate lahko največ 5 fotografij.')).toBeTruthy();
		await waitFor(() => expect(prepare).toHaveBeenCalledTimes(5));
		expect(screen.getAllByRole('listitem')).toHaveLength(4);

		pick(new File(['%PDF'], 'scan.pdf', { type: 'application/pdf' }));
		expect(await screen.findByText('Ta datoteka ni fotografija. Izberite sliko JPG, PNG ali HEIC.')).toBeTruthy();
	});

	it('says why a photo cannot be used: too small, or HEIC the browser cannot open', async () => {
		renderPicker();

		prepare.mockRejectedValueOnce(new PhotoFileError('TOO_SMALL'));
		pick(file(1));
		expect(await screen.findByText(sl.photos.too_small)).toBeTruthy();

		prepare.mockRejectedValueOnce(new PhotoFileError('HEIC'));
		pick(file(2));
		expect(await screen.findByText(sl.photos.heic_unsupported)).toBeTruthy();
	});

	it('maps server rejections to localised errors without retrying them', async () => {
		upload
			.mockRejectedValueOnce(new ApiError('VALIDATION', 'Long edge > 1600 px'))
			.mockRejectedValueOnce(new ApiError('RATE_LIMITED', 'Too many'));
		renderPicker();

		pick(file(1), file(2));

		expect(await screen.findByText('Fotografija se ni naložila.')).toBeTruthy();
		expect(
			await screen.findByText('V kratkem času je bilo poslanih več zahtev. Poskusite znova malo pozneje.')
		).toBeTruthy();
		await new Promise((resolve) => setTimeout(resolve, 1200));
		expect(upload).toHaveBeenCalledTimes(2);
	});

	it('retries a dropped upload with backoff, on "Poskusi znova" and when back online', async () => {
		upload.mockRejectedValue(new ApiError('NETWORK', 'Upload failed'));
		renderPicker();

		pick(file(1));
		const failed = 'Fotografija se ni naložila. Preverite povezavo in poskusite znova.';
		expect(await screen.findByText(failed)).toBeTruthy();
		// First automatic retry after 1 s.
		await waitFor(() => expect(upload).toHaveBeenCalledTimes(2), { timeout: 3000 });

		fireEvent.click(await screen.findByRole('button', { name: 'Poskusi znova' }));
		await waitFor(() => expect(upload).toHaveBeenCalledTimes(3));

		upload.mockResolvedValue({ photoId: 'photo-1' });
		await screen.findByRole('button', { name: 'Poskusi znova' });
		act(() => void window.dispatchEvent(new Event('online')));
		expect(await screen.findByText('Naslovna fotografija')).toBeTruthy();
	});

	it('aborts the running upload when its photo is removed and reorders with the arrow buttons', async () => {
		const calls = pendingUploads();
		const onChange = vi.fn();
		renderPicker({ onChange });

		pick(file(1), file(2), file(3));
		await screen.findByRole('listitem', { name: 'Fotografija 3 od 3' });
		await waitFor(() => expect(calls).toHaveLength(1));

		fireEvent.click(screen.getByRole('button', { name: 'Odstrani fotografijo 1' }));
		expect(calls[0].signal?.aborted).toBe(true);
		expect(screen.getAllByRole('listitem')).toHaveLength(2);

		fireEvent.click(screen.getByRole('button', { name: 'Premakni fotografijo 2 naprej' }));
		const order = () => onChange.mock.lastCall![0].map((item: { sha256: string }) => Number(item.sha256));
		expect(order()).toEqual([3, 2]);
		expect(screen.queryByRole('button', { name: 'Premakni fotografijo 1 naprej' })).toBeNull();
		await waitFor(() =>
			expect((idb.get('photos:lost') as { sha256: string }[]).map((p) => Number(p.sha256))).toEqual([3, 2])
		);
	});

	it("lists a pet's saved photos first, never uploads or stores them, and counts them towards the 5", async () => {
		upload.mockResolvedValue({ photoId: 'photo-new' });
		idb.set('photos:pet', [{ key: 'd', ...photo(7) }]);
		const onChange = vi.fn();
		const saved = [
			{ id: 'saved-1', thumb_url: 'https://media.test/1.webp' },
			{ id: 'saved-2', thumb_url: 'https://media.test/2.webp' },
		];
		renderPicker({ draft: 'pet', saved, onChange });

		// The draft's photo comes after the saved ones.
		await screen.findByRole('listitem', { name: 'Fotografija 3 od 3' });
		const ids = () => onChange.mock.lastCall![0].map((item: { photoId?: string }) => item.photoId);
		await waitFor(() => expect(ids()).toEqual(['saved-1', 'saved-2', 'photo-new']));
		expect(screen.getByRole('img', { name: 'Fotografija 1 od 3' }).getAttribute('src')).toBe(saved[0]!.thumb_url);
		expect(screen.getByText('Naslovna fotografija')).toBeTruthy();

		fireEvent.click(screen.getByRole('button', { name: 'Premakni fotografijo 1 nazaj' }));
		fireEvent.click(screen.getByRole('button', { name: 'Odstrani fotografijo 3' }));
		expect(ids()).toEqual(['saved-2', 'saved-1']);
		pick(file(1), file(2), file(3), file(4));
		await screen.findByRole('listitem', { name: 'Fotografija 5 od 5' });
		expect(screen.getByText('Dodate lahko največ 5 fotografij.')).toBeTruthy();

		await waitFor(() => expect(upload).toHaveBeenCalledTimes(4));
		expect(upload.mock.calls.map((call) => Number(call[1].sha256))).toEqual([7, 1, 2, 3]);
		await waitFor(() =>
			expect((idb.get('photos:pet') as { sha256: string }[]).map((p) => Number(p.sha256))).toEqual([1, 2, 3])
		);
	});

	it('restores the draft after a reload and resumes the upload without picking again', async () => {
		idb.set('photos:lost', [
			{ key: 'a', ...photo(1), photoId: 'photo-1', uploadedAt: Date.now() },
			{ key: 'b', ...photo(2) },
		]);
		upload.mockResolvedValue({ photoId: 'photo-2' });
		renderPicker();

		expect(await screen.findByRole('listitem', { name: 'Fotografija 2 od 2' })).toBeTruthy();
		await waitFor(() => expect(upload).toHaveBeenCalledOnce());
		expect(upload.mock.calls[0][1]).toMatchObject({ sha256: photo(2).sha256 });
		await waitFor(() =>
			expect((idb.get('photos:lost') as { photoId?: string }[]).map((p) => p.photoId)).toEqual([
				'photo-1',
				'photo-2',
			])
		);
	});

	it('uploads a restored photo again when its photo id is about to be purged (C5, 24 h)', async () => {
		const hour = 60 * 60 * 1000;
		idb.set('photos:lost', [
			{ key: 'a', ...photo(1), photoId: 'photo-1', uploadedAt: Date.now() - 2 * hour },
			{ key: 'b', ...photo(2), photoId: 'photo-2', uploadedAt: Date.now() - 24 * hour },
			{ key: 'c', ...photo(3), photoId: 'photo-3' },
		]);
		upload.mockResolvedValueOnce({ photoId: 'new-2' }).mockResolvedValueOnce({ photoId: 'new-3' });
		renderPicker();

		await waitFor(() => expect(upload).toHaveBeenCalledTimes(2));
		expect(upload.mock.calls.map((call) => call[1].sha256)).toEqual([photo(2).sha256, photo(3).sha256]);
		await waitFor(() =>
			expect((idb.get('photos:lost') as { photoId?: string }[]).map((p) => p.photoId)).toEqual([
				'photo-1',
				'new-2',
				'new-3',
			])
		);
	});

	it('keeps picked and restored photos in this browser while held, then uploads them once released (C3)', async () => {
		idb.set('photos:lost', [{ key: 'a', ...photo(1) }]);
		upload.mockResolvedValueOnce({ photoId: 'photo-1' }).mockResolvedValueOnce({ photoId: 'photo-2' });
		const onChange = vi.fn();
		const view = renderPicker({ hold: true, onChange });

		expect(await screen.findByRole('listitem', { name: 'Fotografija 1 od 1' })).toBeTruthy();
		pick(file(2));
		await screen.findByRole('listitem', { name: 'Fotografija 2 od 2' });
		// Ready to the eye (the cover label, no progress), but nothing has left the browser.
		expect(screen.getByText('Naslovna fotografija')).toBeTruthy();
		expect(screen.queryByRole('progressbar')).toBeNull();
		expect(onChange).toHaveBeenLastCalledWith([
			expect.objectContaining({ key: 'a', status: 'kept' }),
			expect.objectContaining({ status: 'kept' }),
		]);
		expect(onChange.mock.lastCall![0].map((p: { photoId?: string }) => p.photoId)).toEqual([undefined, undefined]);
		expect(upload).not.toHaveBeenCalled();

		view.rerender(
			<NextIntlClientProvider locale="sl" messages={sl} timeZone={timeZone}>
				<PhotoPicker draft="lost" hold={false} onChange={onChange} />
			</NextIntlClientProvider>
		);
		await waitFor(() =>
			expect(onChange).toHaveBeenLastCalledWith([
				expect.objectContaining({ status: 'uploaded', photoId: 'photo-1' }),
				expect.objectContaining({ status: 'uploaded', photoId: 'photo-2' }),
			])
		);
		expect(upload.mock.calls.map((call) => call[1].sha256)).toEqual([photo(1).sha256, photo(2).sha256]);
	});

	it('never queues a photo twice, so repeated retries cannot multiply uploads', async () => {
		const calls = pendingUploads();
		renderPicker();

		pick(file(1));
		await waitFor(() => expect(calls).toHaveLength(1));
		await act(async () => calls[0].reject(new ApiError('NETWORK', 'Upload failed')));
		await screen.findByRole('button', { name: 'Poskusi znova' });

		// Going back online five times and a click: one upload is running, the rest are ignored.
		act(() => {
			for (let i = 0; i < 5; i++) window.dispatchEvent(new Event('online'));
		});
		fireEvent.click(screen.getByRole('button', { name: 'Poskusi znova' }));
		await waitFor(() => expect(calls).toHaveLength(2));
		await new Promise((resolve) => setTimeout(resolve, 100));
		expect(calls).toHaveLength(2);
	});

	it('hands EXIF place and time to the page and never puts them or the file name in the draft', async () => {
		const exif = { lat: 46.0569, lng: 14.5058, takenAt: new Date('2026-10-14T07:30:00Z') };
		prepare.mockResolvedValueOnce({ photo: photo(1), exif });
		pendingUploads();
		const onExif = vi.fn();
		renderPicker({ onExif });

		pick(file(1));

		await waitFor(() => expect(onExif).toHaveBeenCalledWith(exif));
		const [stored] = idb.get('photos:lost') as Record<string, unknown>[];
		expect(Object.keys(stored).sort()).toEqual([
			'bytes',
			'file',
			'height',
			'key',
			'photoId',
			'sha256',
			'thumb',
			'uploadedAt',
			'width',
		]);
	});
});

describe('readExif', () => {
	it('reads GPS and the capture time from a camera JPEG', async () => {
		const jpeg = new Blob([new Uint8Array([0xff, 0xd8]), exifSegment(), new Uint8Array([0xff, 0xd9])], {
			type: 'image/jpeg',
		});

		const exif = await readExif(jpeg);

		expect(exif.lat).toBeCloseTo(FIXTURE_EXIF.lat, 4);
		expect(exif.lng).toBeCloseTo(FIXTURE_EXIF.lng, 4);
		expect(exif.takenAt).toEqual(new Date(2026, 9, 14, 9, 30, 0));
	});

	it('returns nothing for a file without EXIF', async () => {
		expect(await readExif(new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xd9])]))).toEqual({});
	});
});

describe('preparePhoto', () => {
	afterEach(() => vi.unstubAllGlobals());

	it('rejects a panorama whose short edge is under 320 px after scaling to 1600 px, before encoding it', async () => {
		const actual = await vi.importActual<typeof import('./prepare-photo')>('./prepare-photo');
		const close = vi.fn();
		vi.stubGlobal(
			'createImageBitmap',
			vi.fn(async () => ({ width: 8000, height: 400, close }))
		);
		const canvas = vi.fn();
		vi.stubGlobal('OffscreenCanvas', canvas);

		// 8000 x 400 scales to 1600 x 80: too small, although the original's short edge is 400 px.
		await expect(actual.preparePhoto(file(1))).rejects.toMatchObject({ code: 'TOO_SMALL' });
		expect(canvas).not.toHaveBeenCalled();
		expect(close).toHaveBeenCalled();
	});
});
