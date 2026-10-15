---
id: TASK-6.17
title: >-
  API follow-ups from the 6.3 and 3.12 reviews: typed notification payload,
  stopJobs on shutdown, no /docs in production
status: In Progress
assignee:
  - '@backend-dev'
created_date: '2026-10-15 13:30'
updated_date: '2026-10-15 12:30'
labels:
  - be
  - 'est:XS'
dependencies:
  - TASK-6.3
references:
  - docs/tech/backend.md
parent_task_id: TASK-6
priority: medium
ordinal: 321000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
From the TASK-6.3 and TASK-3.12 reviews (CH-135). Small hardening of apps/api: job payloads are stored in pgboss.job, so they carry ids and a template key only; the process stops the job workers cleanly on shutdown; Swagger UI is not mounted in production.

## Packet

Unblocks on: Worker and jobs: pg-boss, queue registry with stubs, schedules, keep-alive, drain merged (TASK-6.3)
Contracts: C10 (notification input), ADR-022; conventions in C1
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 NotificationInput.payload is typed (ids plus a template key only, no free-form object) because it is stored in pgboss.job; a test shows a free-form or personal-data payload is rejected
- [x] #2 server.ts calls stopJobs() on shutdown (SIGTERM/SIGINT), covered by a test or a documented manual check
- [x] #3 Swagger /docs is off in production: the route is not mounted and returns 404 (not admin-gated); still available in local and staging
- [x] #4 ADR-022 gets a note: if persistQueueStats is enabled, rerun lockDownPgboss after the daily partitions are created
<!-- AC:END -->

Branch: agent/task-6.17-api-followups
