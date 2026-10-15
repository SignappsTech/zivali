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
  - bug
  - fe
  - 'est:S'
dependencies:
  - TASK-11.2
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
- [ ] #2 Mobile LCP ≤ 2.5 s and performance ≥ 0.9 in pnpm quality on /, /en, /zavetisca and a shelter page (moved from TASK-11.2 AC#8). First try font subsetting (latin + latin-ext only), font-display and preloading only the LCP weight; dropping the Bricolage opsz axis (−48 KB) needs design-lead sign-off via a CHANGE row. Lighthouse settings in lighthouserc may be adjusted only if documented (e.g. median of 3 runs), never by loosening the budgets.
- [ ] #3 Script transfer ≤ 256 KB on every public page, not only /zavetisca
<!-- AC:END -->
