import { describe, expect, it } from 'vitest';

import { diffMigrations, guardMessage, isSharedDb, isWorktree } from './db-guard';

const shared = 'postgresql://postgres:x@127.0.0.1:55322/postgres?schema=app';
const scratch = 'postgresql://postgres:x@127.0.0.1:55322/task_101?schema=app';
const wt = 'C:\\repo\\.claude\\worktrees\\agent-1\\apps\\api';
const base = 'C:\\repo\\apps\\api';

describe('db guard (TASK-101)', () => {
	it('detects shared db and worktree', () => {
		expect(isSharedDb(shared)).toBe(true);
		expect(isSharedDb(scratch)).toBe(false);
		expect(isSharedDb('postgresql://u:x@db.example.com:5432/postgres?schema=app')).toBe(false);
		expect(isWorktree(wt)).toBe(true);
		expect(isWorktree(base)).toBe(false);
	});

	it('refuses pending migrations on the shared db from a worktree, naming them', () => {
		const msg = guardMessage({ databaseUrl: shared, cwd: wt, pending: ['2026_a'] });
		expect(msg).toContain('2026_a');
		expect(msg).toContain('TEST_DATABASE_URL');
	});

	it('refuses any test run on the shared db from a worktree, even with nothing pending', () => {
		const msg = guardMessage({ databaseUrl: shared, cwd: wt, pending: [] });
		expect(msg).toContain('Refusing to run the API tests on the shared database');
		expect(msg).toContain('TEST_DATABASE_URL');
	});

	it('allows every other combination', () => {
		expect(guardMessage({ databaseUrl: shared, cwd: base, pending: [] })).toBeNull();
		expect(guardMessage({ databaseUrl: shared, cwd: base, pending: ['x'] })).toBeNull();
		expect(guardMessage({ databaseUrl: scratch, cwd: wt, pending: ['x'] })).toBeNull();
		expect(guardMessage({ databaseUrl: shared, cwd: wt, pending: ['x'], allowOverride: true })).toBeNull();
	});

	it('flags migrations applied on the shared db but missing locally (TASK-102), in base and worktree', () => {
		for (const cwd of [base, wt]) {
			const msg = guardMessage({ databaseUrl: shared, cwd, pending: [], unknown: ['2026_x'] });
			expect(msg).toContain('2026_x');
			expect(msg).toContain('_prisma_migrations');
		}
		expect(guardMessage({ databaseUrl: scratch, cwd: base, pending: [], unknown: ['2026_x'] })).toBeNull();
		expect(guardMessage({ databaseUrl: shared, cwd: base, pending: [], unknown: [] })).toBeNull();
		expect(
			guardMessage({ databaseUrl: shared, cwd: base, pending: [], unknown: ['2026_x'], allowOverride: true })
		).toBeNull();
	});

	it('diffs local and applied names', () => {
		expect(diffMigrations(['a', 'b'], ['b', 'z', 'y'])).toEqual({ pending: ['a'], unknown: ['y', 'z'] });
	});
});
