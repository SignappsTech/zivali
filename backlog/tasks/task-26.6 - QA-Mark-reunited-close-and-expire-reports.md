---
id: TASK-26.6
title: 'QA: Mark reunited, close and expire reports'
status: To Do
assignee:
  - '@qa'
created_date: '2026-10-14 22:15'
updated_date: '2026-10-15 01:54'
labels:
  - qa
  - 'est:XS'
milestone: m-1
dependencies:
  - TASK-26.3
  - TASK-26.4
  - TASK-26.5
  - TASK-26.1
  - TASK-26.2
  - TASK-26.7
references:
  - docs/tech/frontend.md
  - docs/design/pages/P14-reunited.md
parent_task_id: TASK-26
priority: high
ordinal: 244000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Verify story TASK-26 (Mark reunited, close and expire reports) on main once all its tasks are merged: acceptance criteria below, quality gates, keyboard and screen-reader spot checks, and mobile and desktop checks for the UI. File bug tasks for failures and set qa:pass or qa:fail.

## Packet

Unblocks on: all tasks of TASK-26 merged to main (TASK-26.3, TASK-26.4, TASK-26.5, TASK-26.1, TASK-26.2); leads add any later TASK-26 task to this task's dependencies.
Review: n/a (QA)
Branch: - (verify on main)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given an owner (or an anonymous finder with the manage link), when they mark a report Reunited, then status becomes REUNITED, linked matches close, alerts and boosts stop, the counterpart is notified and reunited fires (consent only).
- [ ] #2 Given My reports, when opened, then the owner can edit, close with a reason (found elsewhere, gave up, other) or reopen within 7 days.
- [ ] #3 Given a LOST report, when it reaches 7, 14 and 30 days, then the owner gets an update reminder, and at 90 days without action it auto-closes with a one-tap extension.
- [ ] #4 Given FOUND or SIGHTED reports, when 30 days pass without update, then they expire the same way, and shelter intakes are exempt (FR-015).
- [ ] #5 Given the reunited screen, when shown, then it celebrates warmly, shows next steps and reserves slots for the thank-you tip (FR-021) and one labelled ad slot (FR-030).
- [ ] #6 Given statistics, when a report is reunited, then time to reunite and time to first match are recorded for KPIs.
- [ ] #7 Story gates pass on main: `pnpm verify`, plus `pnpm quality` for the pages this story touches; results recorded in the QA notes.
<!-- AC:END -->
