// Prisma access only. Every DAO function takes an optional transaction client (ADR-020).
import { prisma, type Prisma } from '../../prisma/prisma.ts';

export async function pingDatabase(tx?: Prisma.TransactionClient): Promise<void> {
	const db = tx ?? prisma;
	await db.$queryRaw`select 1`;
}

export default { pingDatabase };
