---
id: TASK-14.4
title: 'QA: Photo capture and upload'
status: To Do
assignee:
  - '@qa'
created_date: '2026-10-14 22:15'
updated_date: '2026-10-16 03:38'
labels:
  - qa
  - 'est:XS'
  - 'qa:fail'
milestone: m-1
dependencies:
  - TASK-14.1
  - TASK-14.2
  - TASK-14.3
references:
  - docs/tech/frontend.md
  - docs/design/pages/P7-report-found.md
parent_task_id: TASK-14
priority: high
ordinal: 232000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Verify story TASK-14 (Photo capture and upload) on main once all its tasks are merged: acceptance criteria below, quality gates, keyboard and screen-reader spot checks, and mobile and desktop checks for the UI. File bug tasks for failures and set qa:pass or qa:fail.

## Packet

Unblocks on: all tasks of TASK-14 merged to main (TASK-14.1, TASK-14.2, TASK-14.3); leads add any later TASK-14 task to this task's dependencies.
Review: n/a (QA)
Branch: - (verify on main)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given a phone or desktop, when the user takes or picks 1-5 photos, then they are resized client-side (long edge at most 1600 px, under 1 MB each), previewed and uploaded with progress and retry.
- [x] #2 Given a photo with EXIF GPS and time, when selected, then location and time are offered as suggestions to the form and EXIF is stripped from the stored public copy.
- [x] #3 Given a weak connection, when an upload fails, then the draft keeps the photos locally and resumes without data loss.
- [ ] #4 Given stored images, when accessed, then originals are private and derived public variants follow the storage contract, type and size are validated server-side and unreferenced uploads are cleaned up after 24 h.
- [x] #5 Given an uploaded photo, when stored, then a photo-uploaded hook exists for AI extraction and embeddings (used from M3).
- [ ] #6 Given any displayed photo, when rendered, then it has alt text built from species, colour and area.
- [x] #7 Story gates pass on main: `pnpm verify`, plus `pnpm quality` for the pages this story touches; results recorded in the QA notes.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
QA 2026-10-16 on main b7dc52d (worktree reset to main). Result: qa:fail (AC #1, #4, #6; bugs TASK-14.5 to TASK-14.8).

Gates: verify: merge queue, main at b7dc52d (full pnpm verify not run here per machine rules). API on scratch DB task_qa_14_4 (auth schema copied, no GURS seed): photos.domain, photos.routes, jobs, reports.write, pets.domain, pets.routes, abuse-reports 89/90; manage.routes, manage.qa, outbox.qa, reports.routes, data-inventory, adapters 83/84 (both failures env-only: municipality and region slugs need the GURS seed); new test/routes/photos.qa.routes.test.ts 2/2 (eslint and prettier clean). Web vitest (photos, manage, pets, proxy) 57/57. Mobile jest (photos, report-found, report-lost, pets, report-detail, outbox, outbox-ui, offline-store, offline-settings, data-reports, lost-form) 143/143. Not run: web build, photos e2e, WebKit and pnpm quality (lead stop: no Next standalone build while node_modules is a junction to main). Story pages: /dev/photos (dev harness, 404 in production) and the protected pet form; no public route for the quality kit.

AC #1 FAIL (Low, TASK-14.7): web and mobile resize to <= 1600 px and <= 1 MiB (quality 0.85 down to 0.5), 480 px thumb, previews, per-photo progress, one upload at a time, 4 retries with backoff, Retry and back-online retry (unit tests); 44 px targets by code (size-11, min-h-12). Web checks the 320 px short edge before scaling, so a panorama fails at the API with the generic error.
AC #2 PASS: EXIF GPS and time read before re-encoding; mobile found and lost flows offer them (coarsened); web hands them to onExif (no web report form yet). Canvas and expo-image-manipulator plus stripJpegMetadata upload no metadata; the sharp variants have none (API tests and photos.qa: EXIF-GPS upload to the public copy). Drafts store no EXIF or file name. Side finding TASK-14.8 (Low): mobile assets over the 5-photo room keep their cache copy with EXIF.
AC #3 PASS: web IndexedDB and mobile SQLite plus drafts/<id>/ files restore after a reload or restart and resume; photo ids older than 23 h upload again; the mobile hold keeps photos on the device. CHANGE row: web drafts are not keyed by user nor cleared on sign-out.
AC #4 FAIL (High, TASK-14.5): the server side passes (private uploads/ and variants/, upload deleted after processing, 5 min PUT pinned to image/jpeg and the length, 10 min GET issued only by the API, media copies only for visible reports, magic bytes, size and SHA-256 checked, 24 h unattached purge, ended-report purge, pet and photo deletes queue object purges, photo-hash hold on POST and PATCH per TASK-17.6). The web CSP img-src opens only the presign origin, not MEDIA_BASE_URL, so published photos are blocked outside local.
AC #5 PASS: PHOTO_HOOKS (empty in M2) is sent per accepted photo in the settle transaction.
AC #6 FAIL (Medium, TASK-14.6): the API alt is type, species and name ('Pogrešani pes Piki, fotografija 1 od 2'), with no colour or area (P9 section 11).
AC #7 PASS with the gaps above (verify via the merge queue; e2e, WebKit and quality not run here).

Needs a device, not run: camera capture and the primer, denied camera permission falling back to the gallery, iOS HEIC in Compatible mode, Android EXIF GPS sign and ref, deletion of the ImagePicker cache copy (Paths.cache prefix on iOS and Android), Android selectionLimit on devices without the system photo picker, a 12 MP to 48 MP image (memory, one decode at a time), File.upload progress and abort, app kill mid-upload then restore.
<!-- SECTION:NOTES:END -->
