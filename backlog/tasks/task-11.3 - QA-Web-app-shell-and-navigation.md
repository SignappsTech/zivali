---
id: TASK-11.3
title: 'QA: Web app shell and navigation'
status: To Do
assignee:
  - '@qa'
created_date: '2026-10-14 22:15'
labels:
  - qa
  - 'est:XS'
milestone: m-0
dependencies:
  - TASK-11.2
  - TASK-11.1
references:
  - docs/tech/frontend.md
  - docs/design/pages/P1-web-shell.md
parent_task_id: TASK-11
priority: medium
ordinal: 229000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Verify story TASK-11 (Web app shell and navigation) on main once all its tasks are merged: acceptance criteria below, quality gates, keyboard and screen-reader spot checks, and mobile and desktop checks for the UI. File bug tasks for failures and set qa:pass or qa:fail.

## Packet

Unblocks on: all tasks of TASK-11 merged to main (TASK-11.2, TASK-11.1); leads add any later TASK-11 task to this task's dependencies.
Review: n/a (QA)
Branch: - (verify on main)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given any web page, when rendered, then a header (logo, Map, Report, My pets and reports, Account, language switcher), a footer (About, Safety tips, Partners, Privacy, Cookies, Terms, Imprint, Accessibility, Cookie settings) and a skip link are present.
- [ ] #2 Given viewports from 360 px to 1440 px, when resized, then the layout is mobile-first with no horizontal scroll and a right sidebar region appears from the lg breakpoint.
- [ ] #3 Given a loading, empty or error state, when a page needs one, then shared patterns with calm, helpful copy are available.
- [ ] #4 Given later areas, when added, then route groups for public, app, organisation portal and admin exist with guards (empty pages are fine).
- [ ] #5 Story gates pass on main: `pnpm verify`, plus `pnpm quality` for the pages this story touches; results recorded in the QA notes.
<!-- AC:END -->
