---
id: TASK-3.6
title: 'QA: Monorepo scaffold and local-first dev environment'
status: To Do
assignee:
  - '@qa'
created_date: '2026-10-14 22:14'
labels:
  - qa
  - 'est:XS'
milestone: m-0
dependencies:
  - TASK-3.1
  - TASK-3.2
  - TASK-3.3
  - TASK-3.4
  - TASK-3.5
references:
  - docs/tech/frontend.md
parent_task_id: TASK-3
priority: high
ordinal: 220000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Verify story TASK-3 (Monorepo scaffold and local-first dev environment) on main once all its tasks are merged: acceptance criteria below, quality gates, keyboard and screen-reader spot checks. File bug tasks for failures and set qa:pass or qa:fail.

## Packet

Unblocks on: all tasks of TASK-3 merged to main (TASK-3.1, TASK-3.2, TASK-3.3, TASK-3.4, TASK-3.5); leads add any later TASK-3 task to this task's dependencies.
Review: n/a (QA)
Branch: - (verify on main)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given a fresh clone, when a developer runs the documented bootstrap, then pnpm install, local Supabase start, DB migrate and seed, and both apps start with no cloud credentials.
- [ ] #2 Given the workspace, when listing packages, then apps/web, apps/mobile and packages for tokens, types, api, validation and analytics exist and build with Turborepo caching.
- [ ] #3 Given AI, Stripe, email, push and analytics integrations, when running locally or in tests, then each sits behind an adapter interface with a mock implementation chosen by environment.
- [ ] #4 Given the README, when read, then it documents commands, environment variable names (no values) and branch and CI conventions.
- [ ] #5 Story gates pass on main: `pnpm verify`, plus `pnpm quality` for the pages this story touches; results recorded in the QA notes.
<!-- AC:END -->
