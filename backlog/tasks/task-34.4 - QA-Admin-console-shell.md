---
id: TASK-34.4
title: 'QA: Admin console shell'
status: To Do
assignee:
  - '@qa'
created_date: '2026-10-14 22:15'
labels:
  - qa
  - 'est:XS'
milestone: m-1
dependencies:
  - TASK-34.2
  - TASK-34.3
  - TASK-34.1
references:
  - docs/tech/frontend.md
  - docs/design/pages/P19-admin-shell.md
parent_task_id: TASK-34
priority: high
ordinal: 252000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Verify story TASK-34 (Admin console shell) on main once all its tasks are merged: acceptance criteria below, quality gates, keyboard and screen-reader spot checks, and mobile and desktop checks for the UI. File bug tasks for failures and set qa:pass or qa:fail.

## Packet

Unblocks on: all tasks of TASK-34 merged to main (TASK-34.2, TASK-34.3, TASK-34.1); leads add any later TASK-34 task to this task's dependencies.
Review: n/a (QA)
Branch: - (verify on main)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given a user with the admin or moderator role, when they open the admin area, then they see a navigation shell (Ads, Reports, Organisations, Users, Orders, KPIs) filtered by role and everyone else is redirected or gets 403.
- [ ] #2 Given any admin action, when performed, then an audit log entry (who, what, when, target) is stored and viewable by admins.
- [ ] #3 Given admin roles, when they sign in, then strong authentication (TOTP or equivalent, decided in the TDD) is required.
- [ ] #4 Given the first admin, when bootstrapping a new environment, then a documented script creates the initial admin without a public sign-up path.
- [ ] #5 Given the admin area, when used, then it is web-only, SL and EN, and core tables and forms meet WCAG 2.2 AA.
- [ ] #6 Story gates pass on main: `pnpm verify`, plus `pnpm quality` for the pages this story touches; results recorded in the QA notes.
<!-- AC:END -->
