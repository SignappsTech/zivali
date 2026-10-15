// `pnpm jobs:drain`: runs every queued job through the registry until all queues are empty (ADR-022).
// Must stay the first import: it installs the zod-to-openapi extension before any schema module loads.
import '@zivali/validation/openapi';
import { runJob } from '../jobs/index.ts';
import { drain, stopJobs } from '../lib/jobs.ts';
import { logger } from '../lib/logger.ts';
import { prisma } from '../prisma/prisma.ts';

const attempts = await drain(runJob);
logger.info({ attempts }, 'jobs drained');
await stopJobs();
await prisma.$disconnect();
