---
id: TASK-14.8
title: >-
  Mobile: picked photos beyond the 5-photo room keep their picker cache copy
  with full EXIF and GPS
status: Done
assignee:
  - '@frontend-dev'
created_date: '2026-10-16 03:37'
updated_date: '2026-10-16 05:08'
labels:
  - bug
  - 'est:XS'
dependencies: []
parent_task_id: TASK-14
priority: low
ordinal: 344000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Story TASK-14 AC#2 (QA TASK-14.4; focus: picked originals with full EXIF are deleted). Steps: gallery returns more assets than the room (Android without the system photo picker ignores selectionLimit; jest photos.test 'keeps at most 5 photos' feeds 7). apps/mobile/components/photos/use-photo-uploads.ts add() slices assets to the room; only preparePhoto deletes the source copy (prepare-photo.ts finally block), so the dropped assets stay in the app cache with EXIF GPS and time until the OS clears it. Expected: no original copy outlives the pick. Actual: the extra copies are never deleted. Needs a device to confirm which Android versions return more than selectionLimit. Severity: Low (privacy, on-device only).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 usePhotoUploads add() deletes the expo-image-picker cache copy (under Paths.cache) of every asset it does not prepare (over the 5-photo room); the jest 'keeps at most 5 photos' case asserts assets 6 and 7 are deleted
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Branch: agent/task-14.5-photo-fixes
<!-- SECTION:NOTES:END -->
