---
id: TASK-18.4
title: 'QA: Report detail page'
status: To Do
assignee:
  - '@qa'
created_date: '2026-10-14 22:15'
labels:
  - qa
  - 'est:XS'
milestone: m-1
dependencies:
  - TASK-18.2
  - TASK-18.3
  - TASK-18.1
references:
  - docs/tech/frontend.md
  - docs/design/pages/P9-report-detail.md
parent_task_id: TASK-18
priority: high
ordinal: 236000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Verify story TASK-18 (Report detail page) on main once all its tasks are merged: acceptance criteria below, quality gates, keyboard and screen-reader spot checks, and mobile and desktop checks for the UI. File bug tasks for failures and set qa:pass or qa:fail.

## Packet

Unblocks on: all tasks of TASK-18 merged to main (TASK-18.2, TASK-18.3, TASK-18.1); leads add any later TASK-18 task to this task's dependencies.
Review: n/a (QA)
Branch: - (verify on main)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given a public report, when opened on web or mobile, then it shows photos, species, breed, colours, size, sex, a chip-on-file indicator (never the number), date and time, the fuzzed area on a map, status and circumstances.
- [ ] #2 Given the page layout, when rendered, then named action slots exist for Contact, Share, Poster, Report abuse, Owner actions and a labelled ad slot, so later stories plug in without re-layout.
- [ ] #3 Given a crawler or link preview, when the web page is fetched, then it is server-rendered with title, description, Open Graph image and structured data, and closed or hidden reports are not indexable.
- [ ] #4 Given a hidden or removed report, when its URL is opened, then a clear message explains it is no longer available.
- [ ] #5 Given SL and EN, when the language is switched, then page content and meta are localised.
- [ ] #6 Story gates pass on main: `pnpm verify`, plus `pnpm quality` for the pages this story touches; results recorded in the QA notes.
<!-- AC:END -->
