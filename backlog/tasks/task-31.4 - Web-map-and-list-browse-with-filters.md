---
id: TASK-31.4
title: Web map and list browse with filters
status: In Progress
assignee:
  - '@frontend-dev'
created_date: '2026-10-14 22:14'
updated_date: '2026-10-16 03:35'
labels:
  - fe
  - 'est:M'
milestone: m-1
dependencies:
  - TASK-15.2
  - TASK-11.2
  - TASK-6.9
  - TASK-31.2
references:
  - docs/tech/frontend.md
  - docs/tech/contracts/C4-reports-and-pets.md
  - docs/design/pages/P4-map-list.md
  - docs/tech/contracts/C6-location-geo-maps.md
parent_task_id: TASK-31
priority: high
ordinal: 207000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
People look for pets by place first; the list is the full accessible alternative to the map (FR-007).

## Packet

Unblocks on: Web MapView: MapLibre + OpenFreeMap, markers, clusters, areas, list alternative merged (TASK-15.2); Web shell: header, footer, layout, route groups and guards, shared states merged (TASK-11.2); Contract clients in @zivali/api: auth, profiles, pets, reports, photos, geocode, matches merged (TASK-6.9); Design: Map and list (browse) (P4) approved (TASK-31.2)
Design: P4 docs/design/pages/P4-map-list.md (mockup docs/design/mockups/P4-map-list.html; TASK-31.2)
Copy: docs/content/pages/P4-map-list.md
Contracts: C4, C6 (in references); conventions in C1
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-31.4-browse-web
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The map page shows clustered LOST, FOUND and SIGHTED reports in view (fuzzed areas, icon plus colour) within 2 s for 500 reports on throttled 4G, per P4.
- [ ] #2 The list shows the same results by distance or recency with pagination and is the full keyboard and screen-reader alternative to the map.
- [ ] #3 Filters (type, species, distance, date range, colour, size) narrow map and list, persist in the URL and show counts with correct SL plural forms.
- [ ] #4 Boosted reports sort first and are highlighted; closed reports are excluded by default; empty regions show 'Report' and 'Set alert' actions; the list exposes an insertion point for ad cards.
<!-- AC:END -->
