---
id: TASK-14.7
title: >-
  Web preparePhoto checks the 320 px short edge before scaling: a panorama fails
  at the API with a generic error
status: In Progress
assignee:
  - '@frontend-dev'
created_date: '2026-10-16 03:37'
updated_date: '2026-10-16 04:16'
labels:
  - bug
  - 'est:XS'
dependencies: []
parent_task_id: TASK-14
priority: low
ordinal: 343000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Story TASK-14 AC#1 (QA TASK-14.4). Steps: on /dev/photos (or the pet form) pick a panorama, e.g. 8000 x 400 px. apps/web/components/photos/prepare-photo.ts checks Math.min(image.width, image.height) < 320 on the original (400 passes), then encodes at scale 0.2 to 1600 x 80. POST /v1/photos answers 400 VALIDATION (CreatePhotoInput: short edge >= 320); use-photo-uploads failure() maps it to photos.failed without retry. Expected: 'too small' message at once (mobile prepare-photo.ts checks after scaling: 'so a panorama that ends up under 320 px on its short side is caught too'). Actual: a failed row with the generic upload failure text and a Retry that can never succeed. Found by code reading (no web build in this QA run). Severity: Low.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Web preparePhoto rejects a photo whose short edge is under 320 px after scaling to 1600 px (as mobile does) with photos.too_small, before any API call; unit test with e.g. an 8000 x 400 image
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Branch: agent/task-14.5-photo-fixes
<!-- SECTION:NOTES:END -->
