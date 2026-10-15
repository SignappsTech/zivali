// Per test file: stop pg-boss (when a test started it) and close the Prisma pool so workers exit cleanly.
// Must stay the first import: it installs the zod-to-openapi extension before any schema module loads.
import '@zivali/validation/openapi';
import { afterAll, vi } from 'vitest';

import { stopJobs } from '../lib/jobs.ts';
import { prisma } from '../prisma/prisma.ts';

// vi.waitFor defaults to 1 s, which flakes on a loaded machine (testTimeout alone does not cover it).
// vitest has no global option for it, so wrap the default.
const waitFor = vi.waitFor.bind(vi);
vi.waitFor = ((fn, options) =>
	waitFor(fn, typeof options === 'number' ? options : { timeout: 10_000, ...options })) as typeof vi.waitFor;

afterAll(async () => {
	await stopJobs();
	await prisma.$disconnect();
});
