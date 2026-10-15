// Prisma client singleton over node-postgres (Prisma 7 driver adapter). DAOs use `tx ?? prisma`.
import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '../generated/client.ts';
import { config } from '../lib/config.ts';

// Small pool: Supabase Free has few connections and pg-boss needs its own (ADR-022). The connect timeout
// keeps /v1/health/ready from hanging when the database is unreachable.
const adapter = new PrismaPg(
	{ connectionString: config.DATABASE_URL, max: 5, connectionTimeoutMillis: 5_000 },
	{ schema: 'app' }
);

export const prisma = new PrismaClient({
	adapter,
	// Unmapped Prisma errors must not print query args (they will include lat/lng).
	errorFormat: 'minimal',
});

export type { Prisma } from '../generated/client.ts';
export default prisma;
