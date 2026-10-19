// Prisma access for attribute extraction (C19 §Models): ai_results (per image hash) and the Anthropic rows of the
// ai_calls ledger.
import type { AI_OUTCOME } from '../../generated/enums.ts';
import { prisma, type Prisma } from '../../prisma/prisma.ts';

type Tx = Prisma.TransactionClient;

export async function findPhoto(id: string, tx?: Tx) {
	const db = tx ?? prisma;
	return db.photos.findUnique({
		where: { id },
		select: { id: true, sha256: true, status: true, owner_id: true, owner: { select: { is_anonymous: true } } },
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

/** One ledger row per photo and model (a re-run of the job is not counted twice). */
export async function recordCall(
	data: {
		photo_id: string;
		model: string;
		outcome: AI_OUTCOME;
		input_tokens: number;
		output_tokens: number;
		cost_usd: string;
		latency_ms: number;
	},
	tx?: Tx
) {
	const db = tx ?? prisma;
	return db.ai_calls.createMany({ data: [{ ...data, provider: 'anthropic' }], skipDuplicates: true });
}

/** retention.purge: ledger rows (Anthropic and Voyage) before `before`, and results no photo has the hash of. */
export async function purge(before: Date, tx?: Tx): Promise<{ ai_calls: number; ai_results: number }> {
	const db = tx ?? prisma;
	const calls = await db.ai_calls.deleteMany({ where: { created_at: { lt: before } } });
	const results = await db.$executeRaw`
		delete from app.ai_results r where not exists (select 1 from app.photos p where p.sha256 = r.sha256)`;
	return { ai_calls: calls.count, ai_results: results };
}

export default { findPhoto, findResult, findOutcome, spendSince, callsSince, insertResult, recordCall, purge };
