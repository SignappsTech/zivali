// Ad administration (C14 §Admin, FR-031): admins with aal2 only. Every save runs the content and exclusivity checks
// (assertAdWritable) and, when it sets an image, the image check (assertAdImage) inside its transaction; every create, edit, image change, status change and soft delete writes
// an audit entry. ad_stats_daily rows are never touched here, so ending or deleting an ad mid-day keeps its stats.
import { createHash } from 'node:crypto';

import sharp from 'sharp';

import type {
	AdDeleteInput,
	AdImageInput as AdImageMeta,
	AdInput,
	AdminAdQuery,
	AdStatsQuery,
	AdStatus,
} from '@zivali/types';
import { AdImageInput } from '@zivali/validation';

import type { PresignedPut } from '../../adapters/storage/index.ts';
import type { Ctx } from '../../lib/ctx.ts';
import { AppError } from '../../lib/errors.ts';
import { prisma, type Prisma } from '../../prisma/prisma.ts';
import { AuditDao } from '../platform/index.ts';
import AdsDao, { type AdRow } from './ads.dao.ts';
import { assertAdAdmin, assertAdWritable, dbSlot, type AdWrite } from './ads.domain.ts';
import AdsMapper from './ads.mapper.ts';

const PAGE = 50;
const UPLOAD_TTL_S = 300;
const MAX_STATS_DAYS = 366;
const DAY_MS = 86_400_000;

function inTransaction<T>(ctx: Ctx, fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
	return ctx.tx ? fn(ctx.tx) : prisma.$transaction(fn);
}

const invalid = (path: string, message: string) => new AppError('VALIDATION', message, undefined, [{ path, message }]);

/** A soft-deleted ad reads as unknown, unless `deleted` (stats only). */
async function getAd(id: string, tx?: Prisma.TransactionClient, deleted = false): Promise<AdRow> {
	const ad = await (deleted ? AdsDao.findAnyById(id, tx) : AdsDao.findById(id, tx));
	if (!ad) throw new AppError('NOT_FOUND', 'Ad not found');
	return ad;
}

/** AdInput → columns. undefined leaves a column as it is; null clears it (targeting: every; dates: open). */
function toData<T extends Partial<AdInput>>(input: T) {
	const { slots, region_ids, municipality_ids, species, starts_at, ends_at, image, ...rest } = input;
	const list = <V>(value: V[] | null | undefined) => (value === undefined ? undefined : (value ?? []));
	const date = (value: string | null | undefined) =>
		value === undefined ? undefined : value === null ? null : new Date(value);
	return {
		...rest,
		image_path: image,
		slots: slots?.map(dbSlot),
		region_ids: list(region_ids),
		municipality_ids: list(municipality_ids),
		species: list(species),
		starts_at: date(starts_at),
		ends_at: date(ends_at),
	};
}

/**
 * The uploaded file itself, not what the client declared: 4:3, at least 1200×900 px, JPG or PNG under 500 KB (the
 * AdImageInput rules, P21). Runs inside the save transaction, on the key being set.
 */
async function assertAdImage(id: string, image_path: string, ctx: Ctx): Promise<void> {
	if (!image_path.startsWith(`ads/${id}/`)) throw invalid('image', 'The image key belongs to another ad');
	const ref = { bucket: 'media' as const, key: image_path };
	if (!(await ctx.adapters.storage.head(ref))) throw invalid('image', 'The image has not been uploaded yet');
	const body = await ctx.adapters.storage.get(ref);
	const meta = await sharp(body)
		.metadata()
		.catch(() => undefined);
	const types: Record<string, string> = { jpeg: 'image/jpeg', png: 'image/png' };
	const actual = AdImageInput.safeParse({
		sha256: createHash('sha256').update(body).digest('hex'),
		width: meta?.width,
		height: meta?.height,
		bytes: body.length,
		content_type: meta?.format && types[meta.format],
	});
	if (!actual.success)
		throw invalid('image', 'The image must be a 4:3 JPG or PNG of at least 1200×900 px and under 500 KB');
}

/** GET /v1/admin/ads: newest first, without soft-deleted ads. */
export async function listAds(input: AdminAdQuery, ctx: Ctx) {
	assertAdAdmin(ctx);
	const rows = await AdsDao.listAdmin({ ...input, take: PAGE + 1 }, ctx.tx);
	const items = rows.slice(0, PAGE);
	return { items, next_cursor: rows.length > PAGE ? items[items.length - 1]!.id : null };
}

/** POST /v1/admin/ads. */
export async function createAd(input: AdInput, ctx: Ctx): Promise<AdRow> {
	assertAdAdmin(ctx);
	const actor_id = ctx.actor.user_id;
	if (input.image !== undefined) throw invalid('image', 'Upload the image after the ad is created');
	return inTransaction(ctx, async (tx) => {
		await assertAdWritable(input, { ...ctx, tx });
		const ad = await AdsDao.create({ ...toData(input), created_by: actor_id }, tx);
		await AuditDao.write(tx, {
			actor_id,
			action: 'ad.create',
			target_type: 'ad',
			target_id: ad.id,
			diff: { to: input },
		});
		return ad;
	});
}

