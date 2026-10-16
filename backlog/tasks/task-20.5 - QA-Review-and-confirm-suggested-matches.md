---
id: TASK-20.5
title: 'QA: Review and confirm suggested matches'
status: Done
assignee:
  - '@qa'
created_date: '2026-10-14 22:15'
updated_date: '2026-10-16 08:56'
labels:
  - 'qa qa:fail'
milestone: m-1
dependencies:
  - TASK-20.2
  - TASK-20.3
  - TASK-20.4
  - TASK-20.1
references:
  - docs/tech/frontend.md
  - docs/design/pages/P11-match-review.md
parent_task_id: TASK-20
priority: high
ordinal: 238000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Verify story TASK-20 (Review and confirm suggested matches) on main once all its tasks are merged: acceptance criteria below, quality gates, keyboard and screen-reader spot checks, and mobile and desktop checks for the UI. File bug tasks for failures and set qa:pass or qa:fail.

## Packet

Unblocks on: all tasks of TASK-20 merged to main (TASK-20.2, TASK-20.3, TASK-20.4, TASK-20.1); leads add any later TASK-20 task to this task's dependencies.
Review: n/a (QA)
Branch: - (verify on main)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Given an owner with an open lost report, when suggestions exist, then a ranked list shows each candidate with photo comparison, distance, time gap, matching reasons and a clear strength label (not only a percentage).
- [x] #2 Given a suggestion, when the owner confirms, then a chat with the other party opens and both are notified, and when the owner rejects it, then it is hidden for good.
- [x] #3 Given a chip match, when shown, then it is labelled the strongest match and the owner is told no personal data is revealed until they confirm.
- [ ] #4 Given no suggestions yet, when the owner opens the screen, then it explains that matching is running and shows next steps (poster, share, alerts).
- [x] #5 Given instrumentation, when suggestions are viewed or confirmed, then match_suggested and match_confirmed fire with region and species only, and only with consent.
- [ ] #6 Story gates pass on main: `pnpm verify`, plus `pnpm quality` for the pages this story touches; results recorded in the QA notes.
<!-- AC:END -->
