---
id: TASK-114.28
title: 'e2e flake: lifecycle.spec.ts:52 finds the close toast inside main'
status: Done
assignee:
  - '@frontend-dev'
created_date: '2026-10-18 20:24'
updated_date: '2026-10-18 20:47'
labels:
  - bug
  - fe
  - 'est:XS'
  - trivial
  - no-design
dependencies: []
references:
  - apps/web/e2e/lifecycle.spec.ts
parent_task_id: TASK-114
priority: medium
ordinal: 368200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
CI verify on 35730f7a (2026-10-18) failed once in apps/web/e2e/lifecycle.spec.ts:52. getByRole('main').getByText('Iskanje je zaključeno.') resolved to 2 elements: the page note <p> and the toast in the region 'Obvestila alt+T', which sits inside main on the report page. Local runs passed 27/27 (--repeat-each=3), so it's timing-dependent. Fix the test to target the page's own note (e.g. getByRole('paragraph') with that text, or exclude the toast region). Don't change product code unless the toaster inside main is clearly wrong; if so, say so. Same pattern may exist for 'Ponovno odpri' and other lifecycle toasts in that spec.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 lifecycle.spec.ts targets the page note, not the toast, for every lifecycle message it checks
- [ ] #2 lifecycle.spec passes on main with --repeat-each=5
<!-- AC:END -->
