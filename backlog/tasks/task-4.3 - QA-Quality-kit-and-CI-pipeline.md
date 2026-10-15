---
id: TASK-4.3
title: 'QA: Quality kit and CI pipeline'
status: To Do
assignee:
  - '@qa'
created_date: '2026-10-14 22:15'
updated_date: '2026-10-15 12:56'
labels:
  - qa
  - 'est:XS'
  - 'qa:fail'
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

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
QA 2026-10-15 on main 44d55ea: qa:fail.
- pnpm verify PASS. quality: playwright 18/18 PASS, links 0 broken of 14, Lighthouse FAIL on items owned elsewhere: script budget 288-315 KB / 256 KB, mobile LCP 2.7-2.8 s, perf 0.76-0.80, no meta description on / and /en (all TASK-11.2 / TASK-90.4), robots.txt missing (TASK-72 AC3).
- TASK-4.2: secretlint catches a planted token; all 5 action refs are 40-char SHAs (existence unverified, no gh here); SUPABASE_*_PORT env comment in ci.yml is misleading (config.toml uses literal ports), harmless. AC2/AC3 need the first CI run after a push.
- TASK-98 AC3 FAIL: web e2e 25 pass / 5 fail. Bugs TASK-4.4 (photos spec hardcodes :4000) and TASK-4.5 (kit axe spec timeout).
- Re-run QA after TASK-4.4, TASK-4.5 and TASK-11.2 merge.
<!-- SECTION:NOTES:END -->
