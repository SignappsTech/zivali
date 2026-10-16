---
id: TASK-25.4
title: Mobile report-abuse sheet and detail slot
status: In Progress
assignee:
  - '@frontend-dev'
created_date: '2026-10-14 22:13'
updated_date: '2026-10-16 00:37'
labels:
  - fe
  - 'est:S'
milestone: m-1
dependencies:
  - TASK-18.3
  - TASK-6.10
  - TASK-25.1
references:
  - docs/tech/frontend.md
  - docs/tech/contracts/C11-abuse-reports.md
  - docs/design/pages/P10-report-abuse.md
parent_task_id: TASK-25
priority: medium
ordinal: 185000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Most scam reports will come from phones (FR-018).

## Packet

Unblocks on: Mobile report detail screen with slots merged (TASK-18.3); Contract clients in @zivali/api: chat, notifications, alerts, abuse, payments, ads, partners merged (TASK-6.10); Design: Report abuse (P10) approved (TASK-25.1)
Design: P10 docs/design/pages/P10-report-abuse.md (mockup docs/design/mockups/P10-report-abuse.html; TASK-25.1)
Copy: docs/content/pages/P10-report-abuse.md
Contracts: C11 (in references); conventions in C1
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-25.4-abuse-mob
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 A report-abuse sheet offers the same reasons and optional note, per P10; anonymous users sign in anonymously first.
- [x] #2 It fills the report-abuse slot on the report screen and is reusable from chat; duplicates show the same confirmation.
- [x] #3 Errors and rate limits are localised; screen-reader labels verified.
<!-- AC:END -->
