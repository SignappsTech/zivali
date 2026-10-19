// Photo vectors (C20 §Jobs): photo.embed stores one L2-normalised vector per photo and active model, copying the
// vector of the same image (sha256) when another photo has one. Only photos whose safety check is stored and clean are
// ever embedded: no ai_results row means no vector (C19 §Pipeline 7, CH-562). embedding.backfill sends photo.embed for
// the photos a model lacks: those from before M3, and every photo when a new model comes (the model change).
import { setTimeout as sleep } from 'node:timers/promises';

import sharp from 'sharp';
import { z } from 'zod';

import { EmbedderError, embedderOn } from '../../adapters/embedder/index.ts';
import configStore from '../../lib/config-store.ts';
import type { Ctx } from '../../lib/ctx.ts';
import { prisma, type Prisma } from '../../prisma/prisma.ts';
import { variantRef } from '../photos/photo-objects.ts';
import EmbeddingsDao from './embeddings.dao.ts';

const EMBED_PX = 1024;
const SHARP_TIMEOUT_S = 30;
// Voyage: USD 0.60 per 10⁹ pixels, billed between 50k and 2M pixels per image.
const USD_PER_PIXEL = 0.6 / 1e9;
const MIN_PIXELS = 50_000;
const MAX_PIXELS = 2_000_000;
// Longest Retry-After the job waits for before it throws for pg-boss's retry.
const MAX_RETRY_AFTER_S = 60;

// Fail closed: a dog or cat and no prominent person or nudity; anything else (none, other, flagged, malformed) is not.
const SafeResult = z.object({
	result: z.object({ animal: z.enum(['dog', 'cat']) }),
	moderation: z.object({ person_prominent: z.literal(false), nsfw: z.literal(false) }),
});

function inTransaction<T>(ctx: Ctx, fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
	return ctx.tx ? fn(ctx.tx) : prisma.$transaction(fn);
}

/** embedding.model, plus embedding.next_model when set. */
async function activeModels(): Promise<string[]> {
	const models = [await configStore.get('embedding.model'), await configStore.get('embedding.next_model')];
	return [...new Set(models.filter((m): m is string => typeof m === 'string' && m.length > 0))];
}

/** This month's Voyage spend (UTC calendar month) has reached embedding.monthly_budget_usd; an unset budget is 0. */
async function overBudget(ctx: Ctx): Promise<boolean> {
	const budget = Number(await configStore.get('embedding.monthly_budget_usd'));
	const monthStart = new Date(Date.UTC(ctx.now.getUTCFullYear(), ctx.now.getUTCMonth(), 1));
	return !(budget > 0) || (await EmbeddingsDao.voyageSpendSince(monthStart, ctx.tx)) >= budget;
}

/** display.jpg downscaled in memory to a 1024 px long edge (EXIF already stripped by photo.process), with its billed pixels. */
async function loadImage(photo_id: string, ctx: Ctx) {
	const display = await ctx.adapters.storage.get(variantRef(photo_id, 'display.jpg'));
	const { data, info } = await sharp(display)
		.timeout({ seconds: SHARP_TIMEOUT_S })
		.resize(EMBED_PX, EMBED_PX, { fit: 'inside', withoutEnlargement: true })
		.jpeg({ quality: 80 })
		.toBuffer({ resolveWithObject: true });
	const pixels = Math.min(MAX_PIXELS, Math.max(MIN_PIXELS, info.width * info.height));
	return { jpegBase64: data.toString('base64'), pixels };
}

const errorCode = (err: unknown): string => {
	const code = (err as { code?: unknown } | null)?.code;
	return typeof code === 'string' ? code : 'internal';
};

/** A refused request (a 4xx other than 408 and 429: a bad image, a bad key) fails the same way on every retry. */
const refused = (err: unknown): boolean =>
	err instanceof EmbedderError && /^http_4\d\d$/.test(err.code) && err.code !== 'http_408' && err.code !== 'http_429';

/**
 * photo.embed { photo_id }: skips photos that are not accepted/published, lack a safety check or are flagged. For each
 * active model without a vector: copy the vector of the same image, else skip over the monthly budget or with the
 * embedder off (log only), else embed and store the vector with its ai_calls row (provider voyage or mock). A refused
 * request (400, 401, …) logs photo.embed.dead_letter at once and ends the job. Any other failure, a database error
 * included, throws for pg-boss's retry (after waiting out a short Retry-After); the last attempt logs
 * photo.embed.dead_letter first. Never image data in a log line.
 */
