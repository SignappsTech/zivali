// ADR-021 lockdown: own schemas, extensions in `extensions`, no grants, deny-all RLS, `public` untouched, and
// PostgREST (what the public anon key reaches) exposes no app table.
import { describe, expect, it } from 'vitest';

import { Prisma } from '../../generated/client.ts';
import { config } from '../../lib/config.ts';
import { prisma } from '../../prisma/prisma.ts';
import { signTestToken } from '../helpers/token.ts';

const one = async <T>(query: Promise<T[]>) => (await query)[0];
const models = Object.values(Prisma.ModelName);

describe('database lockdown (ADR-021)', () => {
	it('creates schemas app and pgboss', async () => {
		const rows = await prisma.$queryRaw<{ nspname: string }[]>`
			select nspname from pg_namespace where nspname in ('app', 'pgboss') order by nspname`;
		expect(rows.map((row) => row.nspname)).toEqual(['app', 'pgboss']);
	});

	it('has postgis, vector and pgcrypto in schema extensions', async () => {
		const rows = await prisma.$queryRaw<{ extname: string; schema: string }[]>`
			select extname, extnamespace::regnamespace::text as schema
			from pg_extension where extname in ('pgcrypto', 'postgis', 'vector') order by extname`;
		expect(rows).toEqual([
			{ extname: 'pgcrypto', schema: 'extensions' },
			{ extname: 'postgis', schema: 'extensions' },
			{ extname: 'vector', schema: 'extensions' },
		]);
	});

	it('gives anon and authenticated no usage on app or pgboss', async () => {
		const rows = await prisma.$queryRaw<{ role: string; schema: string; usage: boolean }[]>`
			select r as role, s as schema, has_schema_privilege(r, s, 'USAGE') as usage
			from unnest(array['anon', 'authenticated']) r, unnest(array['app', 'pgboss']) s`;
		expect(rows).toHaveLength(4);
		expect(rows.filter((row) => row.usage)).toEqual([]);
	});

	it('enables RLS on every table in app and pgboss, every model included', async () => {
		const tables = await prisma.$queryRaw<{ name: string; rls: boolean }[]>`
			select relnamespace::regnamespace::text || '.' || relname as name, relrowsecurity as rls
			from pg_class where relnamespace in ('app'::regnamespace, 'pgboss'::regnamespace) and relkind in ('r', 'p')`;
		expect(tables.map((table) => table.name)).toEqual(
			expect.arrayContaining(models.map((model) => `app.${model}`))
		);
		expect(tables.filter((table) => !table.rls)).toEqual([]);
	});

	it('has no policies in app or pgboss', async () => {
		const policies = await prisma.$queryRaw<{ name: string }[]>`
			select schemaname || '.' || tablename || ': ' || policyname as name
			from pg_policies where schemaname in ('app', 'pgboss')`;
		expect(policies).toEqual([]);
	});

	it('gives anon and authenticated no table privileges in app or pgboss', async () => {
		const grants = await prisma.$queryRaw<{ role: string; name: string }[]>`
			select r as role, c.oid::regclass::text as name
			from unnest(array['anon', 'authenticated']) r, pg_class c
			where c.relnamespace in ('app'::regnamespace, 'pgboss'::regnamespace) and c.relkind in ('r', 'p', 'v', 'm', 'f')
				and has_table_privilege(r, c.oid, 'SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER')`;
		expect(grants).toEqual([]);
	});

	it('keeps Prisma out of public: the migrations table lives in app, public has no tables', async () => {
		const migrations = await one(
			prisma.$queryRaw<{ schema: string }[]>`
				select schemaname as schema from pg_tables where tablename = '_prisma_migrations'`
		);
		expect(migrations).toEqual({ schema: 'app' });
		const publicTables = await one(
			prisma.$queryRaw<
				{ count: number }[]
			>`select count(*)::int as count from pg_tables where schemaname = 'public'`
		);
		expect(publicTables).toEqual({ count: 0 });
	});

	it("leaves Supabase's public schema as Supabase made it (never dropped and recreated)", async () => {
		const pub = await one(
			prisma.$queryRaw<{ owner: string; anon_usage: boolean }[]>`
				select nspowner::regrole::text as owner, has_schema_privilege('anon', 'public', 'USAGE') as anon_usage
				from pg_namespace where nspname = 'public'`
		);
		expect(pub).toEqual({ owner: 'pg_database_owner', anon_usage: true });
	});
});

describe.each(['anon', 'authenticated'] as const)('PostgREST as %s exposes no app table (ADR-021)', (role) => {
	const rest = async (path: string, headers: Record<string, string> = {}, body?: string) => {
		if (!config.SUPABASE_URL) throw new Error('SUPABASE_URL is not set (apps/api/.env.local)');
		// Signed like the local anon key; `authenticated` is what a signed-in user's token reaches.
		const token = await signTestToken({ role });
		return fetch(`${config.SUPABASE_URL}/rest/v1${path}`, {
			method: body ? 'POST' : 'GET',
			headers: {
				apikey: token,
				Authorization: `Bearer ${token}`,
				'Content-Type': 'application/json',
				...headers,
			},
			body,
		});
	};

	it('exposes nothing in the OpenAPI root', async () => {
		const res = await rest('/');
		expect(res.status).toBe(200);
		const { paths } = (await res.json()) as { paths: Record<string, unknown> };
		expect(Object.keys(paths)).toEqual(['/']);
	});

	it.each(models)('refuses GET and POST on %s, also with the app profile', async (model) => {
		const profiles: Record<string, string>[] = [{}, { 'Accept-Profile': 'app', 'Content-Profile': 'app' }];
		for (const profile of profiles) {
			expect([404, 406]).toContain((await rest(`/${model}?select=*`, profile)).status);
			expect([404, 406]).toContain((await rest(`/${model}`, profile, '{}')).status);
		}
	});
});
