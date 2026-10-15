// Per test file: close the Prisma pool so workers exit cleanly.
// Must stay the first import: it installs the zod-to-openapi extension before any schema module loads.
import '@zivali/validation/openapi';
import { afterAll } from 'vitest';

import { prisma } from '../prisma/prisma.ts';

afterAll(async () => {
	await prisma.$disconnect();
});
