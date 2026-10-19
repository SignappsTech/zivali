// TASK-114.36 (CH-182): a scratch database for the API tests on the local Supabase server, with what the suites need
// besides the migrations: Supabase's auth schema (copied, schema only, from the server's postgres database inside the
// db container) and a no-op realtime.send (no Realtime server is attached to a scratch database). Only ever creates
// or changes a database named task_<id> on 127.0.0.1/localhost; the postgres database is only read.
// CLI: pnpm --filter api db:scratch task_<id>   (global-setup does the same for a task_* TEST_DATABASE_URL)
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

import pg from 'pg';

const NAME = /^task_[a-z0-9_]+$/;

// Same signature as Supabase Realtime's; broadcasts are accepted and dropped.
const REALTIME_STUB = `
	create schema if not exists realtime;
	create function realtime.send(payload jsonb, event text, topic text, private boolean default true) returns void
		language plpgsql as $$ begin null; end $$;`;

export const isScratchUrl = (databaseUrl: string): boolean => new URL(databaseUrl).pathname.startsWith('/task_');

/** The scratch database's name; throws for anything but task_<id> on 127.0.0.1/localhost. */
export function scratchName(databaseUrl: string): string {
	const url = new URL(databaseUrl);
	const name = decodeURIComponent(url.pathname.slice(1));
	if (!['127.0.0.1', 'localhost'].includes(url.hostname) || !NAME.test(name))
		throw new Error(
			`Refusing database "${name}" on ${url.hostname}: scratch databases are task_<id> (a-z, 0-9, _) on 127.0.0.1 or localhost`
		);
	return name;
}

async function withClient<T>(url: URL, fn: (client: pg.Client) => Promise<T>): Promise<T> {
	const client = new pg.Client({ connectionString: url.toString() });
	await client.connect();
	try {
		return await fn(client);
	} finally {
		await client.end();
	}
}

/** pg_dump and psql of the db container (the host has neither): the container that publishes the database port. */
function copyAuthSchema(port: string, name: string): void {
	const container = execFileSync('docker', ['ps', '-q', '--filter', `publish=${port}`], { encoding: 'utf8' })
		.trim()
		.split('\n')[0];
	if (!container)
		throw new Error(`No running container publishes port ${port}: start the local stack (pnpm db:start)`);
	const dump = execFileSync(
		'docker',
		['exec', container, 'pg_dump', '-U', 'postgres', '--schema-only', '--schema=auth', 'postgres'],
		{ maxBuffer: 64 * 1024 * 1024 }
	);
	// supabase_admin (superuser): the dump keeps Supabase's owners and grants, which postgres may not set. One
	// transaction, so a failed copy leaves no half schema behind.
	execFileSync(
		'docker',
		['exec', '-i', container, 'psql', '-q', '-1', '-v', 'ON_ERROR_STOP=1', '-U', 'supabase_admin', '-d', name],
		{ input: dump, stdio: ['pipe', 'ignore', 'inherit'] }
	);
}

/** Creates the scratch database if missing and adds what is missing of auth and realtime.send; returns what it did. */
export async function ensureScratchDb(databaseUrl: string): Promise<string[]> {
	const name = scratchName(databaseUrl);
	const url = new URL(databaseUrl);
	url.searchParams.delete('schema');
	const done: string[] = [];
	// create database must run from another database; the server's maintenance database is read, never written.
	const server = new URL(url);
	server.pathname = '/postgres';
	await withClient(server, async (client) => {
		if ((await client.query('select 1 from pg_database where datname = $1', [name])).rowCount) return;
		await client.query(`create database "${name}"`); // name matched NAME above
		done.push('created');
	});
	await withClient(url, async (client) => {
		const { rows } = await client.query<{ auth: boolean; send: boolean }>(
			`select to_regclass('auth.users') is not null as auth,
				to_regprocedure('realtime.send(jsonb,text,text,boolean)') is not null as send`
		);
		if (!rows[0]!.auth) {
			copyAuthSchema(url.port || '5432', name);
			done.push('auth schema');
		}
		if (!rows[0]!.send) {
			await client.query(REALTIME_STUB);
			done.push('realtime.send stub');
		}
	});
	return done;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	const name = process.argv[2] ?? '';
	const port = process.env.SUPABASE_DB_PORT || '55322';
	const url = `postgresql://postgres:postgres@127.0.0.1:${port}/${name}?schema=app`;
	try {
		const done = await ensureScratchDb(url);
		process.stdout.write(`${name}: ${done.join(', ') || 'ready, nothing to add'}\nTEST_DATABASE_URL=${url}\n`);
	} catch (err) {
		process.stderr.write(`${(err as Error).message}\nUsage: pnpm --filter api db:scratch task_<id>\n`);
		process.exitCode = 1;
	}
}
