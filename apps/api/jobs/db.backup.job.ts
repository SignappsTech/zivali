// db.backup (nightly 02:00, ADR-016): pg_dump of schema app (custom format, compressed) to the R2 backups bucket as
// db/<APP_ENV>/<date>.dump; one object per day, so a retry overwrites it. The bucket's 30-day lifecycle rule expires
// old dumps (data-inventory.json). Restore steps: deploy/README.md. The api image ships pg_dump 17; local
// development has neither pg_dump 17 nor anything worth keeping, so the job is a no-op there.
import { spawn } from 'node:child_process';

import { config } from '../lib/config.ts';
import type { JobCtx } from './index.ts';

export type PgEnv = Record<'PGHOST' | 'PGPORT' | 'PGUSER' | 'PGPASSWORD' | 'PGDATABASE' | 'PGSSLMODE', string>;
export type Dump = (env: PgEnv) => Promise<Buffer>;

/** libpq settings from DATABASE_URL: the password never goes on a command line, Prisma's `?schema=` is dropped. */
export function pgEnv(databaseUrl: string): PgEnv {
	const url = new URL(databaseUrl);
	return {
		PGHOST: url.hostname,
		PGPORT: url.port || '5432',
		PGUSER: decodeURIComponent(url.username),
		PGPASSWORD: decodeURIComponent(url.password),
		PGDATABASE: decodeURIComponent(url.pathname.slice(1)) || 'postgres',
		PGSSLMODE: url.searchParams.get('sslmode') ?? 'prefer',
	};
}

/** Runs pg_dump and resolves with the dump; rejects with pg_dump's own message (it never contains the password). */
export const pgDump: Dump = (env) =>
	new Promise((resolve, reject) => {
		const child = spawn('pg_dump', ['--format=custom', '--no-owner', '--no-privileges', '--schema=app'], {
			env: { PATH: process.env.PATH, ...env },
		});
		const chunks: Buffer[] = [];
		let stderr = '';
		child.stdout.on('data', (chunk: Buffer) => chunks.push(chunk));
		child.stderr.on('data', (chunk: Buffer) => (stderr += chunk.toString()));
		child.on('error', reject);
		child.on('close', (code) =>
			code === 0
				? resolve(Buffer.concat(chunks))
				: reject(new Error(`pg_dump exited with ${code}: ${stderr.trim()}`))
		);
	});

export async function backup(ctx: JobCtx, dump: Dump = pgDump): Promise<string> {
	const key = `db/${config.APP_ENV}/${ctx.now.toISOString().slice(0, 10)}.dump`;
	const body = await dump(pgEnv(config.DATABASE_URL));
	await ctx.adapters.storage.put({ bucket: 'backups', key }, body, 'application/octet-stream');
	ctx.logger.info({ key, bytes: body.length }, 'db backup written');
	return key;
}

export async function handle(_data: unknown, ctx: JobCtx): Promise<void> {
	if (config.APP_ENV === 'local') {
		ctx.logger.info('db backup skipped (local)');
		return;
	}
	await backup(ctx);
}
