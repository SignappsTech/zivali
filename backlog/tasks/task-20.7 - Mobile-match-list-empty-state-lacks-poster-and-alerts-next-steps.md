---
id: TASK-20.7
title: Mobile match list empty state lacks poster and alerts next steps
status: Done
assignee:
  - '@frontend-dev'
created_date: '2026-10-16 07:31'
labels:
  - bug
  - 'est:XS'
dependencies: []
parent_task_id: TASK-20
ordinal: 353000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Steps: open a lost report with no suggestions on mobile, open Poglej ujemanja. Expected: explanation plus share, poster (PDF) and alerts actions (TASK-20.5 AC#4, TASK-20 story). Actual: only 'Deli iskanje' is offered (apps/mobile/app/r/[code]/matches/index.tsx ~L190). P11 spec lists share only for the empty state, so P11 needs the same update (CHANGE row filed). Severity: minor.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Mobile /r/[code]/matches empty state offers share, poster and alerts, as web does (AC TASK-20.5 #4)
<!-- AC:END -->

## Packet
Branch: agent/task-20.7-match-empty-mob
