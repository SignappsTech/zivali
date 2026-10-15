---
id: TASK-29.3
title: Web report-lost flow
status: To Do
assignee:
  - '@frontend-dev'
created_date: '2026-10-14 22:14'
updated_date: '2026-10-15 00:12'
labels:
  - fe
  - 'est:M'
milestone: m-1
dependencies:
  - TASK-16.4
  - TASK-14.2
  - TASK-15.3
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
ordinal: 201000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The entry point of the core loop; owners are panicked, so it must take minutes and start matching and alerts at once (FR-005).

## Packet

Unblocks on: Web PetFields form section (shared by pet profiles and the lost flow) merged (TASK-16.4); Web PhotoPicker: resize, EXIF read and strip, drafts, upload with retry merged (TASK-14.2); Web LocationPicker: GPS, pin, search, radius, permission fallback merged (TASK-15.3); Contract clients in @zivali/api: auth, profiles, pets, reports, photos, geocode, matches merged (TASK-6.9); packages/analytics: typed track(), event registry, consent store, adapters merged (TASK-7.1); Design: Report lost flow (P6) approved (TASK-29.1)
Design: P6 docs/design/pages/P6-report-lost.md (mockup docs/design/mockups/P6-report-lost.html; TASK-29.1)
Copy: docs/content/pages/P6-report-lost.md
Contracts: C4, C6 (in references); conventions in C1
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-29.3-lost-web
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The lost flow (one question per screen, per P6) lets a signed-in owner pick a saved pet or enter details with PetFields, add photos, set the last-seen place and radius, date and time (default now), circumstances and contact preference (chat only by default).
- [ ] #2 Submitting calls create_report; errors are specific and localised and keep the input; DUPLICATE_OPEN_REPORT offers to update the open report; old dates warn.
- [ ] #3 report_lost_start and report_lost_submit fire with report_type, species, region and municipality only, with consent.
- [ ] #4 No ad slot anywhere in the flow (quality-kit helper); axe 0 violations on every step.
- [ ] #5 The lost flow offers the optional display-only reward (amount and/or short note) per P6 with the inline contact-data error from containsContactData(); nothing is charged.
<!-- AC:END -->
