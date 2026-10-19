// Batched writes for retention.purge (backend.md: chunks of ≤ 500): no statement deletes or locks more rows, and a
// stopped run leaves nothing half done, so the next run simply continues.
import { Prisma } from '../generated/client.ts';
import { prisma } from '../prisma/prisma.ts';

export const PURGE_BATCH = 500;

/**
 * `months` calendar months before `now`, the day clamped to the end of a shorter month (31 Aug − 6 → 28 Feb, not
 * 3 Mar), so a window never ends early.
 */
export function monthsAgo(now: Date, months: number): Date {
	const at = new Date(now);
	const day = at.getUTCDate();
	at.setUTCMonth(at.getUTCMonth() - months);
	if (at.getUTCDate() !== day) at.setUTCDate(0);
	return at;
}

/**
 * Repeats `step` (one statement touching at most `limit` rows, `size`) until a batch comes back short; returns the
 * total.
 */
export async function inBatches(step: (limit: number) => Promise<number>, size = PURGE_BATCH): Promise<number> {
	let total = 0;
	for (;;) {
		const n = await step(size);
		total += n;
		if (n < size) return total;
	}
}

/**
 * Deletes the rows of `table` (a static fragment) that match `where`, a batch at a time. The delete checks `where`
 * again, so a row that changed after it was picked (a reopened report, a reopened chat) stays. Columns in `where` are
 * qualified with the bare table name where a subquery could shadow them (`reports.id`).
 */
export function purgeWhere(table: Prisma.Sql, where: Prisma.Sql, tx?: Prisma.TransactionClient): Promise<number> {
	const db = tx ?? prisma;
	return inBatches(
		(limit) => db.$executeRaw`
			delete from ${table}
			where ctid = any(array(select ctid from ${table} where ${where} limit ${limit})) and ${where}`
	);
}
