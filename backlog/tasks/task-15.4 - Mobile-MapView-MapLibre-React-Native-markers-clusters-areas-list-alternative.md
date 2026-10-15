---
id: TASK-15.4
title: >-
  Mobile MapView: MapLibre React Native, markers, clusters, areas, list
  alternative
status: In Progress
assignee:
  - '@frontend-dev'
created_date: '2026-10-14 22:13'
updated_date: '2026-10-15 22:12'
labels:
  - fe
  - 'est:M'
milestone: m-1
dependencies:
  - TASK-8.3
  - TASK-6.9
  - TASK-15.1
  - TASK-31.2
references:
  - docs/tech/frontend.md
  - docs/tech/contracts/C6-location-geo-maps.md
  - docs/design/pages/P4-map-list.md
  - docs/tech/contracts/C2-design-tokens.md
parent_task_id: TASK-15
priority: high
ordinal: 152000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The mobile Map tab, detail and pickers share one map component with the web props (C6).

## Packet

Unblocks on: Mobile UI kit: RN Reusables primitives styled to the design system, gallery screen merged (TASK-8.3); Contract clients in @zivali/api: auth, profiles, pets, reports, photos, geocode, matches merged (TASK-6.9); Design: Location picker and fuzzed area (P5) approved (TASK-15.1); Design: Map and list (browse) (P4) approved (TASK-31.2)
Design: P5 docs/design/pages/P5-location-picker.md (mockup docs/design/mockups/P5-location-picker.html; TASK-15.1); P4 docs/design/pages/P4-map-list.md (mockup docs/design/mockups/P4-map-list.html; TASK-31.2)
Copy: docs/content/pages/P5-location-picker.md; docs/content/pages/P4-map-list.md
Contracts: C6, C2 (in references); conventions in C1
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-15.4-mapview-mob
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 MapView implements the C6 props on mobile with @maplibre/maplibre-react-native (dev build) and buildMapStyle(mode).
- [ ] #2 Markers, clusters and areas follow docs/design/system.md §9 with accessible names; attribution is visible.
- [ ] #3 The textAlternative is reachable through an accessible list toggle; 500 seeded markers render smoothly on a mid-range Android device (screen recording).
<!-- AC:END -->
