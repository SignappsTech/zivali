// Attribute extraction (C19 §Pipeline): one capped, cached vision call per image that never blocks a form. Every
// outcome is recorded in ai_calls; anything off, over a cap or failing just leaves the form manual (fail open).
import sharp from 'sharp';
import { z } from 'zod';

import { aiExtractionSchema } from '@zivali/validation/ai';

import { AI_PROMPT_VERSION, aiOn, type AiExtraction, type AiReply } from '../../adapters/ai/index.ts';
import type { AI_OUTCOME } from '../../generated/enums.ts';
import { config } from '../../lib/config.ts';
import configStore from '../../lib/config-store.ts';
import type { Ctx } from '../../lib/ctx.ts';
import { AppError } from '../../lib/errors.ts';
import { prisma, type Prisma } from '../../prisma/prisma.ts';
import { variantRef } from '../photos/photo-objects.ts';
import AiDao from './ai.dao.ts';
import { costUsd } from './pricing.ts';

const VISION_PX = 1024;
const SHARP_TIMEOUT_S = 30;
const DAY_MS = 24 * 60 * 60 * 1000;
const CALLS_KEPT_DAYS = 62;

// Embedded only when clean: a dog or cat with no prominent person or nudity (C19 §Pipeline 7). Malformed = not clean.
const Clean = z.object({
	result: z.object({ animal: z.enum(['dog', 'cat']) }),
	moderation: z.object({ person_prominent: z.literal(false), nsfw: z.literal(false) }),
});

function inTransaction<T>(ctx: Ctx, fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
	return ctx.tx ? fn(ctx.tx) : prisma.$transaction(fn);
}

// Owner, 2026-10-19 (TASK-40.11): photos uploaded before the AI switch-on never go to Anthropic or Voyage. A cutoff
// before that day is a mistake, never a setting.
const PHOTOS_SINCE_FLOOR = Date.parse('2026-10-19T00:00:00Z');
const Instant = z.iso.datetime({ offset: true });

/**
 * app_config ai.photos_since (the switch-on instant): only photos created strictly after it are ever sent to a
 * provider, by ai.extract, photo.embed or the backfill. Unset, not an ISO 8601 string with Z or an offset, or before
 * 2026-10-19: null, and nothing is sent (fail closed).
 */
export async function photosSince(): Promise<Date | null> {
	const value = Instant.safeParse(await configStore.get('ai.photos_since'));
	const ms = value.success ? Date.parse(value.data) : Number.NaN;
	return ms >= PHOTOS_SINCE_FLOOR ? new Date(ms) : null;
}

/** display.jpg (EXIF already stripped by photo.process) downscaled in memory to a 1024 px long edge, JPEG q80. */
async function loadImage(photo_id: string, ctx: Ctx): Promise<string> {
	const display = await ctx.adapters.storage.get(variantRef(photo_id, 'display.jpg'));
	const jpeg = await sharp(display)
		.timeout({ seconds: SHARP_TIMEOUT_S })
		.resize(VISION_PX, VISION_PX, { fit: 'inside', withoutEnlargement: true })
		.jpeg({ quality: 80 })
		.toBuffer();
	return jpeg.toString('base64');
}

/** The skip outcome of the first cap that applies, in C19 order, or null when the call may go out. */
async function capOutcome(photo: { owner_id: string; anonymous: boolean }, ctx: Ctx): Promise<AI_OUTCOME | null> {
	if ((await configStore.get('ai.enabled')) !== true || !aiOn(ctx.adapters.ai)) return 'skipped_disabled';
	// Unset or unreadable numbers fail closed: no spend.
	const budget = Number(await configStore.get('ai.monthly_budget_usd'));
	const monthStart = new Date(Date.UTC(ctx.now.getUTCFullYear(), ctx.now.getUTCMonth(), 1));
	if (!(budget > (await AiDao.spendSince(monthStart, ctx.tx)))) return 'skipped_budget';
	const limit = Number(await configStore.get(photo.anonymous ? 'ai.daily_photos_anonymous' : 'ai.daily_photos_user'));
	const since = new Date(ctx.now.getTime() - DAY_MS);
	if (!(limit > (await AiDao.callsSince(photo.owner_id, since, ctx.tx)))) return 'skipped_limit';
	return null;
}

// The class (RateLimitError, APIConnectionError, …), never the message: SDK errors leave `name` as "Error".
const errorName = (err: unknown) => (err instanceof Error ? err.constructor.name : 'unknown');

/**
 * ai.extract { photo_id }: nothing for a photo that is not accepted/published any more, or not created after
 * ai.photos_since (photosSince; logs ai.extract.cutoff, whatever path queued the job). Else the cached result of the
 * same image, a cap's skip outcome, or one adapter call (refused, invalid and a rejected request store no result). A
 * retryable error throws for pg-boss's retry; on the last attempt it is recorded as failed. Then one ai_calls row and,
 * unless the result is flagged or not a dog or cat, photo.embed, in one transaction; logs ai.extract.done.
 */
