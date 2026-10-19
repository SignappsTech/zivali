---
id: TASK-18.16
title: >-
  Mobile MapView: pin kind, Circle.status, tile status; P9 owner pin, area
  tints, S5 collapse (C6; CH-305, CH-410)
status: To Do
assignee:
  - '@frontend-dev'
created_date: '2026-10-19 21:40'
labels:
  - fe
  - 'est:S'
  - mobile
dependencies:
  - TASK-18.1
references:
  - docs/tech/frontend.md
  - docs/tech/contracts/C6-location-geo-maps.md§Shared map components
  - docs/design/pages/P9-report-detail.md
parent_task_id: TASK-18
priority: low
ordinal: 507200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Mobile side of the C6 MapView additions (web has Circle.status already).

## Packet
Unblocks on: design TASK-18.1 done
Branch: agent/task-18.16-mobile-mapview-pin-tiles
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Mobile Marker kind 'pin' (system §9) for the manager's own point on P9; Circle.status tints found and sighted areas
- [ ] #2 onTilesStatus('ready' | 'error') from the native map; P9 hides 'Odpri zemljevid' until ready and collapses on error
- [ ] #3 jest-expo tests
<!-- AC:END -->
