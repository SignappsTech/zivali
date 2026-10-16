'use client';

import { del, get, set } from 'idb-keyval';
import { useLocale } from 'next-intl';
import { useEffect, useEffectEvent, useMemo, useRef, useState } from 'react';

import { ApiError } from '@zivali/api/client';
import { uploadPhoto } from '@zivali/api/photos';
import { makeApiClient } from '@/lib/store';

import { type PhotoExif, PhotoFileError, preparePhoto, type WebPreparedPhoto } from './prepare-photo';

export const MAX_PHOTOS = 5;
/** Automatic retries for network and server faults (1, 2, 4, 8 s); then "Poskusi znova" or going back online. */
const RETRIES = 4;

export type PhotoMessage =
	| 'photos.failed'
	| 'photos.failed_network'
	| 'photos.limit'
	| 'photos.too_small'
	| 'photos.heic_unsupported'
	| 'errors.UPLOAD_TYPE'
	| 'errors.UPLOAD_SIZE'
	| 'errors.RATE_LIMITED_generic';
/** What the draft keeps in IndexedDB: the prepared files and, once uploaded, the photo id. No EXIF, no file name. */
type Stored = WebPreparedPhoto & { key: string; photoId?: string; uploadedAt?: number };
/** C5 purges uploads nobody attached after 24 h; a photo id older than this is uploaded again on restore. */
const PHOTO_ID_TTL = 23 * 60 * 60 * 1000;
const fileErrors = {
	UPLOAD_TYPE: 'errors.UPLOAD_TYPE',
	UPLOAD_SIZE: 'errors.UPLOAD_SIZE',
	TOO_SMALL: 'photos.too_small',
	HEIC: 'photos.heic_unsupported',
} as const;
/** A photo the pet already has (edit form, C4 `Pet.photos`): shown from its URL, moved or removed, never uploaded. */
export type SavedPhoto = { id: string; thumb_url: string };
export type PickedPhoto = Omit<Stored, keyof WebPreparedPhoto> &
	Partial<WebPreparedPhoto> & {
		status: 'uploading' | 'uploaded' | 'failed';
		progress: number;
		error?: PhotoMessage;
		/** Object URL of the thumbnail, or a saved photo's URL. */
		preview: string;
		/** A SavedPhoto: no file, so it stays out of the draft. */
		saved?: true;
	};
type LocalPhoto = PickedPhoto & WebPreparedPhoto;
const isLocal = (photo: PickedPhoto): photo is LocalPhoto => !photo.saved;

const draftKey = (draft: string) => `photos:${draft}`;

/** Drops the photos of a draft, e.g. once the report is sent. */
export const clearPhotoDraft = (draft: string) => del(draftKey(draft)).catch(() => {});

function failure(error: unknown): { message: PhotoMessage; retry: boolean } {
	const code = error instanceof ApiError ? error.code : undefined;
	if (code === 'NETWORK') return { message: 'photos.failed_network', retry: true };
	if (code === 'VALIDATION') return { message: 'photos.failed', retry: false };
	if (code === 'RATE_LIMITED') return { message: 'errors.RATE_LIMITED_generic', retry: false };
	// A failed PUT (expired URL, R2 fault) comes back as INTERNAL; a retry asks for a fresh URL.
	return { message: 'photos.failed', retry: !code || code === 'INTERNAL' || code === 'SERVICE_UNAVAILABLE' };
}

/**
 * Prepares, keeps and uploads up to 5 photos of one draft (C5): one upload at a time so the first is done soonest on
 * a weak connection, retries with backoff, aborts on remove, and resumes from IndexedDB after a reload or going
 * back online. `onExif` gets the place and time read from a photo, to offer them with consent; nothing stores them.
 * `saved` photos (read once, on mount) come first and count towards the 5.
 */
