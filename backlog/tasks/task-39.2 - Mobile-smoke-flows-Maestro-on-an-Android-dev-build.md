---
id: TASK-39.2
title: Mobile smoke flows (Maestro) on an Android dev build
status: To Do
assignee:
  - '@frontend-dev'
created_date: '2026-10-14 22:14'
labels:
  - tech
  - 'est:S'
milestone: m-1
dependencies:
  - TASK-30.3
  - TASK-20.4
references:
  - docs/tech/frontend.md
  - docs/tech/contracts/C15-routes-deeplinks.md
parent_task_id: TASK-39
priority: high
ordinal: 218000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The mobile loop must be proven on a real dev build, not only in component tests (TASK-39 AC#4).

## Packet

Unblocks on: Mobile quick found or sighted report with offline queue merged (TASK-30.3); Mobile match review: compare, confirm, reject merged (TASK-20.4)
Contracts: C15 (in references); conventions in C1
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-39.2-e2e-mob
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Maestro flows on an Android dev build complete the found report and the match-confirm screens against the local stack.
- [ ] #2 The flows run from one documented command and record a video artifact.
<!-- AC:END -->
