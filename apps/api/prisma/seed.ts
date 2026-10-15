// `prisma db seed` (also after `pnpm db:reset`), and every deploy after `migrate deploy` (deploy/remote.sh runs the
// bundle, dist/seed/, tsup.config.ts): runs prisma/seeders/<NN>-<name>.seeder.ts (.js when bundled) in file-name order.
// Each seeder default-exports an idempotent async function; each task owns its own seeder file (C1).
import { readdirSync } from 'node:fs';

import { logger } from '../lib/logger.ts';
import { prisma } from './prisma.ts';

const dir = new URL('./seeders/', import.meta.url);
const files = readdirSync(dir)
	.filter((file) => /\.seeder\.[jt]s$/.test(file))
	.sort();
// A deploy must not pass with nothing seeded (a bundle without its seeders).
if (!files.length) throw new Error(`no seeders in ${dir.pathname}`);

for (const file of files) {
	const seeder: { default: () => Promise<void> } = await import(new URL(file, dir).href);
	await seeder.default();
	logger.info({ seeder: file }, 'seeded');
}

logger.info({ seeders: files.length }, 'seed done');
await prisma.$disconnect();
