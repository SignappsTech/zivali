---
id: TASK-39.3
title: 'QA: Core loop end-to-end acceptance'
status: To Do
assignee:
  - '@qa'
created_date: '2026-10-14 22:16'
labels:
  - qa
  - 'est:XS'
milestone: m-1
dependencies:
  - TASK-39.1
  - TASK-39.2
references:
  - docs/tech/frontend.md
parent_task_id: TASK-39
priority: high
ordinal: 257000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Verify story TASK-39 (Core loop end-to-end acceptance) on main once all its tasks are merged: acceptance criteria below, quality gates, keyboard and screen-reader spot checks. File bug tasks for failures and set qa:pass or qa:fail.

## Packet

Unblocks on: all tasks of TASK-39 merged to main (TASK-39.1, TASK-39.2); leads add any later TASK-39 task to this task's dependencies.
Review: n/a (QA)
Branch: - (verify on main)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given the local stack, when the e2e suite runs on web in SL and EN, then lost report, found report without account, match suggested, owner confirms, chat and mark reunited pass end to end.
- [ ] #2 Given the same chip number on both sides, when the reports are created, then a chip-match notification is received in the test inbox within 2 minutes.
- [ ] #3 Given consent denied, when the journey runs, then no analytics request is sent, and given consent granted, then the taxonomy events fire with region and species and no personal data.
- [ ] #4 Given a mobile dev build, when the smoke flow runs, then the found-report and match-confirm screens complete.
- [ ] #5 Given the suite is green in CI, when M2 closes, then a short report lists any known gaps.
- [ ] #6 Story gates pass on main: `pnpm verify`, plus `pnpm quality` for the pages this story touches; results recorded in the QA notes.
<!-- AC:END -->
