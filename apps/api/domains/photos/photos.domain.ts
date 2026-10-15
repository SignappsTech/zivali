// Photos (C5, ADR-014): presigned uploads to the private bucket, re-encoding with sharp (photo.process), public
// copies while a report is visible (photo.publish) and cleanup (retention.purge). Object keys are always chosen
// here, never taken from the client; unprocessed uploads are never served and are deleted once processed.
import { createHash } from 'node:crypto';

import sharp from 'sharp';
import type { z } from 'zod';

import { MAX_PHOTO_BYTES, type CreatePhotoInput } from '@zivali/validation';

import type { ObjectRef, PresignedPut } from '../../adapters/storage/index.ts';
import type { PHOTO_REJECT_REASON } from '../../generated/enums.ts';
import { config } from '../../lib/config.ts';
import type { Ctx } from '../../lib/ctx.ts';
import { AppError } from '../../lib/errors.ts';
import type { QueueName } from '../../lib/jobs.ts';
import { prisma, type Prisma } from '../../prisma/prisma.ts';
import { ReportsDomain } from '../reports/index.ts';
import {
	VARIANTS,
	VARIANT_NAMES,
	type Variant,
	mediaRef,
	photoObjects,
	uploadRef,
	variantRef,
} from './photo-objects.ts';
import PhotosDao, { type PhotoRow } from './photos.dao.ts';

const UPLOAD_TTL_S = 300;
const THUMB_TTL_S = 600;
const HOUR_MS = 3600_000;
const UNATTACHED_MS = 24 * HOUR_MS;
const ENDED_RETENTION_MS = 365 * 24 * HOUR_MS;
const PURGE_CHUNK = 500;
const DISPLAY_PX = 1600;
const THUMB_PX = 480;
// Inputs are ≤ 1600 px by contract; refuse to decode anything far larger (decompression bombs).
const MAX_INPUT_PIXELS = 2048 * 2048;
const SHARP_TIMEOUT_S = 30;

/** Queues sent { photo_id } for every accepted photo: empty in M2; M3 adds ai.extract and photo.embed. */
export const PHOTO_HOOKS: readonly QueueName[] = [];

/** Public URL of an object in the media bucket (MEDIA_BASE_URL; MinIO locally). */
function mediaUrl(ref: ObjectRef): string {
	const base =
		config.MEDIA_BASE_URL ??
		(config.NODE_ENV === 'production' ? undefined : `${config.S3_ENDPOINT}/${config.R2_BUCKET_MEDIA}`);
	if (!base) throw new Error('MEDIA_BASE_URL is not set');
	return `${base.replace(/\/+$/, '')}/${ref.key}`;
}

/** C5: public while the report is (C4 visibility) and not expired. */
function isPublishable(report: NonNullable<PhotoRow['report']>, now: Date): boolean {
	return ReportsDomain.notPublicReason(report, now) === null && report.close_reason !== 'expired';
}

function inTransaction<T>(ctx: Ctx, fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
	return ctx.tx ? fn(ctx.tx) : prisma.$transaction(fn);
}

/** The caller's photo; anyone else's reads as unknown. */
async function getOwned(id: string, ctx: Ctx): Promise<PhotoRow> {
	const photo = await PhotosDao.findById(id, ctx.tx);
	if (!photo || !ctx.actor || photo.owner_id !== ctx.actor.user_id)
		throw new AppError('NOT_FOUND', 'Photo not found');
	return photo;
}

export type CreatedPhoto = { photo_id: string; upload: PresignedPut } | { photo_id: string; existing: true };

/**
 * POST /v1/photos. Same owner and hash after a successful /complete: `existing` (and the purge clock restarts).
 * Otherwise (new, or never completed) a 5-minute presigned PUT pinned to image/jpeg and the declared length.
 */
export async function createPhoto(input: z.infer<typeof CreatePhotoInput>, ctx: Ctx): Promise<CreatedPhoto> {
	if (!ctx.actor) throw new AppError('UNAUTHENTICATED', 'Sign in required');
	const { sha256, width, height, bytes } = input;
	const photo = await PhotosDao.upsertByHash(
		{ owner_id: ctx.actor.user_id, sha256, width, height, bytes },
		ctx.now,
		ctx.tx
	);
	if (photo.status !== 'pending') return { photo_id: photo.id, existing: true };
	if (photo.width !== width || photo.height !== height || photo.bytes !== bytes)
		await PhotosDao.update(photo.id, { width, height, bytes }, ctx.tx);
	const upload = await ctx.adapters.storage.presignPut(uploadRef(photo), {
		contentType: 'image/jpeg',
		contentLength: bytes,
		expiresInS: UPLOAD_TTL_S,
	});
	return { photo_id: photo.id, upload };
}

