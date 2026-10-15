// TASK-101: keep unmerged migrations off the shared local database (127.0.0.1:55322/postgres).
// Worktree agents run migration work against a scratch DB; the base checkout (merge verify) may migrate the shared one.
import { existsSync, readdirSync } from 'node:fs';

import pg from 'pg';

export type GuardInput = {
	databaseUrl: string;
	cwd: string;
	pending: string[];
	allowOverride?: boolean;
};

export function isSharedDb(databaseUrl: string): boolean {
	const u = new URL(databaseUrl);
	return ['127.0.0.1', 'localhost'].includes(u.hostname) && u.pathname.replace(/^\//, '') === 'postgres';
}

export function isWorktree(cwd: string): boolean {
	return cwd.replaceAll('\\', '/').includes('/.claude/worktrees/');
}

/**
 * Returns an error message when a test run must be refused, else null. A worktree never runs the API tests on the
 * shared database: the base checkout's merge verify runs there, and two concurrent runs take each other's pg-boss
 * jobs and connections (main went red that way on 2026-10-15). With unmerged migrations the message names them.
 */
export function guardMessage({ databaseUrl, cwd, pending, allowOverride }: GuardInput): string | null {
	if (allowOverride || !isSharedDb(databaseUrl) || !isWorktree(cwd)) return null;
	return [
		pending.length
			? `Refusing to migrate the shared database from a worktree: ${pending.length} migration(s) not yet applied there:`
			: 'Refusing to run the API tests on the shared database from a worktree (the merge verify runs there).',
		...pending.map((m) => `  - ${m}`),
		'Use a scratch database (TEST_DATABASE_URL, or point DATABASE_URL/DIRECT_URL at task_<id>), set on the same command line:',
		'  psql postgresql://postgres:postgres@127.0.0.1:55322/postgres -c "create database task_<id>" && export TEST_DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:55322/task_<id>?schema=app"',
		'Override (humans only): ALLOW_SHARED_DB_MIGRATE=1',
	].join('\n');
}

export function localMigrations(dir = 'prisma/schemas/migrations'): string[] {
	if (!existsSync(dir)) return [];
	return readdirSync(dir, { withFileTypes: true })
		.filter((d) => d.isDirectory())
		.map((d) => d.name)
		.sort();
}

/** Migration folders missing from app._prisma_migrations. A missing table means all are pending. */
export async function pendingMigrations(databaseUrl: string, local = localMigrations()): Promise<string[]> {
	const url = new URL(databaseUrl);
	url.searchParams.delete('schema');
	const client = new pg.Client({ connectionString: url.toString() });
	await client.connect();
	try {
		const { rows } = await client.query<{ migration_name: string }>(
			'select migration_name from app._prisma_migrations'
		);
		const applied = new Set(rows.map((r) => r.migration_name));
		return local.filter((m) => !applied.has(m));
	} catch (e) {
		const code = (e as { code?: string }).code;
		if (code === '42P01' || code === '3F000') return local;
		throw e;
	} finally {
		await client.end();
	}
}
