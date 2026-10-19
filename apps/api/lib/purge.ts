// Batched writes for retention.purge (backend.md: chunks of ≤ 500): no statement deletes or locks more rows, and a
// stopped run leaves nothing half done, so the next run simply continues.
import { Prisma } from '../generated/client.ts';
import { prisma } from '../prisma/prisma.ts';

export const PURGE_BATCH = 500;

/** Repeats `step` (one statement touching at most `limit` rows) until a batch comes back short; returns the total. */
export async function inBatches(step: (limit: number) => Promise<number>): Promise<number> {
	let total = 0;
	for (;;) {
		const n = await step(PURGE_BATCH);
		total += n;
		if (n < PURGE_BATCH) return total;
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
