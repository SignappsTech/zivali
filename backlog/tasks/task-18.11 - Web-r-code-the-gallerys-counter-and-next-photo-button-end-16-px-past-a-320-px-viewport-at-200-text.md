---
id: TASK-18.11
title: >-
  Web /r/[code]: the gallery's counter and next-photo button end 16 px past a
  320 px viewport at 200% text
status: Done
assignee:
  - '@frontend-dev'
created_date: '2026-10-19 20:20'
updated_date: '2026-10-19 20:40'
labels:
  - bug
  - 'est:XS'
  - web
  - a11y
milestone: m-1
dependencies: []
parent_task_id: TASK-18
priority: medium
ordinal: 457200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Steps: live najdimo.si (1ce206002ec1), Playwright Chromium and WebKit, viewport 320x844, add style html { font-size: 200% !important }, open /r/zvsmkB5v (a report with several photos), measure getBoundingClientRect of the gallery controls.
Expected: nothing past the 320 px edge (WCAG 1.4.10; DoD 320 px and 200% text).
Actual: the live counter div '1 / 5' (left 64, right 336) and the button 'Naslednja fotografija' (left 248, right 336) end 16 px past the viewport, outside any overflow container, in both engines. At 390 px they fit. The thumbnail strip scrolls in its own container (fine). Separate from the ad overflow (TASK-18.10), which also scrolls the page at this size.
Severity: minor.

## Packet

Unblocks on: -
Branch: agent/task-18.11-gallery-320 from main
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 At 320 px with root text at 200%, the gallery controls of /r/zvsmkB5v (5 photos) end inside the viewport in Chromium and WebKit (no sideways scroll from the gallery)
<!-- AC:END -->
Branch: agent/task-18.10-r-200-text
