// ADR-021 lockdown of the first migration: own schemas, extensions in `extensions`, no grants, `public` untouched.
// TASK-6.2 extends this file with the RLS and PostgREST checks once app tables exist.
import { describe, expect, it } from 'vitest';

import { prisma } from '../../prisma/prisma.ts';

const one = async <T>(query: Promise<T[]>) => (await query)[0];

describe('database lockdown (ADR-021)', () => {
	it('creates schemas app and pgboss', async () => {
		const rows = await prisma.$queryRaw<{ nspname: string }[]>`
			select nspname from pg_namespace where nspname in ('app', 'pgboss') order by nspname`;
		expect(rows.map((row) => row.nspname)).toEqual(['app', 'pgboss']);
	});

	it('has postgis and vector in schema extensions', async () => {
		const rows = await prisma.$queryRaw<{ extname: string; schema: string }[]>`
			select extname, extnamespace::regnamespace::text as schema
			from pg_extension where extname in ('postgis', 'vector') order by extname`;
		expect(rows).toEqual([
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
