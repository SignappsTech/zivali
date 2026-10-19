---
id: TASK-18.7
title: >-
  Web MapView: the focused map canvas shows no focus ring (outline-none cancels
  outline-3)
status: In Progress
assignee:
  - '@frontend-dev'
created_date: '2026-10-19 18:38'
updated_date: '2026-10-19 18:43'
labels:
  - bug
  - 'est:XS'
  - web
  - a11y
dependencies: []
parent_task_id: TASK-18
priority: medium
ordinal: 440200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Steps: https://najdimo.si/r/zvsmkB5v at 1440x900, Tab past "Preskoci zemljevid" until the map <canvas> has focus (Chromium 1.64 Playwright).
Expected: a visible focus indicator on the map (map-view.tsx:287 wants [&_canvas:focus-visible]:outline-3 outline-ring, inset).
Actual: computed outline-style none, width 3px, no box-shadow on the canvas or any of its 5 ancestors; screenshot shows no ring. Likely Tailwind 4: [&_canvas]:outline-none sets --tw-outline-style:none and outline-3 reads var(--tw-outline-style), so the style stays none. Fix: e.g. [&_canvas:focus-visible]:outline-solid.
Severity: major (WCAG 2.4.7 AA, keyboard users lose focus on the map).

## Packet

Unblocks on: -
Branch: agent/TASK-18.7-map-focus
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Tabbing to the map canvas on /r/<code> (and /zemljevid) shows a visible 3 px ring in the ring colour (WCAG 2.4.7)
<!-- AC:END -->
