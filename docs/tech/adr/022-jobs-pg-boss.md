# ADR-022: Background jobs with pg-boss in the same Postgres; one worker process

- Status: Accepted · Date: 2026-10-15 · Owner: Tech Lead · Supersedes ADR-004
- Source: brief v1.0 (pg-boss), FR-008, FR-010, FR-003, FR-012, NFR-LAT, NFR-AVAIL

## Decision

- **pg-boss 12** in schema `pgboss` of the Supabase database (not exposed, ADR-021). No Redis, no extra service.
- **Producer**: the API calls `jobs.send(name, data, { singletonKey, retryLimit: 5, retryBackoff: true })` from services, inside the same Prisma transaction when the job must only exist if the write commits (pg-boss `db` option bound to the transaction client), otherwise right after commit.
- **Consumer**: `apps/api/src/worker.ts`, a second process from the same image (`node dist/worker.js`), registers one handler per queue in `src/jobs/<queue>.job.ts`. Handlers are idempotent (unique keys, upserts) because delivery is at least once; failed jobs retry with backoff and end in pg-boss's failed state after 5 attempts (visible in the admin queue page and logs).
- **Queues** (M2): `match.report`, `notify.send`, `alerts.fanout`, `photo.process`, `photo.publish`, `report.lifecycle` (cron hourly), `retention.purge` (cron daily), `partners.stats` (cron hourly), `payment.effects`, `db.keepalive` (cron every 6 h, a trivial query so Supabase Free does not pause), `db.backup` (cron nightly, `pg_dump` to R2; ADR-016). Later: `ai.extract`, `photo.embed`, `csv.import`.
- **Schedules** with `boss.schedule(name, cron, data, { tz: 'Europe/Ljubljana' })`, created idempotently at worker start.
- **Tests**: handlers are plain async functions tested directly; integration tests call `drain()` (process the queue to empty) against the local database; `pnpm jobs:drain` does the same from the CLI.
- **Latency**: pg-boss polls every 2 s by default (`pollingIntervalSeconds`), so matching and notifications start within seconds (NFR-LAT < 2 min p95).

## Alternatives

- pgmq + pg_cron + Edge Functions (ADR-004): removed with the Edge Functions.
- BullMQ: needs Redis (another service on the VPS).

## Consequences

- The worker must be running for matching, notifications and lifecycle; Docker Compose restarts it and the health endpoint reports queue lag.
- pg-boss holds a few connections; with Supabase Free's connection limit the API and worker use small pools (API 5, worker 3) through the session pooler.
