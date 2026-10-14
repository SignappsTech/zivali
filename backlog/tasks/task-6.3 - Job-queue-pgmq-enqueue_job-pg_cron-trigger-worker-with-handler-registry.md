---
id: TASK-6.3
title: 'Job queue: pgmq, enqueue_job, pg_cron trigger, worker with handler registry'
status: To Do
assignee:
  - '@backend-dev'
created_date: '2026-10-14 22:12'
labels:
  - be
  - 'est:S'
milestone: m-0
dependencies:
  - TASK-3.2
references:
  - docs/tech/backend.md
  - docs/tech/contracts/C1-platform-conventions.md
  - docs/tech/adr/004-async-jobs-queue-and-worker.md
parent_task_id: TASK-6
priority: high
ordinal: 123000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Matching, notifications, alerts, photo publishing and lifecycle all run asynchronously with retries; one queue and one worker serve them all (ADR-004).

## Packet

Unblocks on: Local Supabase stack, Edge Function base and mock adapters merged (TASK-3.2)
Contracts: C1 (in references); conventions in C1
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-6.3-queue
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 pgmq queue `jobs`, enqueue_job(type, payload, dedupe_key) with 10-minute dedupe, a jobs_dead table and a jobs_metrics view exist.
- [ ] #2 pg_cron (every 10 s) and an immediate pg_net kick call the worker using Vault secrets worker_url and worker_key, set for the local stack by migration or seed.
- [ ] #3 The worker Edge Function reads batches, dispatches to handlers/<type>.ts, archives on success, retries via the visibility timeout and dead-letters after 5 attempts; stub handlers exist for match_report, notify, fanout_alerts, photo_uploaded, publish_photos, lifecycle_tick, purge_retention, refresh_partner_stats and payment_effects.
- [ ] #4 enqueue_notification(user, type, payload, dedupe_key) exists as a stub that enqueues `notify`; `pnpm db:drain` runs the worker until the queue is empty; an integration test proves enqueue → handler → archive, and failure → retry → dead letter.
<!-- AC:END -->