/** POST /v1/photos/:id/complete: the upload must be in the bucket; queues photo.process once. */
export async function completePhoto(input: { id: string }, ctx: Ctx): Promise<{ status: 'uploaded' }> {
	const photo = await getOwned(input.id, ctx);
	if (photo.status === 'pending') {
		if (!(await ctx.adapters.storage.head(uploadRef(photo)))) throw new AppError('CONFLICT', 'Upload not found');
		await inTransaction(ctx, async (tx) => {
			if (await PhotosDao.markUploaded(photo.id, tx))
				await ctx.jobs.send('photo.process', { photo_id: photo.id }, { tx });
		});
	}
	return { status: 'uploaded' };
}

/** GET /v1/photos/:id: the public thumb once published, else a 10-minute presigned GET of the private one. */
export async function getPhoto(input: { id: string }, ctx: Ctx): Promise<{ photo: PhotoRow; thumb_url: string }> {
	const photo = await getOwned(input.id, ctx);
	const thumb_url =
		photo.status === 'published' && photo.public_thumb_url
			? photo.public_thumb_url
			: await ctx.adapters.storage.presignGet(variantRef(photo.id, 'thumb.webp'), { expiresInS: THUMB_TTL_S });
	return { photo, thumb_url };
}

/** DELETE /v1/photos/:id: refused while public on a report; the row goes now, its objects in retention.purge. */
export async function deletePhoto(input: { id: string }, ctx: Ctx): Promise<void> {
	const photo = await getOwned(input.id, ctx);
	if (photo.report && (photo.status === 'published' || isPublishable(photo.report, ctx.now)))
		throw new AppError('CONFLICT', 'Photo is on a published report');
	await inTransaction(ctx, async (tx) => {
		await PhotosDao.remove(photo.id, tx);
		await ctx.jobs.send('retention.purge', { objects: photoObjects(photo) }, { tx });
	});
}

const isJpeg = (b: Buffer) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
const sha256Hex = (b: Buffer) => createHash('sha256').update(b).digest('hex');

/** Decodes, applies the EXIF orientation and re-encodes; sharp writes no metadata unless asked to. */
async function renderVariants(body: Buffer) {
	const resized = (px: number) =>
		sharp(body, { limitInputPixels: MAX_INPUT_PIXELS })
			.timeout({ seconds: SHARP_TIMEOUT_S })
			.rotate()
			.resize(px, px, { fit: 'inside', withoutEnlargement: true });
	const [displayWebp, displayJpg, thumb] = await Promise.all([
		resized(DISPLAY_PX).webp({ quality: 80 }).toBuffer({ resolveWithObject: true }),
		resized(DISPLAY_PX).jpeg({ quality: 82 }).toBuffer(),
		resized(THUMB_PX).webp({ quality: 80 }).toBuffer(),
	]);
	const files: Record<Variant, Buffer> = {
		'display.webp': displayWebp.data,
		'display.jpg': displayJpg,
		'thumb.webp': thumb,
	};
	return { files, width: displayWebp.info.width, height: displayWebp.info.height };
}

/**
 * photo.process: size, JPEG magic bytes and SHA-256 of the upload, then the sharp variants under variants/<id>/.
 * Accepted photos queue PHOTO_HOOKS, and photo.publish when on a report. The upload is deleted either way.
 * Idempotent: anything but an `uploaded` row (deleted, already processed) is skipped.
 */
