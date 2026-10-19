---
id: TASK-50.2
title: 'Web P9: sightings list and map dots (C4 sightings; CH-304)'
status: To Do
assignee:
  - '@frontend-dev'
created_date: '2026-10-19 21:35'
labels:
  - fe
  - 'est:S'
  - web
dependencies:
  - TASK-50.1
  - TASK-18.1
references:
  - docs/tech/frontend.md
  - docs/tech/contracts/C4-reports-and-pets.md§REST
  - docs/design/pages/P9-report-detail.md
  - docs/content/pages/P9-report-detail.md
parent_task_id: TASK-50
priority: medium
ordinal: 494200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
P9 'Where it was seen': the sightings linked to a lost report, as plain rows and as markers on the detail map.

## Packet
Unblocks on: TASK-50.1 (GET /v1/reports/:code/sightings) merged; design TASK-18.1 done
Branch: agent/task-50.2-web-p9-sightings
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A lost report's detail lists its sightings from GET /v1/reports/:code/sightings in 'Where it was seen' (time and area label rows, newest first) and draws them as sighted or found markers on the detail map; no sightings hides the list
- [ ] #2 The map's text alternative lists them; component tests; e2e on a seeded lost report with a linked sighting
<!-- AC:END -->
