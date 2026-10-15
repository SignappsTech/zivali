// Once per run: bring the target database up to the committed migrations (non-destructive).
// TEST_DATABASE_URL (scratch DB) overrides DATABASE_URL/DIRECT_URL. Worktrees may not push unmerged migrations onto the shared DB (TASK-101).
import { execSync } from 'node:child_process';

import { guardMessage, pendingMigrations } from './helpers/db-guard';

export default async function setup(): Promise<void> {
	if (process.env.TEST_DATABASE_URL) {
		process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
		process.env.DIRECT_URL = process.env.TEST_DATABASE_URL;
	}
	const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
	if (url) {
		const message = guardMessage({
			databaseUrl: url,
			cwd: process.cwd(),
			pending: await pendingMigrations(url),
			allowOverride: process.env.ALLOW_SHARED_DB_MIGRATE === '1',
		});
		if (message) throw new Error(message);
	}
	execSync('prisma migrate deploy', { stdio: 'inherit' });
}
