---
id: TASK-4.3
title: 'QA: Quality kit and CI pipeline'
status: To Do
assignee:
  - '@qa'
created_date: '2026-10-14 22:15'
labels:
  - qa
  - 'est:XS'
milestone: m-0
dependencies:
  - TASK-4.1
  - TASK-4.2
references:
  - docs/tech/frontend.md
parent_task_id: TASK-4
priority: high
ordinal: 221000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Verify story TASK-4 (Quality kit and CI pipeline) on main once all its tasks are merged: acceptance criteria below, quality gates, keyboard and screen-reader spot checks. File bug tasks for failures and set qa:pass or qa:fail.

## Packet

Unblocks on: all tasks of TASK-4 merged to main (TASK-4.1, TASK-4.2); leads add any later TASK-4 task to this task's dependencies.
Review: n/a (QA)
Branch: - (verify on main)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given a pull request, when CI runs, then lint, typecheck, unit tests and build run for affected packages and block the merge on failure.
- [ ] #2 Given the web app, when CI runs, then Playwright smoke tests, axe accessibility checks and Lighthouse CI budgets (performance, accessibility, SEO) run against a preview build.
- [ ] #3 Given the mobile app, when CI runs, then unit and component tests run and an Expo typecheck and export check passes.
- [ ] #4 Given a leaked secret or a high-severity dependency issue, when CI runs, then secret scanning and dependency audit fail the build.
- [ ] #5 Story gates pass on main: `pnpm verify`, plus `pnpm quality` for the pages this story touches; results recorded in the QA notes.
<!-- AC:END -->
