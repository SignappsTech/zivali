---
id: TASK-25.2
title: 'Abuse reports API: report, weighting, auto-hide, staff lists'
status: To Do
assignee:
  - '@backend-dev'
created_date: '2026-10-14 22:13'
updated_date: '2026-10-14 23:38'
labels:
  - be
  - 'est:S'
milestone: m-1
dependencies:
  - TASK-6.8
  - TASK-6.12
references:
  - docs/tech/backend.md
  - docs/tech/contracts/C11-abuse-reports.md
  - docs/tech/contracts/C1-platform-conventions.md
parent_task_id: TASK-25
priority: medium
ordinal: 173000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Users must flag scams and spam in one or two taps from day one, before the moderation queue exists (FR-018).

## Packet

Unblocks on: Abuse, payments, ads, leads and organisations models with seed merged (TASK-6.8); API auth and platform middleware: JWKS verification, guards, rate limits, idempotency, ctx, audit, public config merged (TASK-6.12)
Contracts: C11, C1 (in references); conventions in C1
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-25.2-abuse-be
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 POST /v1/abuse-reports accepts reports on listings, messages and profiles from signed-in and anonymous users, rate limited 10/hour per user and IP, and returns the existing report for duplicates from the same reporter.
- [ ] #2 Message reports require the reporter to be a participant; reports from accounts younger than 24 h weigh 0.5.
- [ ] #3 When weighted open reports on a listing reach abuse.auto_hide_threshold (3) the report is hidden, its photos unpublished, a moderation flag created and the managers notified.
- [ ] #4 GET /v1/admin/abuse-reports and /v1/admin/moderation-flags are available to moderators with aal2 only; Supertest covers all of the above.
<!-- AC:END -->
