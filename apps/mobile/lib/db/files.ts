import { Directory, Paths } from 'expo-file-system';

// ADR-019: thumbnails are purgeable (cache); draft and queued outbox photos are not (document), per <id>/ subfolder.
export const thumbsDir = new Directory(Paths.cache, 'thumbs');
export const draftsDir = new Directory(Paths.document, 'drafts');
/** expo-image-picker's copies of picked originals (full EXIF/GPS); preparePhoto deletes them, the wipe sweeps leftovers. */
export const pickerCacheDir = new Directory(Paths.cache, 'ImagePicker');
export const outboxDir = new Directory(Paths.document, 'outbox');

/** Bytes on disk for the cache budget (`cache.max_mb`) and the offline data settings. */
export function bytesUsed(): { thumbnails: number; queuedPhotos: number } {
	return { thumbnails: thumbsDir.size ?? 0, queuedPhotos: outboxDir.size ?? 0 };
}
