---
id: TASK-24.7
title: >-
  e2e: the poster dialog large-text test times out in CI before the dialog opens
  (parked as fixme)
status: To Do
assignee:
  - '@frontend-dev'
created_date: '2026-10-19 20:19'
labels:
  - bug
  - 'est:XS'
  - web
dependencies: []
references:
  - apps/web/e2e/large-text.spec.ts
parent_task_id: TASK-24
priority: medium
ordinal: 454200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
CI on c2040993 (2026-10-19): both cases hit the 30 s test timeout; all 308 other tests passed. Parked with test.fixme so batch 6 could deploy. Needs a local Playwright run on main (the lead runs it; worktrees can't run e2e) to see the error context: likely the Radix menu doesn't open under 200 % root font-size, or the menuitem/dialog names differ.

## Packet
Unblocks on: -
Branch: agent/task-24.7-poster-e2e
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 apps/web/e2e/large-text.spec.ts 'the poster dialog at 390/320 px and 200 % text has no sideways scroll' runs (no fixme) and passes locally on main and in CI, reliably (3 runs)
<!-- AC:END -->
