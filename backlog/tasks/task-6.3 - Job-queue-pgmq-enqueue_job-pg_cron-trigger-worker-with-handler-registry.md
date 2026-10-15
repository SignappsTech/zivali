---
id: TASK-6.3
title: >-
  Worker and jobs: pg-boss, queue registry with stubs, schedules, keep-alive,
  drain
status: To Do
assignee:
  - '@backend-dev'
created_date: '2026-10-14 22:12'
updated_date: '2026-10-15 04:23'
labels:
  - be
  - 'est:S'
milestone: m-0
dependencies:
  - TASK-3.7
  - TASK-6.2
references:
  - docs/tech/backend.md
  - docs/tech/contracts/C1-platform-conventions.md
  - docs/tech/adr/022-jobs-pg-boss.md
parent_task_id: TASK-6
priority: high
ordinal: 123000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Matching, notifications, alerts, photo processing, lifecycle, retention and backups all run in one pg-boss worker in the same Postgres (ADR-022).

## Packet

Unblocks on: apps/api scaffold: Express 5 + Prisma 7 in klikni style with the domain layer merged (TASK-3.7); DB foundation and lockdown: schema app, extensions, deny-all RLS, security tests, platform models, fixture users merged (TASK-6.2)
Contracts: C1 (in references); conventions in C1
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-6.3-queue
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 worker.ts starts pg-boss (schema pgboss) and registers handlers for match.report, notify.send, alerts.fanout, photo.process, photo.publish, report.lifecycle, retention.purge, partners.stats, payment.effects, directory.reminder, db.keepalive and db.backup (stubs that log, except db.keepalive which runs a trivial query).
- [ ] #2 lib/jobs.ts sends jobs (optionally inside a Prisma transaction) with retryLimit 5 and backoff; schedules (lifecycle hourly, retention daily, partners hourly, keep-alive every 6 h) are created idempotently in Europe/Ljubljana.
- [ ] #3 domains/notifications exposes enqueueNotification(input, ctx) as a stub that sends notify.send, so feature tasks can call it before the notifications task merges.
- [ ] #4 drain() processes queues to empty for tests and `pnpm jobs:drain`; an integration test proves send → handler → completion and failure → retry → failed state; /v1/health/ready reports queue lag.
- [ ] #5 pg-boss tables (including per-queue partitions) have RLS enabled; test/security fails otherwise (CH-103)
<!-- AC:END -->
