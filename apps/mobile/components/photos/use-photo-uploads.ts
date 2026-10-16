import { randomUUID } from 'expo-crypto';
import { Directory, File } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import { useTranslations } from 'use-intl';

import { ApiError } from '@zivali/api/client';
import { uploadPhoto } from '@zivali/api/photos';
import { getDb } from '@/lib/db';
import { draftsDir } from '@/lib/db/files';
import { isOnline, useNetworkState } from '@/lib/net';
import { apiClient } from '@/lib/store';

import {
	deletePickerCopy,
	filePut,
	type MobilePreparedPhoto,
	type PhotoExif,
	PhotoFileError,
	preparePhoto,
} from './prepare-photo';

export const MAX_PHOTOS = 5;
/** Automatic retries for network and server faults (1, 2, 4, 8 s); then "Poskusi znova" or going back online. */
const RETRIES = 4;
/** C5 purges uploads nobody attached after 24 h; a photo id older than this is uploaded again on restore. */
const PHOTO_ID_TTL = 23 * 60 * 60 * 1000;

export type DraftKind = 'lost' | 'found' | 'sighted' | 'pet';
export type PhotoMessage =
	| 'photos.failed'
	| 'photos.failed_network'
	| 'photos.limit'
	| 'photos.too_small'
	| 'errors.UPLOAD_TYPE'
	| 'errors.UPLOAD_SIZE'
	| 'errors.RATE_LIMITED_generic';
/**
 * One entry of `drafts.photo_paths` (C17): what uploading needs and, once uploaded, the photo id. The files are
 * `drafts/<draft>/<key>.jpg` and `<key>.thumb.jpg`. No EXIF, no original file name.
 */
type Stored = {
	key: string;
	sha256: string;
	width: number;
	height: number;
	bytes: number;
	photoId?: string;
	uploadedAt?: number;
};
/** A PreparedPhoto (C5) the outbox can take as is, plus its upload state; `kept`: on the device only, while held. */
export type PickedPhoto = Stored &
	MobilePreparedPhoto & {
		status: 'kept' | 'uploading' | 'uploaded' | 'failed';
		progress: number;
		error?: PhotoMessage;
		/** One of `saved`: already on the server, nothing on disk or in the draft. */
		saved?: true;
	};
/** A photo the entity already has (C5 `{ id, thumb_url }`, e.g. a pet's), shown first and kept by its id. */
export type SavedPhoto = { id: string; thumb_url: string };

const fromSaved = ({ id, thumb_url }: SavedPhoto): PickedPhoto => ({
	key: id,
	photoId: id,
	sha256: '',
	width: 0,
	height: 0,
	bytes: 0,
	file: { uri: thumb_url },
	thumb: { uri: thumb_url },
	status: 'uploaded',
	progress: 1,
	saved: true,
});

const fileErrors = {
	UPLOAD_TYPE: 'errors.UPLOAD_TYPE',
	UPLOAD_SIZE: 'errors.UPLOAD_SIZE',
	TOO_SMALL: 'photos.too_small',
} as const;
const pickerOptions: ImagePicker.ImagePickerOptions = {
	mediaTypes: 'images',
	exif: true,
	// iOS converts HEIC to JPEG before handing it over.
	preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
};

const folder = (draft: string) => new Directory(draftsDir, draft);
const filesOf = (draft: string, key: string) => ({
	file: { uri: new File(folder(draft), `${key}.jpg`).uri },
	thumb: { uri: new File(folder(draft), `${key}.thumb.jpg`).uri },
});
const removeFiles = (photo: { file: { uri: string }; thumb: { uri: string } }) => {
	for (const { uri } of [photo.file, photo.thumb]) {
		const file = new File(uri);
		if (file.exists) file.delete();
	}
};

async function loadDraft(draft: string): Promise<Stored[]> {
	const db = await getDb();
	const row = await db.getFirstAsync<{ photo_paths: string }>('select photo_paths from drafts where id = ?', draft);
	try {
		return row ? JSON.parse(row.photo_paths) : [];
	} catch {
		return [];
	}
}

/** The form writes `data`; the picker writes only `photo_paths`, creating the draft row if the form has not yet. */
async function saveDraft(draft: string, kind: DraftKind, photos: PickedPhoto[]) {
	const stored = photos
		.filter((photo) => !photo.saved)
		.map(({ key, sha256, width, height, bytes, photoId, uploadedAt }): Stored => ({
			key,
			sha256,
			width,
			height,
			bytes,
			photoId,
			uploadedAt,
		}));
	const db = await getDb();
	await db.runAsync(
		`insert into drafts (id, kind, data, photo_paths, updated_at) values (?, ?, '{}', ?, ?)
		on conflict (id) do update set photo_paths = excluded.photo_paths, updated_at = excluded.updated_at`,
		draft,
		kind,
		JSON.stringify(stored),
		Date.now()
	);
}

