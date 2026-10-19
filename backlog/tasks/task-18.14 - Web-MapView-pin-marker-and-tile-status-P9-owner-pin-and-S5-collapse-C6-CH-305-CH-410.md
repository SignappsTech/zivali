---
id: TASK-18.14
title: >-
  Web MapView: pin marker and tile status; P9 owner pin and S5 collapse (C6;
  CH-305, CH-410)
status: To Do
assignee:
  - '@frontend-dev'
created_date: '2026-10-19 21:35'
labels:
  - fe
  - 'est:S'
  - web
dependencies:
  - TASK-18.1
references:
  - docs/tech/frontend.md
  - docs/tech/contracts/C6-location-geo-maps.md§Shared map components
  - docs/design/pages/P9-report-detail.md
parent_task_id: TASK-18
priority: medium
ordinal: 493200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Decision CH-305/CH-410: the shared MapView gains the system §9 pin for the manager's own point and reports tile load and failure. The lost marker disc on the to-scale detail circle is a separate design question (design to confirm).

## Packet
Unblocks on: design TASK-18.1 done
Branch: agent/task-18.14-web-mapview-pin-tiles
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 `Marker.kind: 'pin'` draws the system §9 pin (48 px primary head with tail, paw); P9 uses it only for the manager's own stored point (`ReportOwnerView.location`) with 'Vidno samo vam'; the `me` dot stays for the device location and public markers are unchanged
- [ ] #2 MapView calls `onTilesStatus('ready')` once the style and first tiles have loaded and `onTilesStatus('error')` on a style or tile source error; P9 hides 'Odpri zemljevid' until ready and collapses the map block on error (S5)
- [ ] #3 Component tests for the pin and both tile states
<!-- AC:END -->
