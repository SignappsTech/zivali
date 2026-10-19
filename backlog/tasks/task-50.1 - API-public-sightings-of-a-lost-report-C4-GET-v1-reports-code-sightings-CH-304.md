---
id: TASK-50.1
title: >-
  API: public sightings of a lost report (C4 GET /v1/reports/:code/sightings;
  CH-304)
status: To Do
assignee:
  - '@backend-dev'
created_date: '2026-10-19 21:31'
labels:
  - be
  - 'est:XS'
  - web
dependencies:
  - TASK-18.12
references:
  - docs/tech/backend.md
  - docs/tech/contracts/C4-reports-and-pets.md§Public read model
parent_task_id: TASK-50
priority: medium
ordinal: 482200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Decision CH-304: P9 'Opažanja' and the sighting dots read the found and sighted reports linked to a lost report.

## Packet
Unblocks on: TASK-18.12 merged (reports.area_label)
Branch: agent/task-50.1-report-sightings-api
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 `GET /v1/reports/:code/sightings` (optionalAuth) returns visible found and sighted reports with `linked_report_id` = the lost report, newest `event_at` first, at most 50, each `{ short_code, type, event_at, area, area_label, thumb_url }`; a report that is not lost → VALIDATION; unknown NOT_FOUND; removed GONE
- [ ] #2 Tests: held, hidden and removed sightings are absent; no exact point or chip in the answer; openapi.json and `gen:api`
<!-- AC:END -->