export async function extractPhoto(input: { photo_id: string; last_attempt?: boolean }, ctx: Ctx): Promise<void> {
	const started = Date.now();
	const photo = await AiDao.findPhoto(input.photo_id, ctx.tx);
	if (photo?.status !== 'accepted' && photo?.status !== 'published') return;
	const since = await photosSince();
	if (!since || photo.created_at <= since) return ctx.logger.info({ photo_id: photo.id }, 'ai.extract.cutoff');
	const none = { model: config.AI_VISION_MODEL, input_tokens: 0, output_tokens: 0 };
	let reply: AiReply | { outcome: AI_OUTCOME; model: string; input_tokens: number; output_tokens: number };
	let stored: { result: object; moderation: object } | null = null;
	let error: string | undefined;

	const cached = await AiDao.findResult(photo.sha256, ctx.tx);
	const owner = { owner_id: photo.owner_id, anonymous: photo.owner.is_anonymous };
	const skipped = cached ? null : await capOutcome(owner, ctx);
	if (cached) {
		reply = { ...none, model: cached.model, outcome: 'cached' };
		stored = cached as { result: object; moderation: object };
	} else if (skipped) {
		reply = { ...none, outcome: skipped };
	} else {
		try {
			reply = await ctx.adapters.ai.extract({ jpegBase64: await loadImage(photo.id, ctx), sha256: photo.sha256 });
		} catch (err) {
			if (!input.last_attempt) throw err;
			reply = { ...none, outcome: 'failed' };
			error = errorName(err);
		}
		if ('error' in reply) error = reply.error;
		if ('extraction' in reply) {
			const { moderation, ...result } = reply.extraction;
			stored = { result, moderation };
		}
	}

	const { outcome, model, input_tokens, output_tokens } = reply;
	const latency_ms = Date.now() - started;
	// The mock is free; a real call is booked from its usage (skips and cache hits have none).
	const cost_usd = ctx.adapters.ai.provider === 'anthropic' ? costUsd(model, input_tokens, output_tokens) : '0';
	await inTransaction(ctx, async (tx) => {
		if (outcome === 'ok' && stored)
			await AiDao.insertResult({ sha256: photo.sha256, model, prompt_version: AI_PROMPT_VERSION, ...stored }, tx);
		await AiDao.recordCall(
			{ photo_id: photo.id, model, outcome, input_tokens, output_tokens, cost_usd, latency_ms },
			tx
		);
		if (!stored || Clean.safeParse(stored).success)
			await ctx.jobs.send('photo.embed', { photo_id: photo.id }, { tx });
	});
	ctx.logger.info({ photo_id: photo.id, outcome, latency_ms, ...(error && { error }) }, 'ai.extract.done');
}

/** retention.purge: ai_calls older than 62 days, ai_results of images no photo has any more (C19 §Models). */
export async function purgeExpired(ctx: Ctx) {
	return AiDao.purge(new Date(ctx.now.getTime() - CALLS_KEPT_DAYS * DAY_MS), ctx.tx);
}

export type AttributesView =
	{ status: 'pending' | 'unavailable' } | { status: 'ready'; extraction: AiExtraction; min_confidence: number };

/**
 * GET /v1/photos/:id/attributes (C19 §REST). Only the photo's owner: anyone else's photo, an unknown or a rejected
 * one is NOT_FOUND. pending until the photo is accepted and ai.extract has recorded its outcome; ok or cached with a
 * stored result is ready; anything else (AI off, a cap, refused, invalid, failed) is unavailable.
 */
export async function getPhotoAttributes(input: { id: string }, ctx: Ctx): Promise<AttributesView> {
	const photo = await AiDao.findPhoto(input.id, ctx.tx);
	if (!photo || !ctx.actor || photo.owner_id !== ctx.actor.user_id || photo.status === 'rejected')
		throw new AppError('NOT_FOUND', 'Photo not found');
	if (photo.status === 'pending' || photo.status === 'uploaded') return { status: 'pending' };
	const call = await AiDao.findOutcome(photo.id, ctx.tx);
	if (!call) return { status: 'pending' };
	const stored =
		call.outcome === 'ok' || call.outcome === 'cached' ? await AiDao.findResult(photo.sha256, ctx.tx) : null;
	// A stored result that no longer fits the schema leaves the form manual, like any other failure (fail open).
	const parsed =
		stored && aiExtractionSchema.safeParse({ ...(stored.result as object), moderation: stored.moderation });
	if (!parsed?.success) return { status: 'unavailable' };
	// Unset or not a number: NaN, so every value is null (nothing pre-filled).
	const min = await configStore.get('ai.min_confidence');
	return { status: 'ready', extraction: parsed.data, min_confidence: typeof min === 'number' ? min : Number.NaN };
}

export default { photosSince, extractPhoto, purgeExpired, getPhotoAttributes };
