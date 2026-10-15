// Per test file: close the Prisma pool so workers exit cleanly.
import { afterAll } from 'vitest';

import { prisma } from '../prisma/prisma.ts';

afterAll(async () => {
	await prisma.$disconnect();
});