/** Drops the photos of a draft and their files, e.g. once the report is sent or queued in the outbox. */
export async function clearPhotoDraft(draft: string): Promise<void> {
	if (folder(draft).exists) folder(draft).delete();
	await (await getDb()).runAsync(`update drafts set photo_paths = '[]' where id = ?`, draft);
}

function failure(error: unknown): { message: PhotoMessage; retry: boolean } {
	const code = error instanceof ApiError ? error.code : undefined;
	if (code === 'NETWORK') return { message: 'photos.failed_network', retry: true };
	if (code === 'VALIDATION') return { message: 'photos.failed', retry: false };
	if (code === 'RATE_LIMITED') return { message: 'errors.RATE_LIMITED_generic', retry: false };
	// A failed PUT (expired URL, R2 fault) comes back as INTERNAL; a retry asks for a fresh URL.
	return { message: 'photos.failed', retry: !code || code === 'INTERNAL' || code === 'SERVICE_UNAVAILABLE' };
}

/**
 * Takes or picks, prepares, keeps and uploads up to 5 photos of one draft (C5, C17): one upload at a time so the first
 * is done soonest on a weak connection, retries with backoff, aborts on remove, and resumes from the drafts table after
 * an app restart or going back online. `cameraPrimer` is shown before the OS camera prompt; no camera means the
 * gallery. `onExif` gets the place and time read from a photo, to offer them with consent; nothing stores them.
 * `saved` photos (read on mount) come first; removing one only drops it from the list, the caller detaches it.
 * `hold` keeps the photos on the device (`kept`) and uploads them once it is false again.
 */
