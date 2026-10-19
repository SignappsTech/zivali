---
id: TASK-115.13
title: >-
  Web home: map card and recent-report rows fail Label in Name (WCAG 2.5.3,
  Lighthouse label-content-name-mismatch)
status: To Do
assignee:
  - '@frontend-dev'
created_date: '2026-10-19 19:44'
labels:
  - bug
  - 'est:XS'
  - web
dependencies: []
references:
  - apps/web/components/home/blocks.tsx
parent_task_id: TASK-115
priority: low
ordinal: 447200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Found by QA TASK-11.3 (2026-10-19, live 030da43f). Not scored by Lighthouse (a11y 100) but flagged. Same class as TASK-38.7 (language switch). Bug fix, no wireframe.

## Packet
Unblocks on: -
Branch: agent/task-115-home-label-in-name
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 On / and /en, the 'Odpri zemljevid' map card and each recent-report row have an accessible name that contains (ideally starts with) their visible text; Lighthouse label-content-name-mismatch passes
- [ ] #2 A unit test asserts the names
<!-- AC:END -->
