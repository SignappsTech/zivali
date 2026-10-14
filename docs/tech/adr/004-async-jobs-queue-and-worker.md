# ADR-004: Async work through Supabase Queues (pgmq) and one `worker` Edge Function

- Status: **Superseded by ADR-022** (2026-10-15, pg-boss worker; no Edge Functions) · Date: 2026-10-14 · Owner: Tech Lead
- Source: FR-008 (suggestions < 2 min p95), FR-010 (fan-out < 60 s / 1000), FR-003 R-003.5, NFR-LAT

## Context

Matching, notifications, alert fan-out, photo publishing, lifecycle reminders and retention purges must run after a write, with retries, without blocking the user, and must work offline on the local stack.

## Decision

- One **pgmq queue `jobs`** (Supabase Queues, Postgres-native). SQL helper `enqueue_job(type text, payload jsonb, dedupe_key text default null)` is the only way to schedule work; triggers and RPCs call it inside their transaction (outbox semantics).
- One **Edge Function `worker`** reads a batch (`pgmq.read`, visibility timeout 60 s), dispatches by `type` to `supabase/functions/worker/handlers/<type>.ts`, archives on success, leaves the message for retry on failure, and moves it to `jobs_dead` after 5 attempts with the error.
- **Triggering**: `pg_cron` calls the worker every 10 s through `pg_net`; `enqueue_job` also sends an immediate `pg_net` kick so typical latency is seconds. The worker URL and service key come from Vault (`vault.decrypted_secrets`), set per environment.
- Job types (registry created once in TASK-6 with stubs; each feature task replaces its handler file): `match_report`, `notify`, `fanout_alerts`, `photo_uploaded`, `publish_photos`, `lifecycle_tick`, `purge_retention`, `refresh_partner_stats`, `payment_effects`; later `ai_extract`, `embed_photo`, `csv_import`.
- Tests call handlers directly (unit) and use `pnpm db:drain` (runs the worker loop once against the local stack) in integration and e2e tests.

## Alternatives

- Database Webhooks (pg_net fire-and-forget) only: no retry or dead-letter.
- External queue (Redis/BullMQ, Inngest): another service and account; not offline.
- Synchronous work inside RPCs: slow writes and no HTTP calls from SQL transactions.

## Consequences

- One mechanism to monitor (queue depth, dead letters) and test.
- Handlers must be idempotent (dedupe keys, upserts) because delivery is at least once.
- Edge Function wall-clock and CPU limits cap batch size; fan-out jobs split into chunks of ≤ 500 recipients.
