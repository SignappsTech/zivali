// Prisma access only. Every DAO function takes an optional transaction client (ADR-020).
import { prisma, type Prisma } from '../../prisma/prisma.ts';

export async function pingDatabase(tx?: Prisma.TransactionClient): Promise<void> {
	const db = tx ?? prisma;
	await db.$queryRaw`select 1`;
}

/** Seconds the oldest job that is due has waited (0 when none); rejects while pg-boss is not installed. */
export async function queueLagSeconds(tx?: Prisma.TransactionClient): Promise<number> {
	const db = tx ?? prisma;
	const [row] = await db.$queryRaw<{ lag: number }[]>`
		select coalesce(floor(extract(epoch from now() - min(start_after))), 0)::int as lag
		from pgboss.job where state < 'active' and start_after <= now()`;
	return row.lag;
}

export default { pingDatabase, queueLagSeconds };
