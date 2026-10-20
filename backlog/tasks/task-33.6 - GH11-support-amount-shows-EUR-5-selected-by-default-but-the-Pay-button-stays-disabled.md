---
id: TASK-33.6
title: >-
  GH#11: support amount shows EUR 5 selected by default but the Pay button stays
  disabled
status: To Do
assignee:
  - '@frontend-dev'
created_date: '2026-10-20 13:38'
labels:
  - bug
  - fe
  - 'est:XS'
  - no-design
dependencies: []
references:
  - apps/web/components/support/amount-ask.tsx
parent_task_id: TASK-33
priority: high
ordinal: 533200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
GitHub issue #11 (tester, 2026-10-20): on the profile page under 'Help us improve Najdimo' the EUR 5 amount looks selected by default but Pay is disabled until the person picks an amount again. Either the default is really selected (form state = 5, Pay enabled) or nothing looks selected; the look and the state must agree. Prefer a real default of 5 if the design shows one selected (check the support slice).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 With the default amount shown selected, Pay is enabled and starts checkout with that amount (component test)
- [ ] #2 Look and form state agree in every case (no 'selected' style without a value)
<!-- AC:END -->
