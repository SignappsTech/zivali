---
id: TASK-14.3
title: 'Mobile PhotoPicker: camera/gallery, resize, EXIF, drafts, upload with retry'
status: To Do
assignee:
  - '@frontend-dev'
created_date: '2026-10-14 22:12'
labels:
  - fe
  - 'est:M'
milestone: m-1
dependencies:
  - TASK-8.3
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
ordinal: 149000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Finders and owners mostly report from phones in the field, often on weak connections (FR-003).

## Packet

Unblocks on: Mobile UI kit: RN Reusables primitives styled to the design system, gallery screen merged (TASK-8.3); Contract clients in @zivali/api: auth, profiles, pets, reports, photos, geocode, matches merged (TASK-6.9); Design: Report found or sighted (no account) and manage page (P7) approved (TASK-30.1); Design: Report lost flow (P6) approved (TASK-29.1)
Design: P7 docs/design/pages/P7-report-found.md (mockup docs/design/mockups/P7-report-found.html; TASK-30.1); P6 docs/design/pages/P6-report-lost.md (mockup docs/design/mockups/P6-report-lost.html; TASK-29.1)
Copy: docs/content/pages/P7-*.md (content strategist; until it exists use clear SL and EN drafts and list the keys in your report); docs/content/pages/P6-*.md (content strategist; until it exists use clear SL and EN drafts and list the keys in your report)
Contracts: C5 (in references); conventions in C1
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-14.3-photos-mob
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 PhotoPicker (expo-image-picker) takes or picks 1–5 photos after the camera primer, with previews, progress and retry, per P6 and P7.
- [ ] #2 preparePhoto (mobile) reads EXIF GPS and time, re-encodes with expo-image-manipulator (≤ 1600 px, < 1 MB, 480 px thumbnail) and computes SHA-256; uploaded files carry no EXIF.
- [ ] #3 Drafts keep prepared files in the app document directory and resume after a failed upload or an app restart.
- [ ] #4 Denied camera permission falls back to the gallery; every photo has alt text from photoAlt().
<!-- AC:END -->