export function usePhotoUploads(draft: string, onExif?: (exif: PhotoExif) => void, saved: SavedPhoto[] = []) {
	const locale = useLocale();
	const client = useMemo(() => makeApiClient(locale), [locale]);
	const [seeded] = useState(() =>
		saved.map(({ id, thumb_url }): PickedPhoto => ({
			key: id,
			photoId: id,
			saved: true,
			status: 'uploaded',
			progress: 1,
			preview: thumb_url,
		}))
	);
	const [photos, setPhotos] = useState(seeded);
	const [preparing, setPreparing] = useState(0);
	const [notice, setNotice] = useState<PhotoMessage>();
	const [justUploaded, setJustUploaded] = useState(false);
	// Mutable side of the queue, read by async work that outlives a render.
	const live = useRef({
		alive: false,
		photos: seeded,
		preparing: 0,
		chain: Promise.resolve(),
		controllers: new Map<string, AbortController>(),
		timers: new Map<string, ReturnType<typeof setTimeout>>(),
		attempts: new Map<string, number>(),
		// Keys waiting for or running an upload; enqueueing one of them again is a no-op.
		queued: new Set<string>(),
		announce: undefined as ReturnType<typeof setTimeout> | undefined,
	});

	const commit = (next: PickedPhoto[]) => {
		live.current.photos = next;
		setPhotos(next);
	};
	const patch = (key: string, change: Partial<PickedPhoto>) =>
		commit(live.current.photos.map((photo) => (photo.key === key ? { ...photo, ...change } : photo)));
	const save = () =>
		set(
			draftKey(draft),
			live.current.photos
				.filter(isLocal)
				.map(({ key, sha256, width, height, bytes, file, thumb, photoId, uploadedAt }): Stored => ({
					key,
					sha256,
					width,
					height,
					bytes,
					file,
					thumb,
					photoId,
					uploadedAt,
				}))
		).catch(() => {});

	async function upload(key: string) {
		const photo = live.current.photos.find((item) => item.key === key);
		if (!live.current.alive || !photo || !isLocal(photo) || photo.photoId) return;
		const controller = new AbortController();
		live.current.controllers.set(key, controller);
		patch(key, { status: 'uploading', progress: 0, error: undefined });
		try {
			const { sha256, width, height, bytes, file } = photo;
			const { photoId } = await uploadPhoto(
				client,
				{ sha256, width, height, bytes, file },
				{ signal: controller.signal, onProgress: (progress) => patch(key, { progress }) }
			);
			live.current.attempts.delete(key);
			patch(key, { status: 'uploaded', progress: 1, photoId, uploadedAt: Date.now() });
			void save();
			setJustUploaded(true);
			clearTimeout(live.current.announce);
			live.current.announce = setTimeout(() => setJustUploaded(false), 1500);
		} catch (error) {
			if (controller.signal.aborted) return;
			const { message, retry } = failure(error);
			patch(key, { status: 'failed', error: message });
			const attempt = live.current.attempts.get(key) ?? 0;
			if (retry && attempt < RETRIES) {
				live.current.attempts.set(key, attempt + 1);
				clearTimeout(live.current.timers.get(key));
				live.current.timers.set(
					key,
					setTimeout(() => enqueue(key), 1000 * 2 ** attempt)
				);
			}
		} finally {
			live.current.controllers.delete(key);
		}
	}

	function enqueue(key: string) {
		clearTimeout(live.current.timers.get(key));
		live.current.timers.delete(key);
		if (live.current.queued.has(key)) return;
		live.current.queued.add(key);
		// Never rejects, so one broken upload cannot stall the ones after it.
		live.current.chain = live.current.chain
			.then(() => upload(key))
			.catch(() => {})
			.finally(() => live.current.queued.delete(key));
	}

	async function add(files: File[]) {
		setNotice(undefined);
		const room = MAX_PHOTOS - live.current.photos.length - live.current.preparing;
		if (files.length > room) setNotice('photos.limit');
		const picked = files.slice(0, Math.max(0, room));
		live.current.preparing += picked.length;
		setPreparing(live.current.preparing);
		// One at a time: a phone holds only one decoded 12 MP image.
		for (const file of picked) {
			try {
				const { photo, exif } = await preparePhoto(file);
				if (!live.current.alive) return;
				// The same photo twice would be one photo id twice.
				if (live.current.photos.some((item) => item.sha256 === photo.sha256)) continue;
				const key = crypto.randomUUID();
				const preview = URL.createObjectURL(photo.thumb);
				commit([...live.current.photos, { ...photo, key, status: 'uploading', progress: 0, preview }]);
				void save();
				enqueue(key);
				if (exif.lat !== undefined || exif.takenAt) onExif?.(exif);
			} catch (error) {
				setNotice(error instanceof PhotoFileError ? fileErrors[error.code] : 'errors.UPLOAD_TYPE');
			} finally {
				live.current.preparing -= 1;
				setPreparing(live.current.preparing);
			}
		}
	}

	function remove(key: string) {
		live.current.controllers.get(key)?.abort();
		clearTimeout(live.current.timers.get(key));
		const photo = live.current.photos.find((item) => item.key === key);
		if (photo) URL.revokeObjectURL(photo.preview);
		commit(live.current.photos.filter((item) => item.key !== key));
		void save();
	}

	function move(index: number, by: -1 | 1) {
		const next = [...live.current.photos];
		[next[index], next[index + by]] = [next[index + by], next[index]];
		commit(next);
		void save();
	}

	function retry(key: string) {
		if (live.current.queued.has(key)) return;
		live.current.attempts.delete(key);
		enqueue(key);
	}

	const restore = useEffectEvent(async (cancelled: () => boolean) => {
		const stored = (await get<Stored[]>(draftKey(draft)).catch(() => undefined)) ?? [];
		if (cancelled() || !stored.length) return;
		const restored = stored.map((photo) => {
			const fresh = photo.photoId && photo.uploadedAt && Date.now() - photo.uploadedAt < PHOTO_ID_TTL;
			return {
				...photo,
				photoId: fresh ? photo.photoId : undefined,
				status: fresh ? ('uploaded' as const) : ('uploading' as const),
				progress: fresh ? 1 : 0,
				preview: URL.createObjectURL(photo.thumb),
			};
		});
		// Saved photos stay first, then the draft's, then any picked meanwhile.
		const current = live.current.photos;
		commit([...current.filter((photo) => photo.saved), ...restored, ...current.filter(isLocal)]);
		for (const photo of restored) if (!photo.photoId) enqueue(photo.key);
	});
	const backOnline = useEffectEvent(() => {
		for (const photo of live.current.photos) if (photo.error === 'photos.failed_network') retry(photo.key);
	});

	useEffect(() => {
		const state = live.current;
		state.alive = true;
		// After a StrictMode remount the ref is empty (cleanup below) while the state still lists the saved photos.
		state.photos = seeded;
		let cancelled = false;
		void restore(() => cancelled);
		const online = () => backOnline();
		window.addEventListener('online', online);
		return () => {
			cancelled = true;
			state.alive = false;
			window.removeEventListener('online', online);
			for (const controller of state.controllers.values()) controller.abort();
			for (const timer of state.timers.values()) clearTimeout(timer);
			clearTimeout(state.announce);
			for (const photo of state.photos) URL.revokeObjectURL(photo.preview);
			// The draft stays in IndexedDB; a remount restores it.
			state.photos = [];
		};
	}, [draft, seeded]);

	return { photos, preparing, notice, justUploaded, add, remove, move, retry };
}
