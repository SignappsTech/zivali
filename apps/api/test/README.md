# API tests

Vitest + Supertest against the real local Postgres (ADR-015). Files run one after another (`fileParallelism: false`).

## Flake rules (TASK-108)

- No wall-clock budgets (`performance.now()` < N ms). Assert the plan (`EXPLAIN` contains the index name), the query count or the
  database's own `Execution Time`, never request latency: the machine runs many agents and CI hardware is slow.
- Generated geography points stay clear of bbox edges (geodesic edges bow ~1.6e-5 deg).
- The Prisma pool waits 30 s for a connection in tests (`prisma/prisma.ts`), 5 s in production.

## Proposal: a dedicated test database for main (not switched yet)

`jobs.test.ts` ("runs one job per queue") fails whenever another process works the same `pgboss` queues: a `pnpm dev:worker`
or QA server started against `postgres`, or a second test run. Reproduced with a worker on the same database: 5 of 13 queue
jobs were taken by it. Other suites tolerate it (`drain()` takes whatever is queued), this one counts.

Proposal: the merge verify on main runs on `postgres_test` instead of the shared `postgres` database.

1. One-time: `create database postgres_test` in the local Supabase Postgres, then bring in the Supabase schemas the suites need
   (`auth`, `realtime`, `storage`, `extensions`; `pg_dump --schema-only -n auth -n realtime -n storage -n extensions postgres | psql postgres_test`).
2. Verify script sets `TEST_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:55322/postgres_test?schema=app`
   (global-setup already honours it and runs `prisma migrate deploy` on it).
3. Limits: suites that call the Supabase Auth API (users, reports and collab seeders) and `realtime-policy` talk to the
   local GoTrue/Realtime containers, which are bound to the `postgres` database, so they stay on it. Until those are
   made database-independent, either keep them in a second, serial pass on `postgres`, or leave the proposal unadopted.
4. CI (GitHub) is unaffected: it runs against its own throw-away Postgres service, so no other process shares it.
