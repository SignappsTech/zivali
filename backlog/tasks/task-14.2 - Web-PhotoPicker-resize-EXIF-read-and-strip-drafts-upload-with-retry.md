---
id: TASK-14.2
title: 'Web PhotoPicker: resize, EXIF read and strip, drafts, upload with retry'
status: In Progress
assignee:
  - '@frontend-dev'
created_date: '2026-10-14 22:12'
updated_date: '2026-10-15 05:18'
labels:
  - fe
  - 'est:M'
milestone: m-1
dependencies:
  - TASK-8.2
  - TASK-6.9
  - TASK-30.1
  - TASK-29.1
references:
  - docs/tech/frontend.md
  - docs/tech/contracts/C5-photos-storage.md
  - docs/design/pages/P7-report-found.md
  - docs/design/system.md
parent_task_id: TASK-14
priority: high
ordinal: 148000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Every report starts with a photo; capture must be fast on a weak connection and never publish metadata (FR-003).

## Packet

Unblocks on: Web UI kit: shadcn primitives styled to the design system, /dev/kit gallery merged (TASK-8.2); Contract clients in @zivali/api: auth, profiles, pets, reports, photos, geocode, matches merged (TASK-6.9); Design: Report found or sighted (no account) and manage page (P7) approved (TASK-30.1); Design: Report lost flow (P6) approved (TASK-29.1)
Design: P7 docs/design/pages/P7-report-found.md (mockup docs/design/mockups/P7-report-found.html; TASK-30.1); P6 docs/design/pages/P6-report-lost.md (mockup docs/design/mockups/P6-report-lost.html; TASK-29.1)
Copy: docs/content/pages/P7-report-found.md; docs/content/pages/P6-report-lost.md
Contracts: C5 (in references); conventions in C1
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-14.2-photos-web
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 PhotoPicker lets the user take or pick 1–5 photos (camera on phones), shows previews and per-photo upload progress with retry, per the photo steps in P6 and P7.
- [ ] #2 preparePhoto (web) reads EXIF GPS and time first, re-encodes to JPEG with a long edge ≤ 1600 px and < 1 MB plus a 480 px thumbnail and computes SHA-256; the uploaded file has no EXIF (test with a 6 MB fixture).
- [ ] #3 Drafts keep prepared photos in IndexedDB; after a dropped connection the upload resumes without re-selecting.
- [ ] #4 Unsupported formats show a clear message; server rejections map to localised errors; every displayed photo uses photoAlt() alt text.
<!-- AC:END -->
