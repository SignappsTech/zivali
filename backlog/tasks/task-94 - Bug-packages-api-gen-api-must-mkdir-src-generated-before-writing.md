---
id: TASK-94
title: 'Bug: packages/api gen:api must mkdir src/generated before writing'
status: To Do
assignee:
  - '@frontend-dev'
created_date: '2026-10-15 02:57'
labels:
  - fe
  - bug
  - trivial
  - 'est:XS'
dependencies: []
references:
  - packages/api
ordinal: 305000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
CH-66. gen:api writes into src/generated without creating it; fails on a clean checkout.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 gen:api succeeds on a clean checkout (no src/generated)
<!-- AC:END -->
