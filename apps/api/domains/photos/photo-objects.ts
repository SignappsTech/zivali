// Storage keys of a photo (C5). Pure, so the reports area can queue deletes of public copies without importing the
// photos domain (which imports reports).
import type { ObjectRef } from '../../adapters/storage/index.ts';

export const VARIANTS = {
	'display.webp': 'image/webp',
	'display.jpg': 'image/jpeg',
	'thumb.webp': 'image/webp',
} as const;
export type Variant = keyof typeof VARIANTS;
export const VARIANT_NAMES = Object.keys(VARIANTS) as Variant[];
/** C5: retention.purge deletes a photo on no pet and no report this long after its last write (updated_at). */
export const UNATTACHED_MS = 24 * 3600_000;

export const uploadRef = (p: { id: string; owner_id: string }): ObjectRef => ({
	bucket: 'private',
	key: `uploads/${p.owner_id}/${p.id}.jpg`,
});
export const variantRef = (photoId: string, v: Variant): ObjectRef => ({
	bucket: 'private',
	key: `variants/${photoId}/${v}`,
});
export const mediaRef = (reportId: string, photoId: string, v: Variant): ObjectRef => ({
	bucket: 'media',
	key: `r/${reportId}/${photoId}/${v}`,
});

type Photo = {
	id: string;
	owner_id: string;
	report_id: string | null;
	public_display_url?: string | null;
	public_thumb_url?: string | null;
};

/** The public copies: from the report id and from the public URLs (a detached photo has lost its report id). */
export function publicObjects(p: Omit<Photo, 'owner_id'>): ObjectRef[] {
	const prefixes = new Set<string>();
	if (p.report_id) prefixes.add(`r/${p.report_id}/${p.id}/`);
	for (const url of [p.public_display_url, p.public_thumb_url]) {
		const m = url?.match(/(?:^|\/)(r\/[0-9a-f-]{36}\/[0-9a-f-]{36}\/)[^/]+$/i);
		if (m) prefixes.add(m[1]!);
	}
	return [...prefixes].flatMap((prefix) => VARIANT_NAMES.map((v) => ({ bucket: 'media' as const, key: prefix + v })));
}

/** Every object a photo can have; deleting a missing object is a no-op. */
export function photoObjects(p: Photo): ObjectRef[] {
	return [uploadRef(p), ...VARIANT_NAMES.map((v) => variantRef(p.id, v)), ...publicObjects(p)];
}
