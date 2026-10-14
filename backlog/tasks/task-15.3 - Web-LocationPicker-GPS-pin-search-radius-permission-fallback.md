---
id: TASK-15.3
title: 'Web LocationPicker: GPS, pin, search, radius, permission fallback'
status: To Do
assignee:
  - '@frontend-dev'
created_date: '2026-10-14 22:12'
updated_date: '2026-10-14 22:41'
labels:
  - fe
  - 'est:S'
milestone: m-1
dependencies:
  - TASK-15.2
  - TASK-15.1
references:
  - docs/tech/frontend.md
  - docs/tech/contracts/C6-location-geo-maps.md
  - docs/design/pages/P5-location-picker.md
parent_task_id: TASK-15
priority: high
ordinal: 151000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Reports need an accurate place and radius set quickly, while the public only ever sees a fuzzed area (FR-004).

## Packet

Unblocks on: Web MapView: MapLibre + OpenFreeMap, markers, clusters, areas, list alternative merged (TASK-15.2); Design: Location picker and fuzzed area (P5) approved (TASK-15.1)
Design: P5 docs/design/pages/P5-location-picker.md (mockup docs/design/mockups/P5-location-picker.html; TASK-15.1)
Copy: docs/content/pages/P5-location-picker.md
Contracts: C6 (in references); conventions in C1
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-15.3-picker-web
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 LocationPicker (web) supports GPS, drop or drag pin, place search (@zivali/api/geocode) and a radius control for lost and alert modes, per P5.
- [ ] #2 With location permission denied, pin and search still work and the screen explains why location helps.
- [ ] #3 An EXIF suggestion is offered as 'Use photo location'; points outside Slovenia show a notice but are accepted.
- [ ] #4 Search, radius and confirm are keyboard and screen-reader operable; axe 0 violations.
<!-- AC:END -->
