// Photo vectors (C20 §Jobs): photo.embed stores one L2-normalised vector per photo and active model, copying the
// vector of the same image (sha256) when another photo has one. Only photos whose safety check is stored and clean are
// ever embedded: no ai_results row means no vector (C19 §Pipeline 7, CH-562).
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

/**
 * photo.embed { photo_id }: skips photos that are not accepted/published, lack a safety check or are flagged. For each
 * active model without a vector: copy the vector of the same image, else skip over the monthly budget or with the
 * embedder off (log only), else embed and store the vector with its ai_calls row. A failure throws for pg-boss's retry
 * (after waiting out a short Retry-After); the last attempt logs photo.embed.dead_letter first, never image data.
 */
export async function embedPhoto(input: { photo_id: string; last_attempt?: boolean }, ctx: Ctx): Promise<void> {
	const photo = await EmbeddingsDao.findPhoto(input.photo_id, ctx.tx);
	if (photo?.status !== 'accepted' && photo?.status !== 'published') return;
	const log = { photo_id: photo.id };
	if (!SafeResult.safeParse(await EmbeddingsDao.findAiResult(photo.sha256, ctx.tx)).success) {
		return ctx.logger.info(log, 'photo.embed.skipped: no clean safety check');
	}
	const have = await EmbeddingsDao.modelsOf(photo.id, ctx.tx);
	let image: Awaited<ReturnType<typeof loadImage>> | undefined;
	for (const model of await activeModels()) {
		if (have.includes(model)) continue;
		try {
			if (await EmbeddingsDao.copyFromSameImage(photo, model, ctx.tx)) continue;
			if (await overBudget(ctx)) {
				ctx.logger.info({ ...log, model }, 'photo.embed.budget');
				continue;
			}
			if (!embedderOn(ctx.adapters.embedder)) {
				ctx.logger.info({ ...log, model }, 'photo.embed.off');
				continue;
			}
			image ??= await loadImage(photo.id, ctx);
			const started = Date.now();
			const [vector] = await ctx.adapters.embedder.embed(
				[{ jpegBase64: image.jpegBase64, sha256: photo.sha256 }],
				model
			);
			const call = {
				photo_id: photo.id,
				model,
				pixels: image.pixels,
				cost_usd: (image.pixels * USD_PER_PIXEL).toFixed(6),
				latency_ms: Date.now() - started,
			};
			await inTransaction(ctx, async (tx) => {
				await EmbeddingsDao.insertVector(photo.id, model, vector!, tx);
				await EmbeddingsDao.recordCall(call, tx);
			});
		} catch (err) {
			if (input.last_attempt)
				ctx.logger.error({ ...log, model, code: errorCode(err) }, 'photo.embed.dead_letter');
			else if (err instanceof EmbedderError && err.retryAfterS) {
				await sleep(Math.min(err.retryAfterS, MAX_RETRY_AFTER_S) * 1000);
			}
			throw err;
		}
	}
}

export default { embedPhoto };
