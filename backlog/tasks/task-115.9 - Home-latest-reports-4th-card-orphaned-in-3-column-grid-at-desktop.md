---
id: TASK-115.9
title: 'Home latest reports: 4th card orphaned in 3-column grid at desktop'
status: To Do
assignee:
  - '@frontend-dev'
created_date: '2026-10-19 01:57'
labels:
  - bug
  - fe
  - 'est:XS'
dependencies: []
parent_task_id: TASK-115
priority: low
ordinal: 409200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Live najdimo.si and /en at 1440 (light and dark): the Nedavne prijave grid is 3 columns (approved wireframe A: repeat(3,1fr), gap 24) but renders 4 cards, so card 4 sits alone on a second row with 2/3 empty space. Mobile strip (4 cards) is fine. Fix: show 3 cards from md up (hide the 4th, e.g. hidden md:block off, or max 3 in grid) or make the grid 4 columns if the owner prefers; keep the 4-card strip at 390. Source: wireframe P3-home.html v1 .a-cards. Found in TASK-115.6 visual QA 2026-10-19.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 At 1440 and 1024 the latest-reports grid has no orphan row (3 cards in a row, or 4 in a row)
- [ ] #2 Mobile strip unchanged
<!-- AC:END -->
