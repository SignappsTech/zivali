---
id: TASK-18.17
title: >-
  GH#2: shelter page 'Open in maps' opens OpenStreetMap; open Google Maps so
  people can navigate
status: To Do
assignee:
  - '@frontend-dev'
created_date: '2026-10-20 13:38'
updated_date: '2026-10-20 13:52'
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
GitHub issue #2 (tester, 2026-10-19): 'Open in maps' (Odpri v zemljevidu) opens the location on OpenStreetMap; it should open Google Maps so people can navigate. The only such link is the shelter page address link (apps/web/app/[locale]/(public)/shelters/[slug]/page.tsx:79, an OSM address search). Switch it to the Google Maps URLs API with the same address text: https://www.google.com/maps/search/?api=1&query=<encoded address>. Opens the app on phones and the site on desktop. Keep the new-tab label and rel as today. Map tiles and the OSM copyright links stay.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The shelter page 'Open in maps' link points to https://www.google.com/maps/search/?api=1&query=<encoded shelter address> (pages.test.tsx updated)
- [ ] #2 New-tab label and rel unchanged; no other OSM link changes
<!-- AC:END -->
