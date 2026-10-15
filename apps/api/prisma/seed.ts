// `prisma db seed` (also after `pnpm db:reset`): runs prisma/seeders/<NN>-<name>.seeder.ts in file-name order.
// Each seeder default-exports an idempotent async function; each task owns its own seeder file (C1).
import { existsSync, readdirSync } from 'node:fs';

import { logger } from '../lib/logger.ts';
import { prisma } from './prisma.ts';

const dir = new URL('./seeders/', import.meta.url);
const files = existsSync(dir)
	? readdirSync(dir)
			.filter((file) => file.endsWith('.seeder.ts'))
			.sort()
	: [];

for (const file of files) {
	const seeder: { default: () => Promise<void> } = await import(new URL(file, dir).href);
	await seeder.default();
	logger.info({ seeder: file }, 'seeded');
}

logger.info({ seeders: files.length }, 'seed done');
await prisma.$disconnect();