/** PUT /v1/admin/ads/:id: the given fields replace the stored ones; the merged ad must pass every save check. */
export async function updateAd(input: AdInput & { id: string }, ctx: Ctx): Promise<AdRow> {
	assertAdAdmin(ctx);
	const actor_id = ctx.actor.user_id;
	const { id, ...given } = input;
	const changes = Object.fromEntries(Object.entries(given).filter(([, value]) => value !== undefined)) as AdInput;
	return inTransaction(ctx, async (tx) => {
		const row = await getAd(id, tx);
		const before = AdsMapper.toAdminAdDto(row);
		const ad: AdWrite = { ...before, ...changes, id };
		if (ad.starts_at && ad.ends_at && Date.parse(ad.ends_at) <= Date.parse(ad.starts_at))
			throw invalid('ends_at', 'Ends before it starts');
		await assertAdWritable(ad, { ...ctx, tx });
		if (changes.image) await assertAdImage(id, changes.image, { ...ctx, tx });
		// Image-less ads are house ads only (the seeded ones); a sponsor ad always shows its image.
		else if (changes.image === null && !ad.is_house) throw invalid('image', 'Only a house ad can have no image');
		const saved = await AdsDao.update(id, toData(changes), tx);
		const from = Object.fromEntries(
			Object.keys(changes).map((key) => [
				key,
				key === 'image' ? row.image_path : before[key as keyof typeof before],
			])
		);
		await AuditDao.write(tx, {
			actor_id,
			action: 'ad.update',
			target_type: 'ad',
			target_id: id,
			diff: { from, to: changes },
		});
		return saved;
	});
}

/**
 * POST /v1/admin/ads/:id/image: a 5-minute presigned PUT to the media bucket, pinned to the declared type and length
 * (the schema checked the declared size and type), and the key to send as `image` on the next save. The ad row is not
 * touched: it keeps serving its current image until a save has checked the uploaded file. Keys are content-addressed,
 * so a replaced image never changes under a cached URL.
 */
export async function requestAdImageUpload(
	input: AdImageMeta & { id: string },
	ctx: Ctx
): Promise<{ upload: PresignedPut; image: string }> {
	assertAdAdmin(ctx);
	const { id, sha256, bytes, content_type } = input;
	await getAd(id, ctx.tx);
	const image = `ads/${id}/${sha256}.${content_type === 'image/png' ? 'png' : 'jpg'}`;
	const upload = await ctx.adapters.storage.presignPut(
		{ bucket: 'media', key: image },
		{ contentType: content_type, contentLength: bytes, expiresInS: UPLOAD_TTL_S }
	);
	return { upload, image };
}

/** POST /v1/admin/ads/:id/status. Pausing or ending is always allowed; any other status is a save (all checks). */
export async function setAdStatus(input: { id: string; status: AdStatus }, ctx: Ctx): Promise<AdRow> {
	assertAdAdmin(ctx);
	const actor_id = ctx.actor.user_id;
	const { id, status } = input;
	const takedown = status === 'paused' || status === 'ended';
	return inTransaction(ctx, async (tx) => {
		const before = await getAd(id, tx);
		if (!takedown) await assertAdWritable({ ...AdsMapper.toAdminAdDto(before), id, status }, { ...ctx, tx });
		const saved = await AdsDao.update(id, { status }, tx);
		await AuditDao.write(tx, {
			actor_id,
			action: 'ad.status',
			target_type: 'ad',
			target_id: id,
			diff: { from: before.status, to: status },
		});
		return saved;
	});
}

/** DELETE /v1/admin/ads/:id: soft delete (no longer listed or served); the note goes into the audit entry. */
export async function deleteAd(input: AdDeleteInput & { id: string }, ctx: Ctx): Promise<void> {
	assertAdAdmin(ctx);
	const actor_id = ctx.actor.user_id;
	await inTransaction(ctx, async (tx) => {
		await getAd(input.id, tx);
		await AdsDao.update(input.id, { deleted_at: ctx.now }, tx);
		await AuditDao.write(tx, {
			actor_id,
			action: 'ad.delete',
			target_type: 'ad',
			target_id: input.id,
			note: input.note,
		});
	});
}

/** GET /v1/admin/ads/:id/stats: also for a soft-deleted ad. Daily rows per slot and region, from and to inclusive (at most 366 days). */
export async function getAdStats(input: AdStatsQuery & { id: string }, ctx: Ctx) {
	assertAdAdmin(ctx);
	const days = (Date.parse(input.to) - Date.parse(input.from)) / DAY_MS;
	if (days < 0) throw invalid('to', 'Ends before it starts');
	if (days >= MAX_STATS_DAYS) throw invalid('to', `At most ${MAX_STATS_DAYS} days`);
	await getAd(input.id, ctx.tx, true);
	return AdsDao.stats({ ad_id: input.id, from: input.from, to: input.to }, ctx.tx);
}

export default { listAds, createAd, updateAd, requestAdImageUpload, setAdStatus, deleteAd, getAdStats };
