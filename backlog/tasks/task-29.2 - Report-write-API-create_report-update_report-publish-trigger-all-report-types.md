---
id: TASK-29.2
title: >-
  Report write API: POST and PATCH /v1/reports with idempotency, guard hook and
  jobs
status: Done
assignee:
  - '@backend-dev'
created_date: '2026-10-14 22:13'
updated_date: '2026-10-15 18:00'
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
  - docs/tech/contracts/C1-platform-conventions.md
  - docs/tech/contracts/C6-location-geo-maps.md
parent_task_id: TASK-29
priority: high
ordinal: 159000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
One validated write path serves lost, found and sighted reports from owners and anonymous finders and starts matching and alerts immediately (FR-005, FR-006).

## Packet

Unblocks on: Reports, pets and photos models, deterministic fuzz, public report endpoint, seed merged (TASK-6.6); Worker and jobs: pg-boss, queue registry with stubs, schedules, keep-alive, drain merged (TASK-6.3); API auth and platform middleware: JWKS verification, guards, rate limits, idempotency, ctx, audit, public config merged (TASK-6.12)
Contracts: C4, C1, C6 (in references); conventions in C1
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-29.2-report-write-be
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 POST /v1/reports (Idempotency-Key required) and PATCH /v1/reports/:code implement C4 for lost, found and sighted through ReportsDomain.createReport and updateReport; a replay with the same key from the same user returns the original response for 24 h, another user gets CONFLICT.
- [ ] #2 Validation: a future event_at is rejected, events older than 30 days return the OLD_EVENT warning, a pet with an open lost report returns DUPLICATE_OPEN_REPORT with the existing code, and chips are normalised.
- [ ] #3 The creator is added to report_managers; the domain calls the submission guard first (stub here, rules from the anonymous-reporter task); lost reports need a non-anonymous account.
- [ ] #4 Creation applies the fuzz and geo lookup and, in the same transaction, queues photo.publish, match.report and, for visible lost reports, alerts.fanout; GET /v1/me/reports lists the caller's reports; the new report is returned by GET /v1/reports/:code within one minute after `pnpm jobs:drain`.
- [ ] #5 Supertest covers every validation, the permission matrix and the queued jobs.
- [ ] #6 Reward fields are accepted on create and PATCH for lost reports only (found or sighted with a reward → VALIDATION) and reward_note with contact data → VALIDATION issue CONTACT_DATA, per C4; no payment is created.
- [ ] #7 Locations are coarsened once on the server (coarsenPoint, 20–30 m) after the client's own coarsening; PATCH without a location change keeps the stored point; bodies with points are never logged; Supertest asserts no raw point persisted and a repeated GET returns the same point (C6 §Storage).
- [ ] #8 Besides creation, alerts.fanout (lost reports) and match.report are queued when a report is released from held to visible and when its location changes (PATCH); both jobs are idempotent, so a re-run is safe (from the TASK-19.1 and TASK-23.1 reviews)
<!-- AC:END -->
