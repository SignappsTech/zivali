---
id: TASK-14.4
title: 'QA: Photo capture and upload'
status: To Do
assignee:
  - '@qa'
created_date: '2026-10-14 22:15'
labels:
  - qa
  - 'est:XS'
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
- [ ] #2 Given a photo with EXIF GPS and time, when selected, then location and time are offered as suggestions to the form and EXIF is stripped from the stored public copy.
- [ ] #3 Given a weak connection, when an upload fails, then the draft keeps the photos locally and resumes without data loss.
- [ ] #4 Given stored images, when accessed, then originals are private and derived public variants follow the storage contract, type and size are validated server-side and unreferenced uploads are cleaned up after 24 h.
- [ ] #5 Given an uploaded photo, when stored, then a photo-uploaded hook exists for AI extraction and embeddings (used from M3).
- [ ] #6 Given any displayed photo, when rendered, then it has alt text built from species, colour and area.
- [ ] #7 Story gates pass on main: `pnpm verify`, plus `pnpm quality` for the pages this story touches; results recorded in the QA notes.
<!-- AC:END -->
