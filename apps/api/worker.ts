// Worker entry: second process from the same image (`node dist/worker.js`, ADR-022). Starts pg-boss (schema pgboss,
// queues, RLS on its tables, schedules) and runs the handlers registered in jobs/index.ts until SIGTERM/SIGINT.
// Must stay the first import: it installs the zod-to-openapi extension before any schema module loads.
import '@zivali/validation/openapi';
import { runJob } from './jobs/index.ts';
import { stopJobs, work } from './lib/jobs.ts';
import { logger } from './lib/logger.ts';
import { prisma } from './prisma/prisma.ts';

try {
	await work(runJob);
	logger.info('worker started');
} catch (err) {
	// Includes the pgboss lockdown: without RLS on pgboss the database is exposed, so refuse to run (CH-106).
	logger.fatal({ err }, 'worker failed to start');
	process.exit(1);
}

async function shutdown(signal: NodeJS.Signals): Promise<void> {
	logger.info({ signal }, 'worker shutting down');
	// Graceful: active jobs finish (or are retried later, delivery is at least once).
	await stopJobs();
	await prisma.$disconnect();
	process.exit(0);
}

process.once('SIGTERM', shutdown);
process.once('SIGINT', shutdown);
