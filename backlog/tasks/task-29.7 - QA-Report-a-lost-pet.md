---
id: TASK-29.7
title: 'QA: Report a lost pet'
status: To Do
assignee:
  - '@qa'
created_date: '2026-10-14 22:15'
labels:
  - qa
  - 'est:XS'
milestone: m-1
dependencies:
  - TASK-29.2
  - TASK-29.3
  - TASK-29.4
  - TASK-29.5
  - TASK-29.6
  - TASK-29.1
references:
  - docs/tech/frontend.md
  - docs/design/pages/P6-report-lost.md
parent_task_id: TASK-29
priority: high
ordinal: 247000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Verify story TASK-29 (Report a lost pet) on main once all its tasks are merged: acceptance criteria below, quality gates, keyboard and screen-reader spot checks, and mobile and desktop checks for the UI. File bug tasks for failures and set qa:pass or qa:fail.

## Packet

Unblocks on: all tasks of TASK-29 merged to main (TASK-29.2, TASK-29.3, TASK-29.4, TASK-29.5, TASK-29.6, TASK-29.1); leads add any later TASK-29 task to this task's dependencies.
Review: n/a (QA)
Branch: - (verify on main)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given a signed-in owner, when they start a lost report, then they can pick a saved pet or enter pet details on the spot, set last-seen place and radius, date and time (default now), circumstances and contact preference (chat only by default).
- [ ] #2 Given a visitor without an account, when they reach submit, then the draft is kept and sign-up or sign-in completes the report without losing data.
- [ ] #3 Given a submitted report, when saved, then it appears on the map and list within a minute with fuzzed location, matching runs, nearby alerts fan out and the owner sees a confirmation with next steps (poster, share, tips).
- [ ] #4 Given the confirmation screen, when displayed, then it reserves a slot for the optional support contribution (FR-021), nothing is pre-selected, and no ad appears anywhere in the flow.
- [ ] #5 Given the flow, when it starts and when it is submitted, then report_lost_start and report_lost_submit fire with region and species only, and only with consent.
- [ ] #6 Given incomplete data, when the user submits, then errors are specific and localised and the form keeps their input.
- [ ] #7 Story gates pass on main: `pnpm verify`, plus `pnpm quality` for the pages this story touches; results recorded in the QA notes.
<!-- AC:END -->
