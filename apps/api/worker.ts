// Worker entry: second process from the same image (`node dist/worker.js`). TASK-6.3 starts pg-boss here and
// registers the queue handlers from jobs/<queue>.job.ts (ADR-022).
import { logger } from './lib/logger.ts';
import { lockDownPgboss } from './lib/pgboss-lockdown.ts';

logger.info('worker started; no queues registered yet');

// CH-106: RLS on the tables pg-boss creates at runtime; TASK-6.3 moves this after boss.start() and createQueue().
lockDownPgboss().catch((err: unknown) => logger.error({ err }, 'pgboss lockdown failed'));

// ponytail: an idle timer keeps the process up until pg-boss (TASK-6.3) holds it open.
const idle = setInterval(() => {}, 1 << 30);

function shutdown(signal: NodeJS.Signals): void {
	logger.info({ signal }, 'worker shutting down');
	clearInterval(idle);
}

process.once('SIGTERM', shutdown);
process.once('SIGINT', shutdown);
