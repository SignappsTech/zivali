---
id: TASK-31.6
title: 'QA: Browse lost and found on a map and in a list'
status: To Do
assignee:
  - '@qa'
created_date: '2026-10-14 22:15'
labels:
  - qa
  - 'est:XS'
milestone: m-1
dependencies:
  - TASK-31.3
  - TASK-31.4
  - TASK-31.5
  - TASK-31.1
  - TASK-31.2
references:
  - docs/tech/frontend.md
  - docs/design/pages/P4-map-list.md
parent_task_id: TASK-31
priority: high
ordinal: 249000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Verify story TASK-31 (Browse lost and found on a map and in a list) on main once all its tasks are merged: acceptance criteria below, quality gates, keyboard and screen-reader spot checks, and mobile and desktop checks for the UI. File bug tasks for failures and set qa:pass or qa:fail.

## Packet

Unblocks on: all tasks of TASK-31 merged to main (TASK-31.3, TASK-31.4, TASK-31.5, TASK-31.1, TASK-31.2); leads add any later TASK-31 task to this task's dependencies.
Review: n/a (QA)
Branch: - (verify on main)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given the map, when it loads, then pins or clusters for LOST, FOUND and SIGHTED reports in view appear within 2 s on 4G for 500 reports, coded by icon and colour (not colour alone) with fuzzed locations.
- [ ] #2 Given the list, when opened, then it shows the same results ordered by distance or recency with pagination and works as the full alternative to the map for keyboard and screen reader users.
- [ ] #3 Given filters, when applied, then type, species, distance, date range, colour and size narrow both map and list, persist in the URL on web and show result counts with correct SL plural forms.
- [ ] #4 Given boosted reports, when listed, then boosted_until sorts them first and highlights them on the map (behaviour ready, purchase comes in M4).
- [ ] #5 Given closed or expired reports, when browsing, then they are excluded by default.
- [ ] #6 Story gates pass on main: `pnpm verify`, plus `pnpm quality` for the pages this story touches; results recorded in the QA notes.
<!-- AC:END -->
