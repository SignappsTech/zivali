---
id: TASK-12.4
title: 'QA: Mobile app shell, navigation and deep links'
status: To Do
assignee:
  - '@qa'
created_date: '2026-10-14 22:15'
labels:
  - qa
  - 'est:XS'
milestone: m-0
dependencies:
  - TASK-12.2
  - TASK-12.3
  - TASK-12.1
references:
  - docs/tech/frontend.md
  - docs/design/pages/P2-mobile-shell.md
parent_task_id: TASK-12
priority: medium
ordinal: 230000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Verify story TASK-12 (Mobile app shell, navigation and deep links) on main once all its tasks are merged: acceptance criteria below, quality gates, keyboard and screen-reader spot checks, and mobile and desktop checks for the UI. File bug tasks for failures and set qa:pass or qa:fail.

## Packet

Unblocks on: all tasks of TASK-12 merged to main (TASK-12.2, TASK-12.3, TASK-12.1); leads add any later TASK-12 task to this task's dependencies.
Review: n/a (QA)
Branch: - (verify on main)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given the app, when launched signed in or out, then bottom tabs (Map, Report, Inbox, Profile) and a prominent Report action are available.
- [ ] #2 Given a listing link or poster QR, when opened on a phone with the app, then it deep-links to the report screen, and without the app it opens the web page (universal and app link configuration verified in dev builds).
- [ ] #3 Given camera, location and notifications, when first needed, then a plain-language explainer precedes the OS prompt and a denial leaves a working fallback (manual location, gallery).
- [ ] #4 Given an EAS development build, when run, then the push token registration code path exists and uses a mock until Firebase and APNs credentials arrive (Q-007).
- [ ] #5 Story gates pass on main: `pnpm verify`, plus `pnpm quality` for the pages this story touches; results recorded in the QA notes.
<!-- AC:END -->
