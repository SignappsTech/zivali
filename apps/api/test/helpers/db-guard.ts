// TASK-101: keep unmerged migrations off the shared local database (127.0.0.1:55322/postgres).
// Worktree agents run migration work against a scratch DB; the base checkout (merge verify) may migrate the shared one.
import { existsSync, readdirSync } from 'node:fs';

import pg from 'pg';

export type GuardInput = {
	databaseUrl: string;
	cwd: string;
	pending: string[];
	/** Applied on the database but absent from this checkout's migration folder (TASK-102). */
	unknown?: string[];
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
export function guardMessage({ databaseUrl, cwd, pending, unknown = [], allowOverride }: GuardInput): string | null {
	if (allowOverride || !isSharedDb(databaseUrl)) return null;
	if (unknown.length)
		return [
			`The shared database has ${unknown.length} migration(s) applied that are not in prisma/schemas/migrations here (an unmerged branch migrated it):`,
			...unknown.map((m) => `  - ${m}`),
			'Fix: revert them on the shared database (undo their changes, then delete their rows from app._prisma_migrations), or merge the branch that owns them.',
			'Override (humans only): ALLOW_SHARED_DB_MIGRATE=1',
		].join('\n');
	if (!isWorktree(cwd)) return null;
	return [
		pending.length
			? `Refusing to migrate the shared database from a worktree: ${pending.length} migration(s) not yet applied there:`
			: 'Refusing to run the API tests on the shared database from a worktree (the merge verify runs there).',
		...pending.map((m) => `  - ${m}`),
		'Use a scratch database: set TEST_DATABASE_URL on the same command line; global-setup creates a task_* one with the auth schema and a realtime.send stub (or run pnpm --filter api db:scratch task_<id> first):',
		'  TEST_DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:55322/task_<id>?schema=app" pnpm --filter api test',
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

/** Migration folders missing from app._prisma_migrations (pending) and applied names without a folder (unknown). A missing table means all are pending. */
export async function migrationDrift(
	databaseUrl: string,
	local = localMigrations()
): Promise<{ pending: string[]; unknown: string[] }> {
	const url = new URL(databaseUrl);
	url.searchParams.delete('schema');
	const client = new pg.Client({ connectionString: url.toString() });
	await client.connect();
	try {
		const { rows } = await client.query<{ migration_name: string }>(
			'select migration_name from app._prisma_migrations where rolled_back_at is null'
		);
		return diffMigrations(
			local,
			rows.map((r) => r.migration_name)
		);
	} catch (e) {
		const code = (e as { code?: string }).code;
		if (code === '42P01' || code === '3F000') return { pending: local, unknown: [] };
		throw e;
	} finally {
		await client.end();
	}
}

export function diffMigrations(local: string[], applied: string[]): { pending: string[]; unknown: string[] } {
	return {
		pending: local.filter((m) => !applied.includes(m)),
		unknown: applied.filter((m) => !local.includes(m)).sort(),
	};
}
