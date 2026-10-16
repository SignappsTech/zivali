---
id: TASK-29.6
title: 'Mobile lost flow: signed-out draft hand-off and confirmation screen'
status: In Progress
assignee:
  - '@frontend-dev'
created_date: '2026-10-14 22:14'
updated_date: '2026-10-16 01:10'
labels:
  - fe
  - 'est:S'
milestone: m-1
dependencies:
  - TASK-29.5
  - TASK-9.4
  - TASK-29.1
  - TASK-33.1
  - TASK-88.3
references:
  - docs/tech/frontend.md
  - docs/tech/contracts/C3-auth-profiles-roles.md
  - docs/design/pages/P6-report-lost.md
  - docs/design/pages/P15-support-moments.md
parent_task_id: TASK-29
priority: high
ordinal: 204000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Visitors can start reporting in the app and sign up at the end without losing data (FR-005).

## Packet

Unblocks on: Mobile report-lost flow merged (TASK-29.5); Mobile sign-in, sign-up, verification, reset and profile merged (TASK-9.4); Design: Report lost flow (P6) approved (TASK-29.1); Design: Support moments: tip and contribution (P15) approved (TASK-33.1); Directory client in @zivali/api and useResponsibleShelter hook merged (TASK-88.3)
Design: P6 docs/design/pages/P6-report-lost.md (mockup docs/design/mockups/P6-report-lost.html; TASK-29.1); P15 docs/design/pages/P15-support-moments.md (mockup docs/design/mockups/P15-support-moments.html; TASK-33.1)
Copy: docs/content/pages/P6-report-lost.md; docs/content/pages/P15-support-moments.md
Contracts: C3 (in references); conventions in C1
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-29.6-lost-mob-confirm
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A signed-out user's draft (fields and photos) survives sign-in or sign-up through the contextual gate and is submitted afterwards.
- [ ] #2 The confirmation screen shows next steps and a collapsed, never pre-selected contribution slot, with no ad.
- [ ] #3 The new report is visible on the Map tab within a minute on the local stack.
- [ ] #4 After submit the confirmation shows a checklist with a one-tap call to the responsible shelter from the directory (C18) and the owner reporting duty, never claiming the app replaces it; legal timings appear only when content.legal_timings is on, and an unconfirmed municipality shows the generic notice.
<!-- AC:END -->
