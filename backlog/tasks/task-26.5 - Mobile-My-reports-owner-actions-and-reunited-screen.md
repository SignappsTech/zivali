---
id: TASK-26.5
title: 'Mobile My reports, owner actions and reunited screen'
status: Done
assignee:
  - '@frontend-dev'
created_date: '2026-10-14 22:14'
updated_date: '2026-10-16 02:04'
labels:
  - fe
  - 'est:M'
milestone: m-1
dependencies:
  - TASK-18.3
  - TASK-9.4
  - TASK-6.9
  - TASK-7.1
  - TASK-26.2
  - TASK-18.1
references:
  - docs/tech/frontend.md
  - docs/tech/contracts/C4-reports-and-pets.md
  - docs/design/pages/P14-reunited.md
  - docs/design/pages/P9-report-detail.md
parent_task_id: TASK-26
priority: high
ordinal: 198000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Most owners will mark reunited from their phone (FR-012).

## Packet

Unblocks on: Mobile report detail screen with slots merged (TASK-18.3); Mobile sign-in, sign-up, verification, reset and profile merged (TASK-9.4); Contract clients in @zivali/api: auth, profiles, pets, reports, photos, geocode, matches merged (TASK-6.9); packages/analytics: typed track(), event registry, consent store, adapters merged (TASK-7.1); Design: Reunited and lifecycle (P14) approved (TASK-26.2); Design: Report detail (lost, found, sighted) (P9) approved (TASK-18.1)
Design: P14 docs/design/pages/P14-reunited.md (mockup docs/design/mockups/P14-reunited.html; TASK-26.2); P9 docs/design/pages/P9-report-detail.md (mockup docs/design/mockups/P9-report-detail.html; TASK-18.1)
Copy: docs/content/pages/P14-reunited.md; docs/content/pages/P9-report-detail.md
Contracts: C4 (in references); conventions in C1
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-26.5-myreports-mob
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 My reports lists the user's reports; owner actions fill the owner-actions slot for owners and manage-link holders, per P9 and P14.
- [ ] #2 The reunited screen shows the calm celebration, next steps, success-story opt-in, and reserves the tip slot and one ad slot.
- [ ] #3 reunited fires with consent only; reopen within 7 days works.
<!-- AC:END -->
