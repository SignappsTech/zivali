// HTTP entry. SIGTERM/SIGINT: stop accepting, let in-flight requests finish, disconnect Prisma, exit.
// Must stay the first import: it installs the zod-to-openapi extension before any schema module loads.
import '@zivali/validation/openapi';
import { app } from './app.ts';
import { config } from './lib/config.ts';
import { logger } from './lib/logger.ts';
import { lockDownPgboss } from './lib/pgboss-lockdown.ts';
import { prisma } from './prisma/prisma.ts';

const SHUTDOWN_TIMEOUT_MS = 10_000;

const server = app.listen(config.PORT, () => {
	logger.info({ port: config.PORT, app_env: config.APP_ENV }, 'api listening');
});

// CH-106: RLS on the tables pg-boss creates at runtime. TASK-6.3 runs this after boss.start() and createQueue().
lockDownPgboss().catch((err: unknown) => {
	// Without RLS on pgboss the database is exposed; refuse to run (CH-106).
	logger.fatal({ err }, 'pgboss lockdown failed');
	process.exit(1);
});

function shutdown(signal: NodeJS.Signals): void {
	logger.info({ signal }, 'api shutting down');
	setTimeout(() => {
		logger.error('api shutdown timed out');
		process.exit(1);
	}, SHUTDOWN_TIMEOUT_MS).unref();
	server.close(async (err) => {
		await prisma.$disconnect();
		process.exit(err ? 1 : 0);
	});
}

process.once('SIGTERM', shutdown);
process.once('SIGINT', shutdown);
