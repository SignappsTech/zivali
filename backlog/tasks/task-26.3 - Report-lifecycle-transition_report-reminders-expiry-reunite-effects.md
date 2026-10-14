---
id: TASK-26.3
title: >-
  Report lifecycle: transitions endpoint, reminders and expiry job, reunite
  effects
status: To Do
assignee:
  - '@backend-dev'
created_date: '2026-10-14 22:13'
updated_date: '2026-10-14 23:38'
labels:
  - be
  - 'est:M'
milestone: m-1
dependencies:
  - TASK-6.6
  - TASK-6.3
  - TASK-6.12
references:
  - docs/tech/backend.md
  - docs/tech/contracts/C4-reports-and-pets.md
  - docs/tech/contracts/C10-notifications-alerts.md
parent_task_id: TASK-26
priority: high
ordinal: 175000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Closing the loop gives the reunite-rate metric and keeps the map trustworthy (FR-012).

## Packet

Unblocks on: Reports, pets and photos models, deterministic fuzz, public report endpoint, seed merged (TASK-6.6); Worker and jobs: pg-boss, queue registry with stubs, schedules, keep-alive, drain merged (TASK-6.3); API auth and platform middleware: JWKS verification, guards, rate limits, idempotency, ctx, audit, public config merged (TASK-6.12)
Contracts: C4, C10 (in references); conventions in C1
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-26.3-lifecycle-be
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 POST /v1/reports/:code/transitions implements the C4 status machine (mark_reunited, close with reason, reopen within 7 days, extend) for managers including manage-link holders, with tests for every allowed and refused transition.
- [ ] #2 Mark reunited closes linked matches, cancels pending alerts, stops boosts, notifies the counterpart, sets reunited_at and records time to reunite and time to first match.
- [ ] #3 The report.lifecycle job (hourly) sends LOST reminders at 7, 14 and 30 days, auto-closes LOST reports after 90 idle days with a one-tap extend, and expires FOUND and SIGHTED after 30 idle days except organisation intakes.
- [ ] #4 Closing clears the manage token; all timings come from app_config.
<!-- AC:END -->
