// CH-106: pg-boss creates tables (and per-queue partitions) at runtime without RLS; the startup hook turns it on.
// schema-exposure.test.ts then checks that every table in pgboss has RLS and no policies.
import { describe, expect, it } from 'vitest';

import { lockDownPgboss } from '../../lib/pgboss-lockdown.ts';
import { prisma } from '../../prisma/prisma.ts';

describe('pg-boss lockdown hook (CH-106)', () => {
	it('enables RLS on tables and partitions created in pgboss after the migrations ran', async () => {
		// Same shape as pg-boss: a partitioned job table with one partition per queue.
		await prisma.$executeRaw`create table pgboss.rls_probe (name text not null) partition by list (name)`;
		try {
			await prisma.$executeRaw`create table pgboss.rls_probe_q1 partition of pgboss.rls_probe for values in ('q1')`;
			await lockDownPgboss();
			await lockDownPgboss(); // idempotent
			const rows = await prisma.$queryRaw<{ name: string; rls: boolean }[]>`
				select relname as name, relrowsecurity as rls from pg_class
				where relnamespace = 'pgboss'::regnamespace and relname like 'rls_probe%' order by relname`;
			expect(rows).toEqual([
				{ name: 'rls_probe', rls: true },
				{ name: 'rls_probe_q1', rls: true },
			]);
		} finally {
			await prisma.$executeRaw`drop table pgboss.rls_probe`;
		}
	});
});
