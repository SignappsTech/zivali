---
id: TASK-114.46
title: >-
  Web toasts: one Toaster per layout, outside main (frontend.md Standards;
  CH-550)
status: To Do
assignee:
  - '@frontend-dev'
created_date: '2026-10-19 21:39'
labels:
  - fe
  - 'est:XS'
  - web
  - no-design
dependencies: []
references:
  - docs/tech/frontend.md§Standards
parent_task_id: TASK-114
priority: medium
ordinal: 505200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Decision CH-550: per-component sonner Toasters render inside <main>, so toast text duplicates page text in the main landmark (TASK-114.28 e2e flake). Public pages stay sonner-free.

## Packet
Unblocks on: -
Branch: agent/task-114.46-web-one-toaster
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The (app) and (admin) layouts and the /m page island each mount one sonner Toaster outside <main>; the per-component mounts go and components only call toast()
- [ ] #2 Public pages still ship no sonner (the auth notice toast stays lazy, TASK-9.9); script budgets unchanged; the TASK-114.28 e2e passes without duplicate text in main
<!-- AC:END -->
