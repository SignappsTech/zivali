---
id: TASK-29.18
title: >-
  API: lost radius 200 m to 5 km and clearable circumstances (C4, C6; CH-302,
  CH-341)
status: To Do
assignee:
  - '@backend-dev'
created_date: '2026-10-19 21:27'
labels:
  - be
  - 'est:XS'
  - web
dependencies: []
references:
  - docs/tech/backend.md
  - docs/tech/contracts/C6-location-geo-maps.md§Location payload
  - docs/tech/contracts/C4-reports-and-pets.md§REST
parent_task_id: TASK-29
priority: medium
ordinal: 475200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Decision CH-302: the lost radius follows the P5 picker (200 m to 5 km); both clients already stop at 5 km. Decision CH-341: PATCH can clear `circumstances`.

## Packet
Unblocks on: -
Branch: agent/task-29.18-radius-5km-clear-circumstances
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 `requested_radius_m` accepts 200 to 5000 on create and PATCH (above 5000 → VALIDATION on that path); stored rows are not migrated
- [ ] #2 PATCH /v1/reports/:code accepts `circumstances: null` (and an empty string) and clears the field; route tests for both rules; openapi.json regenerated
<!-- AC:END -->