export async function embedPhoto(input: { photo_id: string; last_attempt?: boolean }, ctx: Ctx): Promise<void> {
	const log: { photo_id: string; model?: string } = { photo_id: input.photo_id };
	try {
		const photo = await EmbeddingsDao.findPhoto(input.photo_id, ctx.tx);
		if (photo?.status !== 'accepted' && photo?.status !== 'published') return;
		if (!SafeResult.safeParse(await EmbeddingsDao.findAiResult(photo.sha256, ctx.tx)).success) {
			return ctx.logger.info(log, 'photo.embed.skipped: no clean safety check');
		}
		const have = await EmbeddingsDao.modelsOf(photo.id, ctx.tx);
		let image: Awaited<ReturnType<typeof loadImage>> | undefined;
		for (const model of await activeModels()) {
			log.model = model;
			if (have.includes(model)) continue;
			if (await EmbeddingsDao.copyFromSameImage(photo, model, ctx.tx)) continue;
			if (await overBudget(ctx)) {
				ctx.logger.info(log, 'photo.embed.budget');
				continue;
			}
			const { embedder } = ctx.adapters;
			if (!embedderOn(embedder)) {
				ctx.logger.info(log, 'photo.embed.off');
				continue;
			}
			image ??= await loadImage(photo.id, ctx);
			const started = Date.now();
			const [vector] = await embedder.embed([{ jpegBase64: image.jpegBase64, sha256: photo.sha256 }], model);
			const call = {
				photo_id: photo.id,
				provider: embedder.provider,
				model,
				pixels: image.pixels,
				cost_usd: (image.pixels * USD_PER_PIXEL).toFixed(6),
				latency_ms: Date.now() - started,
			};
			await inTransaction(ctx, async (tx) => {
				await EmbeddingsDao.insertVector(photo.id, model, vector!, tx);
				await EmbeddingsDao.recordCall(call, tx);
			});
		}
	} catch (err) {
		if (input.last_attempt || refused(err)) {
			ctx.logger.error({ ...log, code: errorCode(err) }, 'photo.embed.dead_letter');
			if (refused(err)) return; // a retry cannot help: the job completes
		} else if (err instanceof EmbedderError && err.retryAfterS) {
			await sleep(Math.min(err.retryAfterS, MAX_RETRY_AFTER_S) * 1000);
		}
		throw err;
	}
}

const BACKFILL_PAGE = 500;
// pg-boss's standard queue policy dedupes a singletonKey only within a time slot (singletonSeconds): a page retried or
// a backfill sent twice within the hour queues no second photo.embed for a photo. A later duplicate costs no call
// either, since photo.embed skips the models a photo has.
const EMBED_SINGLETON_S = 3600;
// The lowest uuid: the first page starts after it.
const FIRST = '00000000-0000-0000-0000-000000000000';

/**
 * embedding.backfill { model?, prune?, after? } (C20 §Jobs): one bounded pass, in pages of 500 by photo id, over the
 * eligible photos without a vector for `model` (default embedding.next_model ?? embedding.model). Each page sends
 * photo.embed (singleton key photo_id) at most embedding.backfill_per_minute per minute and re-queues the job for the
 * next page (`after` = the page's last id) once those are due, so a retried or resent page resumes where it was.
 * The empty page ends the pass with embedding.backfill.done { model, remaining } (photos still without a vector, 0
 * when all went well; budget, embedder off or refused requests leave some). `prune` first deletes the vectors of every
 * model other than embedding.model and embedding.next_model. A model that is neither, or the embedder off: log only.
 */
export async function backfill(input: { model?: string; prune?: boolean; after?: string }, ctx: Ctx): Promise<void> {
	const active = await activeModels();
	const model = input.model ?? active[1] ?? active[0];
	if (!model || !active.includes(model)) {
		return ctx.logger.warn({ model }, 'embedding.backfill.inactive: not embedding.model or embedding.next_model');
	}
	if (input.prune) {
		const deleted = await EmbeddingsDao.pruneVectors(active, ctx.tx);
		ctx.logger.info({ kept: active, deleted }, 'embedding.backfill.pruned');
	}
	if (!embedderOn(ctx.adapters.embedder)) return ctx.logger.info({ model }, 'embedding.backfill.off');
	const ids = await EmbeddingsDao.missingVectors(model, input.after ?? FIRST, BACKFILL_PAGE, ctx.tx);
	if (!ids.length) {
		const remaining = await EmbeddingsDao.countMissing(model, ctx.tx);
		return ctx.logger.info({ model, remaining }, 'embedding.backfill.done');
	}
	const perMinute = Math.max(1, Math.floor(Number(await configStore.get('embedding.backfill_per_minute')))) || 1;
	for (const [i, photo_id] of ids.entries()) {
		await ctx.jobs.send(
			'photo.embed',
			{ photo_id },
			{ singletonKey: photo_id, singletonSeconds: EMBED_SINGLETON_S, startAfter: Math.floor(i / perMinute) * 60 }
		);
	}
	const next = Math.ceil(ids.length / perMinute) * 60;
	await ctx.jobs.send('embedding.backfill', { model, after: ids.at(-1) }, { startAfter: next });
	ctx.logger.info({ model, sent: ids.length, next_page_s: next }, 'embedding.backfill.page');
}

/**
 * Seeder 41-embedding-backfill (C20 §Jobs): queues embedding.backfill for embedding.model when the embedder is on and
 * an eligible photo lacks a vector for it (one cheap query). Returns whether it queued one.
 */
export async function queueBackfill(ctx: Ctx): Promise<boolean> {
	if (!embedderOn(ctx.adapters.embedder)) return false;
	const model = await configStore.get('embedding.model');
	if (typeof model !== 'string' || !model) return false;
	if (!(await EmbeddingsDao.missingVectors(model, FIRST, 1, ctx.tx)).length) return false;
	await ctx.jobs.send('embedding.backfill', { model });
	return true;
}

export default { embedPhoto, backfill, queueBackfill };
