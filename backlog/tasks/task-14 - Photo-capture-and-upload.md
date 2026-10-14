---
id: TASK-14
title: Photo capture and upload
status: To Do
assignee:
  - '@tech-lead'
created_date: '2026-10-14 21:02'
labels:
  - story
  - 'req:FR-003'
milestone: m-1
dependencies:
  - TASK-6
  - TASK-8
priority: high
ordinal: 14000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Every report and pet profile starts with a photo; capture must be fast on a bad mobile connection and protect privacy by stripping metadata from published images.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given a phone or desktop, when the user takes or picks 1-5 photos, then they are resized client-side (long edge at most 1600 px, under 1 MB each), previewed and uploaded with progress and retry.
- [ ] #2 Given a photo with EXIF GPS and time, when selected, then location and time are offered as suggestions to the form and EXIF is stripped from the stored public copy.
- [ ] #3 Given a weak connection, when an upload fails, then the draft keeps the photos locally and resumes without data loss.
- [ ] #4 Given stored images, when accessed, then originals are private and derived public variants follow the storage contract, type and size are validated server-side and unreferenced uploads are cleaned up after 24 h.
- [ ] #5 Given an uploaded photo, when stored, then a photo-uploaded hook exists for AI extraction and embeddings (used from M3).
- [ ] #6 Given any displayed photo, when rendered, then it has alt text built from species, colour and area.
<!-- AC:END -->

## Packet

Unblocks on: photos schema and storage bucket policy contract (TASK-6); form and progress primitives (TASK-8)
