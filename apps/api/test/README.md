# API tests

Vitest + Supertest against the real local Postgres (ADR-015). Files run one after another (`fileParallelism: false`).

## Scratch database (TASK-114.36)

Worktrees run the API tests on their own `task_<id>` database (TASK-101). One command, from the repository root:

    TEST_DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:55322/task_<id>?schema=app" pnpm --filter api test

`global-setup` sees a `task_*` `TEST_DATABASE_URL` and first runs `ensureScratchDb` (`test/helpers/scratch-db.ts`), which adds
only what is missing: the database itself, Supabase's `auth` schema (empty tables, owners and grants; `pg_dump --schema-only
--schema=auth` of the server's `postgres` database, restored in one transaction through the db container's `psql`, since the
host has no `pg_dump` 17), and a no-op `realtime.send(jsonb, text, text, boolean)` (no Realtime server is attached, so
`NotificationsDomain.deliver()` and chat broadcasts succeed and send nothing). `migrate deploy` follows as before. Without them
100-230 tests failed on `auth.users` or `realtime.send`. To prepare a database without running tests (it prints the URL):
`pnpm --filter api db:scratch task_<id>`; moved ports: `SUPABASE_DB_PORT`.

Guard: it refuses any database not named `task_<a-z0-9_>` or not on 127.0.0.1/localhost, so it never creates or changes
`postgres`; there it only reads (`pg_database`, the auth schema definition). Still bound to the shared stack: tests that call
the local Auth API, PostgREST or Realtime at `SUPABASE_URL` (users and reports seeders, `admin:create`, the JWKS and
anonymous-conversion tests, `schema-exposure`, `conversations.realtime`) reach the `postgres` database, not the scratch one.
With `SUPABASE_URL` on an unused port (nothing written there) a full run on a scratch database had 97 failures, all of them
`ECONNREFUSED` on that URL (TASK-114.36); everything else passed (see the proposal below).

## Flake rules (TASK-108)

- No wall-clock budgets (`performance.now()` < N ms). Assert the plan (`EXPLAIN` contains the index name), the query count or the
  database's own `Execution Time`, never request latency: the machine runs many agents and CI hardware is slow.
- Generated geography points stay clear of bbox edges (geodesic edges bow ~1.6e-5 deg).
- The Prisma pool waits 30 s for a connection in tests (`prisma/prisma.ts`), 5 s in production.

## Job table hygiene (TASK-109)

`global-setup` deletes finished pg-boss jobs (`completed`, `cancelled`, `failed` older than a day) once per run, only when the
database host is 127.0.0.1 or localhost (otherwise it logs a warning and skips), and logs the count. The drain tests used to
slow down as the shared database filled up: `pgboss.job` has no index on `data->>'report_id'`, and `drain()` runs every queued job,
and `match.report` scans every open report. Test queries on it therefore carry a `created_on >= <test start>` bound, and the
`reports.write` drain test first removes queued matching jobs left over from earlier runs.

Alert residue (TASK-110): a timed-out `alerts.domain.test.ts` once left 12k subscriptions and 47k deliveries of test users, and every
later fan-out test had to deliver to them. The test now picks its point per run (a random municipality, 20 km from the old fixed point,
clear of the collab fixtures), cleans up with set-based deletes (jobs, deliveries, subscriptions, reports, profiles) in an `afterAll`
with a 120 s timeout, and the 1000-subscriber test cleans up its own users in a `finally`. `global-setup` also deletes the
`alert_deliveries` and `alert_subscriptions` of profiles without an `auth.users` row (test users; profiles are kept), same host guard.

## Performance checks (TASK-42.2)

`pnpm --filter api test:perf` (`vitest.perf.config.ts`, files `test/perf/*.perf.ts`) runs on demand, never in `pnpm test` or
`pnpm verify`, and only against a local database (a worktree passes its scratch `TEST_DATABASE_URL`). `embeddings.perf.ts` seeds
10k reports with 50k mock vectors (about 3–4 min, mostly HNSW inserts), checks `nearest` p95 < 300 ms over 5–250 km and
`similarity` for 1000 reports × 5 photos < 1 s, prints both plans and deletes its seed (fixed owner id, so a killed run is
cleaned up by the next one). Wall-clock budgets are fine there; the flake rules above apply to the regular suite.

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