export function usePhotoUploads(
	draft: string,
	kind: DraftKind,
	{
		cameraPrimer,
		onExif,
		saved = [],
		hold = false,
	}: {
		cameraPrimer: () => Promise<boolean>;
		onExif?: (exif: PhotoExif) => void;
		saved?: SavedPhoto[];
		hold?: boolean;
	}
) {
	const t = useTranslations('photos');
	const online = isOnline(useNetworkState());
	const [photos, setPhotos] = useState<PickedPhoto[]>([]);
	const [preparing, setPreparing] = useState(0);
	const [notice, setNotice] = useState<PhotoMessage>();
	// Mutable side of the queue, read by async work that outlives a render.
	const live = useRef({
		alive: false,
		hold,
		photos: [] as PickedPhoto[],
		preparing: 0,
		chain: Promise.resolve(),
		controllers: new Map<string, AbortController>(),
		timers: new Map<string, ReturnType<typeof setTimeout>>(),
		attempts: new Map<string, number>(),
		// Keys waiting for or running an upload; enqueueing one of them again is a no-op.
		queued: new Set<string>(),
	});

	const commit = (next: PickedPhoto[]) => {
		live.current.photos = next;
		setPhotos(next);
	};
	const patch = (key: string, change: Partial<PickedPhoto>) =>
		commit(live.current.photos.map((photo) => (photo.key === key ? { ...photo, ...change } : photo)));
	const save = () => saveDraft(draft, kind, live.current.photos).catch(() => {});

	async function upload(key: string) {
		const photo = live.current.photos.find((item) => item.key === key);
		if (!live.current.alive || !photo || photo.photoId) return;
		if (live.current.hold) return patch(key, { status: 'kept', progress: 0 });
		const controller = new AbortController();
		live.current.controllers.set(key, controller);
		patch(key, { status: 'uploading', progress: 0, error: undefined });
		try {
			const { sha256, width, height, bytes, file } = photo;
			const { photoId } = await uploadPhoto(
				apiClient,
				{ sha256, width, height, bytes, file },
				{ signal: controller.signal, onProgress: (progress) => patch(key, { progress }), put: filePut }
			);
			live.current.attempts.delete(key);
			patch(key, { status: 'uploaded', progress: 1, photoId, uploadedAt: Date.now() });
			void save();
			AccessibilityInfo.announceForAccessibility(t('uploaded'));
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

	async function add(assets: ImagePicker.ImagePickerAsset[]) {
		const room = MAX_PHOTOS - live.current.photos.length - live.current.preparing;
		if (assets.length > room) setNotice('photos.limit');
		const picked = assets.slice(0, Math.max(0, room));
		// Over the room (Android without the system photo picker ignores selectionLimit): preparePhoto never sees them.
		for (const asset of assets.slice(picked.length)) deletePickerCopy(asset.uri);
		live.current.preparing += picked.length;
		setPreparing(live.current.preparing);
		// One at a time: a phone holds only one decoded 12 MP image.
		for (const asset of picked) {
			try {
				const { photo, exif } = await preparePhoto(asset);
				// The same photo twice would be one photo id twice.
				if (!live.current.alive || live.current.photos.some((item) => item.sha256 === photo.sha256)) {
					removeFiles(photo);
					continue;
				}
				const key = randomUUID();
				const kept = filesOf(draft, key);
				folder(draft).create({ intermediates: true, idempotent: true });
				await new File(photo.file.uri).move(new File(kept.file.uri));
				await new File(photo.thumb.uri).move(new File(kept.thumb.uri));
				const status = live.current.hold ? 'kept' : 'uploading';
				commit([...live.current.photos, { ...photo, ...kept, key, status, progress: 0 }]);
				void save();
				if (status === 'uploading') enqueue(key);
				if (exif.lat !== undefined || exif.takenAt) onExif?.(exif);
			} catch (error) {
				setNotice(error instanceof PhotoFileError ? fileErrors[error.code] : 'errors.UPLOAD_TYPE');
			} finally {
				live.current.preparing -= 1;
				setPreparing(live.current.preparing);
			}
		}
	}

	/** The camera after its primer and the OS prompt; denied or "Not now" opens the gallery instead (P2). */
	async function pick(source: 'camera' | 'gallery') {
		setNotice(undefined);
		const room = MAX_PHOTOS - live.current.photos.length - live.current.preparing;
		if (room <= 0) return setNotice('photos.limit');
		let camera = source === 'camera';
		if (camera) {
			let permission = await ImagePicker.getCameraPermissionsAsync();
			if (!permission.granted && permission.canAskAgain && (await cameraPrimer())) {
				permission = await ImagePicker.requestCameraPermissionsAsync();
			}
			camera = permission.granted;
		}
		const result = camera
			? await ImagePicker.launchCameraAsync(pickerOptions)
			: await ImagePicker.launchImageLibraryAsync({
					...pickerOptions,
					allowsMultipleSelection: room > 1,
					selectionLimit: room,
					orderedSelection: true,
				});
		if (!result.canceled) await add(result.assets);
	}

	function remove(key: string) {
		live.current.controllers.get(key)?.abort();
		clearTimeout(live.current.timers.get(key));
		const photo = live.current.photos.find((item) => item.key === key);
		if (photo && !photo.saved) removeFiles(photo);
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
		const stored = await loadDraft(draft).catch(() => []);
		if (cancelled() || !(stored.length || saved.length)) return;
		const restored = stored.flatMap((photo): PickedPhoto[] => {
			const kept = filesOf(draft, photo.key);
			if (!new File(kept.file.uri).exists) return [];
			const fresh = photo.photoId && photo.uploadedAt && Date.now() - photo.uploadedAt < PHOTO_ID_TTL;
			return [
				{
					...photo,
					...kept,
					photoId: fresh ? photo.photoId : undefined,
					status: fresh ? 'uploaded' : live.current.hold ? 'kept' : 'uploading',
					progress: fresh ? 1 : 0,
				},
			];
		});
		commit([...saved.map(fromSaved), ...restored, ...live.current.photos]);
		for (const photo of restored) if (photo.status === 'uploading') enqueue(photo.key);
	});
	const release = useEffectEvent(() => {
		const kept = live.current.photos.filter((photo) => photo.status === 'kept');
		if (!kept.length) return;
		commit(
			live.current.photos.map((photo) => (photo.status === 'kept' ? { ...photo, status: 'uploading' } : photo))
		);
		for (const photo of kept) enqueue(photo.key);
	});
	const backOnline = useEffectEvent(() => {
		for (const photo of live.current.photos) if (photo.error === 'photos.failed_network') retry(photo.key);
	});

	useEffect(() => {
		if (online) backOnline();
	}, [online]);

	useEffect(() => {
		live.current.hold = hold;
		if (!hold) release();
	}, [hold]);

	useEffect(() => {
		const state = live.current;
		state.alive = true;
		let cancelled = false;
		void restore(() => cancelled);
		return () => {
			cancelled = true;
			state.alive = false;
			for (const controller of state.controllers.values()) controller.abort();
			for (const timer of state.timers.values()) clearTimeout(timer);
			// The draft stays in SQLite and its files on disk; a remount restores it.
			state.photos = [];
		};
	}, [draft]);

	return { photos, preparing, notice, pick, remove, move, retry };
}
