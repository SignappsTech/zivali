// C5 photos and storage: presigned uploads to R2.
import type { IsoDateTime, Uuid } from './common.ts';
import type { PhotoRejectReason, PhotoStatus } from './enums.ts';

/** POST /v1/photos (≤ 1 MB, long edge ≤ 1600 px, short edge ≥ 320 px). */
export type CreatePhotoInput = { sha256: string; width: number; height: number; bytes: number };
export type PresignedUpload = {
	url: string;
	method: 'PUT';
	headers: Record<string, string>;
	expires_at: IsoDateTime;
};
/** 201 with an upload, or 200 `existing: true` for the same owner and hash. */
export type CreatePhotoResponse = { photo_id: Uuid; upload: PresignedUpload } | { photo_id: Uuid; existing: true };
export type CompletePhotoResponse = { status: 'uploaded' };
/** GET /v1/photos/:id (owner). */
export type PhotoView = { id: Uuid; status: PhotoStatus; reject_reason?: PhotoRejectReason; thumb_url: string };
/** PUT /v1/pets/:id/photos and report create/update: ordered, at most 5. */
export type SetPhotosInput = { photo_ids: Uuid[] };
/** Photo of a public report (C4 PublicReport.photos). */
export type PublicPhoto = { url: string; thumb_url: string; alt: string; width: number; height: number };
