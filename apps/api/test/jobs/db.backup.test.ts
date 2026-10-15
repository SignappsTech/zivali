// db.backup (TASK-5.1): libpq settings from DATABASE_URL, the dump lands in the backups bucket under a daily key,
// pg_dump failures reject (pg-boss retries), and local runs are a no-op.
import { describe, expect, it } from 'vitest';

import { adapters } from '../../adapters/index.ts';
import { memoryStorage } from '../../adapters/storage/memory.ts';
import { backup, handle, pgDump, pgEnv, type PgEnv } from '../../jobs/db.backup.job.ts';
import type { JobCtx } from '../../jobs/index.ts';
import { systemCtx } from '../../lib/ctx.ts';
import { jobs } from '../../lib/jobs.ts';
import { prisma } from '../../prisma/prisma.ts';

const jobCtx = (storage = memoryStorage()): JobCtx => ({
	...systemCtx({ adapters: { ...adapters, storage }, now: new Date('2026-10-15T00:30:00Z') }),
	prisma,
	send: jobs.send,
});

describe('pgEnv', () => {
	it('splits the URL into libpq variables and drops the Prisma schema parameter', () => {
		// Built piecewise: a literal URL with a password trips secretlint.
		const url = new URL('postgresql://pooler.example.com:5432/postgres?schema=app&sslmode=require');
		url.username = 'postgres.abc';
		url.password = 'p@ss/w';
		const env = pgEnv(url.toString());
		expect(env).toEqual({
			PGHOST: 'pooler.example.com',
			PGPORT: '5432',
			PGUSER: 'postgres.abc',
			PGPASSWORD: 'p@ss/w',
			PGDATABASE: 'postgres',
			PGSSLMODE: 'require',
		});
		expect(Object.values(env).join(' ')).not.toContain('schema');
	});

	it('defaults the port, database and sslmode', () => {
		expect(pgEnv('postgresql://u:p@db.example.com?schema=app')).toMatchObject({
			PGPORT: '5432',
			PGDATABASE: 'postgres',
			PGSSLMODE: 'prefer',
		});
	});
});

describe('backup', () => {
	it('writes the dump to the backups bucket as db/<APP_ENV>/<date>.dump', async () => {
		const storage = memoryStorage();
		let received: PgEnv | undefined;
		const key = await backup(jobCtx(storage), async (env) => {
			received = env;
			return Buffer.from('PGDMP-fake');
		});
		expect(key).toBe('db/local/2026-10-15.dump');
		expect(await storage.get({ bucket: 'backups', key })).toEqual(Buffer.from('PGDMP-fake'));
		expect(await storage.head({ bucket: 'backups', key })).toMatchObject({
			contentType: 'application/octet-stream',
		});
		expect(received).toMatchObject({ PGHOST: expect.any(String), PGDATABASE: expect.any(String) });
	});

	it('rejects (so pg-boss retries) when pg_dump is missing or fails, without writing', async () => {
		const storage = memoryStorage();
		const failing = (env: PgEnv) => pgDump({ ...env, PGHOST: '127.0.0.1', PGPORT: '1' });
		await expect(backup(jobCtx(storage), failing)).rejects.toThrow();
		expect(await storage.head({ bucket: 'backups', key: 'db/local/2026-10-15.dump' })).toBeNull();
	});
});

describe('handle', () => {
	it('is a no-op in local', async () => {
		const storage = memoryStorage();
		await handle({}, jobCtx(storage));
		expect(await storage.head({ bucket: 'backups', key: 'db/local/2026-10-15.dump' })).toBeNull();
	});
});
