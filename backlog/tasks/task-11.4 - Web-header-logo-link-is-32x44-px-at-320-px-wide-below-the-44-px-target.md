---
id: TASK-11.4
title: 'Web: header logo link is 32x44 px at 320 px wide, below the 44 px target'
status: To Do
assignee:
  - '@frontend-dev'
created_date: '2026-10-19 18:16'
labels:
  - bug
  - 'est:XS'
  - web
  - trivial
dependencies: []
references:
  - docs/tech/frontend.md
parent_task_id: TASK-11
priority: low
ordinal: 433200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Found by QA TASK-3.6 (2026-10-19). Bug fix to an existing layout, no wireframe needed.

## Packet
Unblocks on: -
Branch: agent/task-11-logo-target
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 At 320, 390 and 1200 px the header logo link is at least 44x44 px (DOM check), light and dark, without moving the logo visually
- [ ] #2 A unit or e2e assertion covers the size
<!-- AC:END -->
