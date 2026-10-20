---
id: TASK-27.9
title: >-
  GH#10: home hero: the hover background of 'Sighted animal' nearly touches the
  'Seen an animal?' text
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
  - docs/design/system.md
parent_task_id: TASK-27
ordinal: 534200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
GitHub issue #10 (tester, 2026-10-20): in the home hero, hovering 'Sighted animal' (Opazil sem žival) draws a hover background that comes too close to the adjacent 'Seen an animal?' text. Add spacing per the design tokens (no new colours or sizes) so the hover/focus area has clear space around it at 390 and 1200 px, light and dark, without changing the layout otherwise; keep 44 px targets.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Hover and focus backgrounds keep at least the token spacing from adjacent text at 390 and 1200 px (DOM check)
- [ ] #2 No other change to the hero layout
<!-- AC:END -->
