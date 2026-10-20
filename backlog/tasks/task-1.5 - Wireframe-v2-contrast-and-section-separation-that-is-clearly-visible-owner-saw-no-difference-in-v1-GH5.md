---
id: TASK-1.5
title: >-
  Wireframe v2: contrast and section separation that is clearly visible (owner
  saw no difference in v1, GH#5)
status: To Do
assignee:
  - '@design-lead'
created_date: '2026-10-20 15:29'
labels:
  - design
  - 'est:S'
dependencies: []
references:
  - docs/design/wireframes/M-contrast-separation.html
  - docs/design/system.md
parent_task_id: TASK-1
priority: high
ordinal: 547200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Owner feedback 2026-10-20 on docs/design/wireframes/M-contrast-separation.html v1 (TASK-1.4): 'I see no difference in contrasts'. v1 kept every text pair (already AA) and only nudged dark surfaces (card 1.10:1 -> small step), so the change is invisible to the owner. Make v2 a clearly visible step: noticeably lighter card and section surfaces in dark (and clearer separation in light), visible 1 px edges, filled or boxed input fields that read as inputs at a glance, section dividers; show current and proposed side by side on the same screen (not only a toggle), in light and dark, at 390 and 1200 px, on home, a report-lost form step and report detail. Include the textarea decision (GH#3: keep 96 px as a boxed field). Keep WCAG AA. No implementation until the owner approves v2.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 v2 in docs/design/wireframes/ shows current and proposed side by side so the difference is obvious at a glance, light and dark, 390 and 1200 px
- [ ] #2 Contrast table for every changed pair (AA or better) and the token diff vs today
- [ ] #3 Owner approval (who, date, version) recorded before any implementation task starts
<!-- AC:END -->
