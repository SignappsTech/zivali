// Prisma access for app_config (C1). Read through lib/config-store.ts (cached 60 s), not directly.
import { prisma, type Prisma } from '../../prisma/prisma.ts';

export async function listConfig(tx?: Prisma.TransactionClient) {
	const db = tx ?? prisma;
	return db.app_config.findMany({ select: { key: true, value: true, is_public: true } });
}

export default { listConfig };
