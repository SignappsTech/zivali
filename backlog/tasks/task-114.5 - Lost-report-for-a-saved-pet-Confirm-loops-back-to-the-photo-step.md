---
id: TASK-114.5
title: 'Lost report for a saved pet: Confirm loops back to the photo step'
status: In Progress
assignee:
  - '@backend-dev'
  - '@frontend-dev'
created_date: '2026-10-16 13:50'
updated_date: '2026-10-18 02:09'
labels:
  - bug
  - fe
  - be
  - 'est:S'
  - no-design
dependencies: []
parent_task_id: TASK-114
priority: high
ordinal: 360500
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Owner, 2026-10-16, on najdimo.si: add a pet (Moji ljubljenčki), press "Prijavi izgubljeno", the flow offers to add more photos, add them, go to the review ("confirmation") step, confirm: it goes back to the photo step. The report is never published; no message says why.

Evidence (api container logs, the hour before 13:50): repeated `POST /v1/reports` 400 and `PUT /v1/pets/:id/photos` 400 during the owner's test; one `POST /v1/reports` 201 in between. The request log has no error code or path for a 4xx, so the exact rule is not visible.

Client: apps/web/components/report-lost/lost-flow.tsx, the VALIDATION branch of the send error handler: a `photo_ids` path sends the user to the photos step (`return edit(target)`) without any error text, which is the silent loop.

Likely server causes to confirm first (reproduce locally: create a pet with photos, report it lost, add photos):
1. "Unknown or foreign photo" (reports.domain.ts setReportPhotos: `attached !== photo_ids.length`): ReportsDao.setPhotos attaches only photos with `report_id` = this report or (`owner_id`, `report_id: null`, `pet_id: null`). Any id in photo_ids that already belongs to the pet (pet_id set) or to an earlier report is refused. The same rule on the pet side (PetsDao.setPhotos) would explain the PUT /v1/pets/:id/photos 400s.
2. More than MAX_PHOTOS (5, packages/validation photos.schema.ts) once the pet's photos and the new ones are counted together.
3. The saved pet's photos step (C5) and the PhotoPicker drafts (`lost` vs `pet:<id>`) sharing or re-sending uploaded ids.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Root cause reproduced in a test (API route test and/or web flow test) for: saved pet with photos, report lost, add more photos, publish
- [x] #2 Reporting a saved pet lost with added photos publishes; the report shows the pet's photos and the added ones (within the 5-photo limit, with a clear message at the limit)
- [x] #3 Any VALIDATION on photo_ids shows a message on the photo step (e.g. "Ene od fotografij ni bilo mogoče dodati, odstranite jo in poskusite znova" / the limit), never a silent jump; SL and EN
- [x] #4 The pet photo save (PUT /v1/pets/:id/photos) works for the same photos; its 400 is fixed or explained to the user
- [x] #5 The API request log records the error code and the validation paths for 4xx responses (no values, no personal data), so the next case is visible in the logs
<!-- AC:END -->

## Packet

Branch: agent/task-114.5-lost-photos-loop