export async function processPhoto(input: { photo_id: string }, ctx: Ctx): Promise<void> {
	const photo = await PhotosDao.findById(input.photo_id, ctx.tx);
	if (photo?.status !== 'uploaded') return;
	const storage = ctx.adapters.storage;
	const upload = uploadRef(photo);
	const head = await storage.head(upload);
	if (!head) throw new Error('photo.process: upload missing');

	let reason: PHOTO_REJECT_REASON | null = head.size > MAX_PHOTO_BYTES ? 'too_large' : null;
	let rendered: Awaited<ReturnType<typeof renderVariants>> | undefined;
	if (!reason) {
		const body = await storage.get(upload);
		if (body.length > MAX_PHOTO_BYTES) reason = 'too_large';
		else if (!isJpeg(body)) reason = 'not_jpeg';
		else if (sha256Hex(body) !== photo.sha256) reason = 'hash_mismatch';
		else {
			try {
				rendered = await renderVariants(body);
			} catch (err) {
				ctx.logger.info({ err, photo_id: photo.id }, 'photo decode failed');
				reason = 'decode_failed';
			}
		}
	}

	if (rendered) {
		for (const v of VARIANT_NAMES) await storage.put(variantRef(photo.id, v), rendered.files[v], VARIANTS[v]);
		const { width, height } = rendered;
		const accepted = await inTransaction(ctx, async (tx) => {
			// Conditional: a DELETE that raced this job removed the row, and its variants are ours to remove.
			if (!(await PhotosDao.settle(photo.id, { status: 'accepted', width, height }, tx))) return false;
			for (const queue of PHOTO_HOOKS) await ctx.jobs.send(queue, { photo_id: photo.id }, { tx });
			if (photo.report_id) await ctx.jobs.send('photo.publish', { report_id: photo.report_id }, { tx });
			return true;
		});
		if (!accepted) {
			await deleteObjects(
				VARIANT_NAMES.map((v) => variantRef(photo.id, v)),
				ctx
			);
			await storage.delete(upload);
			return;
		}
	} else {
		await PhotosDao.settle(photo.id, { status: 'rejected', reject_reason: reason }, ctx.tx);
		ctx.logger.info({ photo_id: photo.id, reason }, 'photo rejected');
	}
	await storage.delete(upload);
}

/**
 * photo.publish: a publishable report gets its accepted (or unpublished) variants copied to the media bucket and
 * public URLs set; any other state (held, hidden, removed, expired, closed > 30 days) deletes the public copies.
 */
export async function publishReportPhotos(input: { report_id: string }, ctx: Ctx): Promise<void> {
	const report = await PhotosDao.findReportPhotos(input.report_id, ctx.tx);
	if (!report) return;
	const storage = ctx.adapters.storage;
	if (isPublishable(report, ctx.now)) {
		for (const photo of report.photos.filter((p) => p.status !== 'published')) {
			// Both URLs first: a missing MEDIA_BASE_URL must fail before any copy exists.
			const public_display_url = mediaUrl(mediaRef(report.id, photo.id, 'display.jpg'));
			const public_thumb_url = mediaUrl(mediaRef(report.id, photo.id, 'thumb.webp'));
			for (const v of VARIANT_NAMES)
				await storage.copy(variantRef(photo.id, v), mediaRef(report.id, photo.id, v));
			await PhotosDao.update(photo.id, { status: 'published', public_display_url, public_thumb_url }, ctx.tx);
		}
		return;
	}
	for (const photo of report.photos.filter((p) => p.status === 'published')) {
		for (const v of VARIANT_NAMES) await storage.delete(mediaRef(report.id, photo.id, v));
		await PhotosDao.update(
			photo.id,
			{ status: 'unpublished', public_display_url: null, public_thumb_url: null },
			ctx.tx
		);
	}
}

/**
 * retention.purge for photos (C5), in chunks of 500: the rows go first, with the purge predicate re-applied (a photo
 * touched or attached since the listing stays), and their objects are queued in the same transaction.
 * Returns the rows deleted.
 */
export async function purgePhotos(ctx: Ctx): Promise<number> {
	const cutoffs = {
		unattachedBefore: new Date(ctx.now.getTime() - UNATTACHED_MS),
		endedBefore: new Date(ctx.now.getTime() - ENDED_RETENTION_MS),
	};
	let purged = 0;
	for (;;) {
		const photos = await PhotosDao.listPurgeable(cutoffs, PURGE_CHUNK, ctx.tx);
		if (!photos.length) return purged;
		const removed = await inTransaction(ctx, async (tx) => {
			const rows = await PhotosDao.removePurgeable(
				photos.map((p) => p.id),
				cutoffs,
				tx
			);
			if (rows.length) await ctx.jobs.send('retention.purge', { objects: rows.flatMap(photoObjects) }, { tx });
			return rows.length;
		});
		purged += removed;
		if (!removed) return purged;
	}
}

export async function deleteObjects(objects: ObjectRef[], ctx: Ctx): Promise<void> {
	for (const ref of objects) await ctx.adapters.storage.delete(ref);
}

export default {
	mediaUrl,
	createPhoto,
	completePhoto,
	getPhoto,
	deletePhoto,
	processPhoto,
	publishReportPhotos,
	purgePhotos,
	deleteObjects,
};
