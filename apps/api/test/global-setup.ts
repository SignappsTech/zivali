// Once per run: bring the target database up to the committed migrations (non-destructive).
// TEST_DATABASE_URL (scratch DB) overrides DATABASE_URL/DIRECT_URL. Worktrees may not push unmerged migrations onto the shared DB (TASK-101).
import { execSync } from 'node:child_process';

import pg from 'pg';

import { guardMessage, migrationDrift } from './helpers/db-guard';

// TASK-109: finished pg-boss jobs pile up in the shared local DB and slow the job-drain tests.
// TASK-110: so do alert subscriptions/deliveries of test users (profiles without an auth.users row) left by a timed-out run.
// Local databases only.
async function purgeResidue(url: string): Promise<void> {
	if (!['127.0.0.1', 'localhost'].includes(new URL(url).hostname)) {
		process.stderr.write('[global-setup] residue purge skipped: the database host is not 127.0.0.1/localhost\n');
		return;
	}
	const client = new pg.Client({ connectionString: url.replace(/[?&]schema=[^&]*/, '') });
	await client.connect();
	try {
		const { rows } = await client.query(`select to_regclass('pgboss.job') is not null as ready`);
		if (rows[0].ready) {
			const res = await client.query(
				`delete from pgboss.job where state in ('completed', 'cancelled') or (state = 'failed' and completed_on < now() - interval '1 day')`
			);
			process.stdout.write(`[global-setup] purged ${res.rowCount} finished pg-boss jobs\n`);
		} // else a fresh database: pg-boss installs its schema on first start
		// Profiles stay: other test data references them. Needs Supabase's auth schema (a plain Postgres has none).
		if (!(await client.query(`select to_regclass('auth.users') is not null as ready`)).rows[0].ready) return;
		const orphans = `select p.id from app.profiles p where not exists (select 1 from auth.users u where u.id = p.id)`;
		const deliveries = await client.query(`delete from app.alert_deliveries where user_id in (${orphans})`);
		const subscriptions = await client.query(`delete from app.alert_subscriptions where user_id in (${orphans})`);
		process.stdout.write(
			`[global-setup] purged ${deliveries.rowCount} alert deliveries and ${subscriptions.rowCount} alert subscriptions of test users\n`
		);
	} finally {
		await client.end();
	}
}

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
			...(await migrationDrift(url)),
			allowOverride: process.env.ALLOW_SHARED_DB_MIGRATE === '1',
		});
		if (message) throw new Error(message);
	}
	execSync('prisma migrate deploy', { stdio: 'inherit' });
	if (url) await purgeResidue(url);
}
