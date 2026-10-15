---
id: TASK-106
title: >-
  Report PATCH: row lock against a racing close; pet species check on species
  change
status: In Progress
assignee:
  - '@backend-dev'
created_date: '2026-10-15 20:25'
updated_date: '2026-10-15 22:20'
labels:
  - be
  - 'est:XS'
dependencies:
  - TASK-29.2
references:
  - apps/api/domains/reports/reports.domain.ts
  - apps/api/domains/reports/reports.dao.ts
priority: medium
ordinal: 328000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Non-blocking findings from the TASK-29.2 review. (1) reports.dao.ts findWithRole doesn't lock the row, so a PATCH racing a close/reunite transition can write to a closed report. (2) reports.domain.ts updateReport: changing species on a lost report that has a pet_id skips the pet species check.

## Packet

Branch: agent/task-106-report-patch-lock
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 updateReport reads the report `FOR UPDATE` inside its transaction before the status/manager checks; a test races PATCH against a close and the PATCH gets GONE (or is serialised after it)
- [ ] #2 When fields.species is set and (fields.pet_id ?? report.pet_id) is set, the pet species check runs (VALIDATION on mismatch); test
<!-- AC:END -->

Branch: agent/TASK-106-lock-update-report
