// CH-106 (ADR-021): pg-boss creates its tables in schema pgboss at runtime (on start and per queue partition), outside
// Prisma migrations, so they come without RLS. Called at startup after pg-boss has started and created its queues;
// idempotent and a no-op while the schema has no tables. test/security proves every pgboss table ends up with RLS.
import { prisma } from '../prisma/prisma.ts';

export async function lockDownPgboss(): Promise<void> {
	await prisma.$executeRaw`
		do $$
		declare t regclass;
		begin
			for t in
				select c.oid::regclass from pg_class c
				where c.relnamespace = to_regnamespace('pgboss') and c.relkind in ('r', 'p') and not c.relrowsecurity
			loop
				execute format('alter table %s enable row level security', t);
			end loop;
		end $$`;
}
