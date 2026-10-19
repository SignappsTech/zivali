---
id: TASK-18.15
title: >-
  Mobile P9 and P14: area_label, posted-by, sightings, disagree note, story
  consent (C4; CH-304, CH-340, CH-341)
status: To Do
assignee:
  - '@frontend-dev'
created_date: '2026-10-19 21:40'
labels:
  - fe
  - 'est:M'
  - mobile
dependencies:
  - TASK-18.12
  - TASK-26.10
  - TASK-26.11
  - TASK-50.1
  - TASK-18.1
references:
  - docs/tech/frontend.md
  - docs/tech/contracts/C4-reports-and-pets.md§Public read model
  - docs/tech/contracts/C17-mobile-offline-data.md§Local schema
  - docs/design/pages/P9-report-detail.md
parent_task_id: TASK-18
priority: low
ordinal: 506200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Mobile side of the C4 additions; the mobile screens leave these out or reverse-geocode today.

## Packet
Unblocks on: TASK-18.12, TASK-26.10, TASK-26.11 and TASK-50.1 merged; design TASK-18.1 done
Branch: agent/task-18.15-mobile-p9-read-model
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The detail and app/m.tsx name the area from `area_label` (no POST /v1/geo/reverse); a C17 migration adds `reports_cache.area_label`, filled from the sync feed
- [ ] #2 The posted-by line from `source`; the sightings list from GET /v1/reports/:code/sightings
- [ ] #3 `reunited_via: 'counterpart'` shows the owner-disagree note with Reopen; the story switch saves through PUT story-consent; the reopen days come from public config
- [ ] #4 jest-expo tests
<!-- AC:END -->
