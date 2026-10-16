---
id: TASK-31.5
title: Mobile Map tab with list sheet and filters
status: In Progress
assignee:
  - '@frontend-dev'
created_date: '2026-10-14 22:14'
updated_date: '2026-10-16 00:10'
labels:
  - fe
  - 'est:M'
milestone: m-1
dependencies:
  - TASK-15.4
  - TASK-12.2
  - TASK-6.9
  - TASK-31.2
references:
  - docs/tech/frontend.md
  - docs/tech/contracts/C4-reports-and-pets.md
  - docs/design/pages/P4-map-list.md
  - docs/tech/contracts/C17-mobile-offline-data.md
parent_task_id: TASK-31
priority: high
ordinal: 208000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The Map tab is the app home; the bottom-sheet list is its accessible alternative (FR-007).

## Packet

Unblocks on: Mobile MapView: MapLibre React Native, markers, clusters, areas, list alternative merged (TASK-15.4); Mobile shell: tabs, Report action, permission primer, settings stack merged (TASK-12.2); Contract clients in @zivali/api: auth, profiles, pets, reports, photos, geocode, matches merged (TASK-6.9); Design: Map and list (browse) (P4) approved (TASK-31.2)
Design: P4 docs/design/pages/P4-map-list.md (mockup docs/design/mockups/P4-map-list.html; TASK-31.2)
Copy: docs/content/pages/P4-map-list.md
Contracts: C4, C6 (in references); conventions in C1
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-31.5-browse-mob
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The Map tab shows clustered reports with a bottom-sheet list (@gorhom/bottom-sheet) as the accessible alternative, per P4.
- [x] #2 Filters (type, species, distance, date range, colour, size) narrow map and list and show counts with correct SL plurals.
- [x] #3 Boosted reports first, closed excluded by default, empty state with Report and Set alert, and an insertion point for ad cards.
- [x] #4 Map, list and report screens read reports only through lib/data/reports.ts hooks (C17 data seam), so the offline cache plugs in without screen changes.
- [x] #5 The map calls setCacheArea('current', point) with the last foreground location (TASK-85.2 offline cache), so the current area is cached for offline use.
<!-- AC:END -->
