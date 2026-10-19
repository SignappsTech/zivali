// Prisma access for the platform tables behind the rateLimit and idempotency middleware (C1).
import { Prisma } from '../../generated/client.ts';
import { purgeWhere } from '../../lib/purge.ts';
import { prisma } from '../../prisma/prisma.ts';

type Tx = Prisma.TransactionClient;

export const RATE_LIMIT_RETENTION_MS = 48 * 3600_000;
export const IDEMPOTENCY_TTL_MS = 24 * 3600_000;

/** One hit in a fixed window; returns the window's count including this hit (atomic upsert). */
export async function hitRateLimit(id: { name: string; key: string; window_start: Date }, tx?: Tx): Promise<number> {
	const db = tx ?? prisma;
	const row = await db.rate_limits.upsert({
		where: { name_key_window_start: id },
		create: { ...id, count: 1 },
		update: { count: { increment: 1 } },
		select: { count: true },
	});
	return row.count;
}

/** Claims the key for a first request (status null = in flight); false when the key already exists. */
export async function insertIdempotencyKey(data: { key: string; user_id: string; route: string }, tx?: Tx) {
	const db = tx ?? prisma;
	const { count } = await db.idempotency_keys.createMany({ data: [data], skipDuplicates: true });
	return count === 1;
}

export async function getIdempotencyKey(key: string, tx?: Tx) {
	const db = tx ?? prisma;
	return db.idempotency_keys.findUnique({ where: { key } });
}

export async function completeIdempotencyKey(key: string, status: number, body: string | null, tx?: Tx) {
	const db = tx ?? prisma;
	await db.idempotency_keys.update({ where: { key }, data: { status, body: body ?? Prisma.DbNull } });
}

/** Frees a key (failed request, or a stale row: created_at pins the exact row so a fresh claim survives). */
export async function deleteIdempotencyKey(key: string, created_at?: Date, tx?: Tx) {
	const db = tx ?? prisma;
	await db.idempotency_keys.deleteMany({ where: { key, ...(created_at && { created_at }) } });
}

/** For the retention job: rate-limit windows after 48 h, idempotency keys after 24 h (C1), in batches. */
export async function purgeExpired(now: Date, tx?: Tx) {
	const rateLimitsBefore = new Date(now.getTime() - RATE_LIMIT_RETENTION_MS);
	const keysBefore = new Date(now.getTime() - IDEMPOTENCY_TTL_MS);
	return {
		rate_limits: await purgeWhere(Prisma.sql`app.rate_limits`, Prisma.sql`window_start < ${rateLimitsBefore}`, tx),
		idempotency_keys: await purgeWhere(
			Prisma.sql`app.idempotency_keys`,
			Prisma.sql`created_at < ${keysBefore}`,
			tx
		),
	};
}

export default {
	hitRateLimit,
	insertIdempotencyKey,
	getIdempotencyKey,
	completeIdempotencyKey,
	deleteIdempotencyKey,
	purgeExpired,
};
