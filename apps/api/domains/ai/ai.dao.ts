// Prisma access for attribute extraction (C19 §Models): ai_results (per image hash) and the Anthropic rows of the
// ai_calls ledger.
import type { AI_OUTCOME } from '../../generated/enums.ts';
import { prisma, type Prisma } from '../../prisma/prisma.ts';

type Tx = Prisma.TransactionClient;

export async function findPhoto(id: string, tx?: Tx) {
	const db = tx ?? prisma;
	return db.photos.findUnique({
		where: { id },
		select: {
			id: true,
			sha256: true,
			status: true,
			created_at: true,
			owner_id: true,
			owner: { select: { is_anonymous: true } },
		},
	});
}

export async function findResult(sha256: string, tx?: Tx) {
	const db = tx ?? prisma;
	return db.ai_results.findUnique({ where: { sha256 }, select: { model: true, result: true, moderation: true } });
}

/** Anthropic spend since the given instant, in USD. */
export async function spendSince(since: Date, tx?: Tx): Promise<number> {
	const db = tx ?? prisma;
	const { _sum } = await db.ai_calls.aggregate({
		where: { provider: 'anthropic', created_at: { gte: since } },
		_sum: { cost_usd: true },
	});
	return Number(_sum.cost_usd ?? 0);
}

/** The photo's ai.extract outcome (its newest Anthropic row), or null while the job has not run. */
export async function findOutcome(photo_id: string, tx?: Tx) {
	const db = tx ?? prisma;
	return db.ai_calls.findFirst({
		where: { photo_id, provider: 'anthropic' },
		orderBy: { created_at: 'desc' },
		select: { outcome: true },
	});
}

/** Outcomes of a provider call (ok, refused, invalid, failed): skips and cache hits made none. */
const CALLED: AI_OUTCOME[] = ['ok', 'refused', 'invalid', 'failed'];

/** The owner's provider calls since the given instant (the daily cap). */
export async function callsSince(owner_id: string, since: Date, tx?: Tx): Promise<number> {
	const db = tx ?? prisma;
	return db.ai_calls.count({
		where: { provider: 'anthropic', outcome: { in: CALLED }, created_at: { gte: since }, photo: { owner_id } },
	});
}

/** One result per image hash; a concurrent extraction of the same image keeps the first. */
export async function insertResult(
	data: { sha256: string; model: string; prompt_version: string; result: object; moderation: object },
	tx?: Tx
) {
	const db = tx ?? prisma;
	return db.ai_results.createMany({ data: [data], skipDuplicates: true });
}

type Call = {
	photo_id: string;
	model: string;
	outcome: AI_OUTCOME;
	input_tokens: number;
	output_tokens: number;
	cost_usd: string;
	latency_ms: number;
};

/** One ledger row per photo and model (a re-run of the job is not counted twice); count 0 when it already exists. */
export async function recordCall(data: Call, tx?: Tx) {
	const db = tx ?? prisma;
	return db.ai_calls.createMany({ data: [{ ...data, provider: 'anthropic' }], skipDuplicates: true });
}

/**
 * A retry of a failed extraction (TASK-40.12): claims the photo's failed row when its last call was at least an hour
 * ago, by moving created_at to now (the daily cap counts the retry). False: no failed row, or one retried within the
 * hour (a concurrent re-upload included).
 */
export async function claimRetry(photo_id: string, lastCallBefore: Date, now: Date, tx?: Tx): Promise<boolean> {
	const db = tx ?? prisma;
	const { count } = await db.ai_calls.updateMany({
		where: { photo_id, provider: 'anthropic', outcome: 'failed', created_at: { lte: lastCallBefore } },
		data: { created_at: now },
	});
	return count > 0;
}

/** The retry's outcome on the photo's failed row of that model; tokens and cost add up (the ledger stays whole). */
export async function bookRetry(data: Call, tx?: Tx): Promise<void> {
	const db = tx ?? prisma;
	const { photo_id, model, outcome, input_tokens, output_tokens, cost_usd, latency_ms } = data;
	await db.ai_calls.updateMany({
		where: { photo_id, provider: 'anthropic', model, outcome: 'failed' },
		data: {
			outcome,
			latency_ms,
			input_tokens: { increment: input_tokens },
			output_tokens: { increment: output_tokens },
			cost_usd: { increment: cost_usd },
		},
	});
}

/** retention.purge: ledger rows (Anthropic and Voyage) before `before`, and results no photo has the hash of. */
export async function purge(before: Date, tx?: Tx): Promise<{ ai_calls: number; ai_results: number }> {
	const db = tx ?? prisma;
	const calls = await db.ai_calls.deleteMany({ where: { created_at: { lt: before } } });
	const results = await db.$executeRaw`
		delete from app.ai_results r where not exists (select 1 from app.photos p where p.sha256 = r.sha256)`;
	return { ai_calls: calls.count, ai_results: results };
}

export default {
	findPhoto,
	findResult,
	findOutcome,
	spendSince,
	callsSince,
	insertResult,
	recordCall,
	claimRetry,
	bookRetry,
	purge,
};
