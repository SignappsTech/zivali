---
id: TASK-30.10
title: >-
  Report submit fails with VALIDATION photo_ids after re-using a photo (6 failed
  submits on staging)
status: In Progress
assignee:
  - '@backend-dev'
created_date: '2026-10-20 12:57'
updated_date: '2026-10-20 13:10'
labels:
  - bug
  - be
  - 'est:S'
dependencies: []
references:
  - docs/tech/backend.md
  - docs/tech/contracts/C4-reports-and-pets.md
parent_task_id: TASK-30
priority: high
ordinal: 528200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
API log on najdimo.si 2026-10-20 09:12-09:17 UTC: POST /v1/reports answered 400 error_code VALIDATION error_paths [photo_ids] six times in a row before a submit went through; the attempts follow POST /v1/photos answering 200 (not 201), i.e. a photo the API already had, and two DELETE /v1/pets/:id. reports.domain.ts:267 / reports.dao.ts:519-523 refuse a photo id that is not the caller's or is already on another report (attached !== photo_ids.length). Find the real path (reproduce with API tests on a scratch DB): which upload answers 200 with an existing photo id (same-hash dedupe? a photo of a deleted pet? a photo already on another report?), and why the client then sends an id the report route refuses. Fix at the root so that re-using a photo either works (a fresh photo row / copy for the new report) or the API answers a specific code the web shows plainly, not a generic photo error. Contract changes go to the CHANGE inbox (C3/C4 owner tech-lead).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 An API test reproduces the refused submit from the staging sequence (upload a photo that is already on another report or on a deleted pet, then POST /v1/reports with it) and passes after the fix
- [ ] #2 Re-using the same photo file for a new report either succeeds or returns a specific documented error code; never a bare VALIDATION photo_ids for a photo the user just uploaded
- [ ] #3 No change to the anonymous-report held rule on a photo-hash match (submission-guard.ts) unless documented in a CHANGE row
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Packet
Branch: agent/TASK-30.10-photo-reuse-submit
<!-- SECTION:NOTES:END -->
