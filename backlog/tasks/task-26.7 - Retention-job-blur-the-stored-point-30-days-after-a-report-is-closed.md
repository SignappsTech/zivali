---
id: TASK-26.7
title: 'Retention job: blur the stored point 30 days after a report is closed'
status: To Do
assignee:
  - '@backend-dev'
created_date: '2026-10-15 01:53'
labels:
  - be
  - 'est:S'
dependencies:
  - TASK-6.6
  - TASK-6.3
  - TASK-26.3
references:
  - docs/tech/backend.md
  - docs/tech/adr/006-location-privacy-and-geo-reference.md
  - docs/tech/contracts/C6-location-geo-maps.md
  - docs/tech/contracts/C4-reports-and-pets.md
parent_task_id: TASK-26
ordinal: 301000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Exact-point retention (CH-24): after a report is closed or reunited, the stored point is replaced by the blurred public point so only the area remains. N is app_config retention.exact_point_blur_days (default 30, the lawyer confirms in the retention table).

## Packet

Unblocks on: Reports schema and fuzz merged (TASK-6.6); Worker and jobs merged (TASK-6.3); Lifecycle transitions merged (TASK-26.3)
Contracts: C4, C6 (in references); ADR-006
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Scope: pg-boss schedule retention.blur_location (daily) registered in the queue registry; the existing 12-month retention.purge still nulls what remains.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Job retention.blur_location (daily schedule) sets exact_point = public_point for reports whose closed_at or reunited_at is older than app_config retention.exact_point_blur_days (default 30); it is idempotent, batches its updates and logs counts only, never coordinates.
- [ ] #2 Reports closed more recently, open reports, and reports reopened within the window are untouched; a reopen after the blur keeps the blurred point as the new stored point (the owner is asked to confirm the location).
- [ ] #3 API tests with a faked clock cover: blurred after N days, not before, idempotent second run, public circle unchanged, owner view then shows the blurred point.
- [ ] #4 The job is listed in the queue registry and docs/tech/backend.md job table if one exists.
<!-- AC:END -->
