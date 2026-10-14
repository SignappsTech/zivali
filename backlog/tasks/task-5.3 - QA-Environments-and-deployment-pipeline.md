---
id: TASK-5.3
title: 'QA: Environments and deployment pipeline'
status: To Do
assignee:
  - '@qa'
created_date: '2026-10-14 22:15'
labels:
  - qa
  - 'est:XS'
milestone: m-0
dependencies:
  - TASK-5.1
  - TASK-5.2
references:
  - docs/tech/frontend.md
parent_task_id: TASK-5
priority: medium
ordinal: 222000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Verify story TASK-5 (Environments and deployment pipeline) on main once all its tasks are merged: acceptance criteria below, quality gates, keyboard and screen-reader spot checks. File bug tasks for failures and set qa:pass or qa:fail.

## Packet

Unblocks on: all tasks of TASK-5 merged to main (TASK-5.1, TASK-5.2); leads add any later TASK-5 task to this task's dependencies.
Review: n/a (QA)
Branch: - (verify on main)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given merged code on main, when the pipeline runs, then web deploys to Vercel staging and migrations apply to the staging Supabase project (EU Frankfurt) once credentials exist, and passes in dry-run mode until then.
- [ ] #2 Given a migration, when applied, then it is reversible or has a documented rollback and runs in CI against a clean local database.
- [ ] #3 Given EAS, when a developer runs a build profile, then development and preview profiles exist (no store submission).
- [ ] #4 Given the environments, when documented, then a runbook lists required credentials, who provides them and which features stay blocked without them.
- [ ] #5 Story gates pass on main: `pnpm verify`, plus `pnpm quality` for the pages this story touches; results recorded in the QA notes.
<!-- AC:END -->
