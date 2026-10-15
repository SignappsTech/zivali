// C5 photos: presigned uploads, status, attach in order.
import { IsoDateTime, Uuid } from './common.schema.ts';
import { PhotoRejectReason, PhotoStatus } from './enums.ts';
import { z } from './zod.ts';

export const MAX_PHOTOS = 5;
export const MAX_PHOTO_BYTES = 1024 * 1024;
export const Sha256 = z.string().regex(/^[a-f0-9]{64}$/, 'Expected a lower-case hex SHA-256');
const px = z.number().int().positive();

/** Ordered photo ids, at most 5, no repeats. */
export const PhotoIds = z
	.array(Uuid)
	.max(MAX_PHOTOS)
	.refine((ids) => new Set(ids).size === ids.length, 'Duplicate photo');

export const CreatePhotoInput = z
	.object({ sha256: Sha256, width: px, height: px, bytes: z.number().int().positive().max(MAX_PHOTO_BYTES) })
	.refine((p) => Math.max(p.width, p.height) <= 1600, { message: 'Long edge > 1600 px', path: ['width'] })
	.refine((p) => Math.min(p.width, p.height) >= 320, { message: 'Short edge < 320 px', path: ['height'] })
	.openapi('CreatePhotoInput');
export const PresignedUpload = z
	.object({
		url: z.url(),
		method: z.literal('PUT'),
		headers: z.record(z.string(), z.string()),
		expires_at: IsoDateTime,
	})
	.openapi('PresignedUpload');
export const CreatePhotoResponse = z
	.union([
		z.object({ photo_id: Uuid, upload: PresignedUpload }),
		z.object({ photo_id: Uuid, existing: z.literal(true) }),
	])
	.openapi('CreatePhotoResponse');
export const CompletePhotoResponse = z.object({ status: z.literal('uploaded') }).openapi('CompletePhotoResponse');
export const PhotoView = z
	.object({ id: Uuid, status: PhotoStatus, reject_reason: PhotoRejectReason.optional(), thumb_url: z.string() })
	.openapi('PhotoView');
export const SetPhotosInput = z.object({ photo_ids: PhotoIds }).openapi('SetPhotosInput');
export const PublicPhoto = z
	.object({
		url: z.string(),
		thumb_url: z.string(),
		alt: z.string(),
		width: z.number().int(),
		height: z.number().int(),
	})
	.openapi('PublicPhoto');
