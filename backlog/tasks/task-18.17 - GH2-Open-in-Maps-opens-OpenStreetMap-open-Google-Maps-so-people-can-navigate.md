---
id: TASK-18.17
title: >-
  GH#2: 'Open in Maps' opens OpenStreetMap; open Google Maps so people can
  navigate
status: To Do
assignee:
  - '@frontend-dev'
created_date: '2026-10-20 13:38'
labels:
  - fe
  - 'est:XS'
  - no-design
dependencies: []
references:
  - apps/web/components/map/map-view.tsx
parent_task_id: TASK-18
ordinal: 535200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
GitHub issue #2 (tester, 2026-10-19): 'Open in Maps' on a report opens the location on OpenStreetMap; it should open Google Maps so people can navigate. Use the Google Maps URLs API (https://www.google.com/maps/search/?api=1&query=<lat>,<lng>), which opens the app on phones and the site on desktop, with the same coarsened public point the link uses today (never the exact point). Keep rel/target as today. Map tiles stay OSM; only the outbound link changes.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Every 'Open in Maps' link points to https://www.google.com/maps/search/?api=1&query=<public lat>,<public lng> (test)
- [ ] #2 The point is the public (coarsened) point, unchanged
<!-- AC:END -->
