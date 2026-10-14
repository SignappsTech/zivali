---
id: TASK-29.5
title: Mobile report-lost flow
status: To Do
assignee:
  - '@frontend-dev'
created_date: '2026-10-14 22:14'
updated_date: '2026-10-14 22:42'
labels:
  - fe
  - 'est:M'
milestone: m-1
dependencies:
  - TASK-16.5
  - TASK-14.3
  - TASK-15.5
  - TASK-6.9
  - TASK-7.1
  - TASK-29.1
references:
  - docs/tech/frontend.md
  - docs/tech/contracts/C4-reports-and-pets.md
  - docs/design/pages/P6-report-lost.md
  - docs/tech/contracts/C6-location-geo-maps.md
parent_task_id: TASK-29
priority: high
ordinal: 203000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Most owners report a loss from their phone (FR-005).

## Packet

Unblocks on: Mobile PetFields form section (shared by pet profiles and the lost flow) merged (TASK-16.5); Mobile PhotoPicker: camera/gallery, resize, EXIF, drafts, upload with retry merged (TASK-14.3); Mobile LocationPicker: GPS, pin, search, radius, permission fallback merged (TASK-15.5); Contract clients in @zivali/api: auth, profiles, pets, reports, photos, geocode, matches merged (TASK-6.9); packages/analytics: typed track(), event registry, consent store, adapters merged (TASK-7.1); Design: Report lost flow (P6) approved (TASK-29.1)
Design: P6 docs/design/pages/P6-report-lost.md (mockup docs/design/mockups/P6-report-lost.html; TASK-29.1)
Copy: docs/content/pages/P6-report-lost.md
Contracts: C4, C6 (in references); conventions in C1
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-29.5-lost-mob
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The lost flow (P6) lets a signed-in owner pick a saved pet or enter details, add photos, set place and radius, date and time, circumstances and contact preference.
- [ ] #2 Submitting calls create_report; errors are specific, localised and keep the input; DUPLICATE_OPEN_REPORT offers to update the open report.
- [ ] #3 report_lost_start and report_lost_submit fire with consent only; no ad component in the flow.
- [ ] #4 Screen-reader labels and focus order verified on every step.
<!-- AC:END -->
