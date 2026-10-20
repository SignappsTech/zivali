---
id: TASK-1.3
title: >-
  GH#3: inconsistent line under text boxes (sometimes right under the text,
  sometimes >1 cm below)
status: To Do
assignee:
  - '@frontend-dev'
created_date: '2026-10-20 13:39'
labels:
  - bug
  - fe
  - 'est:S'
  - no-design
dependencies: []
references:
  - docs/design/system.md
parent_task_id: TASK-1
ordinal: 536200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
GitHub issue #3 (tester, 2026-10-19): a line appears under all text boxes, sometimes directly under the text and sometimes more than 1 cm below it. Find what draws it (a border on the field wrapper, a textarea min-height with a bottom border, a description/divider element) in the shared form field components, and make inputs follow the design system: no stray line; the input's own border only. If the design system does specify a line, make it consistent instead and say so in NOTES. Fix in the shared component so every form gets it; screenshot one form before/after (max 2 screenshots).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 No extra line under text inputs and textareas on the report, pet and profile forms at 390 and 1200 px, light and dark
- [ ] #2 Change is in the shared field component(s); component or DOM test guards it
<!-- AC:END -->
