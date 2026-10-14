---
id: TASK-15.2
title: >-
  Web MapView: MapLibre + OpenFreeMap, markers, clusters, areas, list
  alternative
status: To Do
assignee:
  - '@frontend-dev'
created_date: '2026-10-14 22:12'
labels:
  - fe
  - 'est:M'
milestone: m-1
dependencies:
  - TASK-8.2
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
ordinal: 150000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Browse, detail, pickers and alerts share one map component with the same props on both platforms (C6); P4 defines the markers.

## Packet

Unblocks on: Web UI kit: shadcn primitives styled to the design system, /dev/kit gallery merged (TASK-8.2); Contract clients in @zivali/api: auth, profiles, pets, reports, photos, geocode, matches merged (TASK-6.9); Design: Location picker and fuzzed area (P5) approved (TASK-15.1); Design: Map and list (browse) (P4) approved (TASK-31.2)
Design: P5 docs/design/pages/P5-location-picker.md (mockup docs/design/mockups/P5-location-picker.html; TASK-15.1); P4 docs/design/pages/P4-map-list.md (mockup docs/design/mockups/P4-map-list.html; TASK-31.2)
Copy: docs/content/pages/P5-*.md (content strategist; until it exists use clear SL and EN drafts and list the keys in your report); docs/content/pages/P4-*.md (content strategist; until it exists use clear SL and EN drafts and list the keys in your report)
Contracts: C6, C2 (in references); conventions in C1
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-15.2-mapview-web
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 MapView implements the C6 props on web with maplibre-gl loaded dynamically (not in the initial bundle) and buildMapStyle(mode) from @zivali/tokens.
- [ ] #2 Markers follow docs/design/system.md §9 (photo avatars with status ring, lost as fuzzed area disc, clusters as count discs, you dot) with icons and accessible names, so status is never colour alone.
- [ ] #3 The required textAlternative renders an accessible list; the map is keyboard operable (arrows pan, +/- zoom) and attribution is always visible.
- [ ] #4 500 seeded markers render with clustering within 2 s on a throttled 4G profile (Playwright trace attached).
<!-- AC:END -->
