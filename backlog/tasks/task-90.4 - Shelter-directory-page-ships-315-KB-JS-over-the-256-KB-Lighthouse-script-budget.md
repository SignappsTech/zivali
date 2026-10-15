---
id: TASK-90.4
title: >-
  Shelter directory page ships 315 KB JS, over the 256 KB Lighthouse script
  budget
status: To Do
assignee:
  - '@frontend-dev'
created_date: '2026-10-15 10:24'
labels:
  - 'bug fe est:S'
dependencies: []
parent_task_id: TASK-90
ordinal: 317000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Steps: pnpm quality on main with the e2e mock API. Expected: resource-summary.script.size <= 256000 and performance >= 0.9 for /zavetisca. Actual: /zavetisca script 315261 B (home and shelter detail 287607 B, shared shell also over budget); perf 0.75-0.79 on /zavetisca, LCP 2.5-2.8 s (budget 2.5 s). Perf and LCP were measured with other quality runs in parallel so may be noisy; the script size is deterministic. The search combobox adds about 27 KB over the baseline: lazy-load or slim it. Severity: medium (quality gate fails).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 pnpm quality Lighthouse passes for /zavetisca (script transfer size <= 256000 B)
<!-- AC:END -->
