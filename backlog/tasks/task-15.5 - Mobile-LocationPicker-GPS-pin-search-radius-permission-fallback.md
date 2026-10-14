---
id: TASK-15.5
title: 'Mobile LocationPicker: GPS, pin, search, radius, permission fallback'
status: To Do
assignee:
  - '@frontend-dev'
created_date: '2026-10-14 22:13'
labels:
  - fe
  - 'est:S'
milestone: m-1
dependencies:
  - TASK-15.4
  - TASK-15.1
references:
  - docs/tech/frontend.md
  - docs/tech/contracts/C6-location-geo-maps.md
  - docs/design/pages/P5-location-picker.md
parent_task_id: TASK-15
priority: high
ordinal: 153000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Reporters in the field set the place from their phone; a denied permission must not block them (FR-004).

## Packet

Unblocks on: Mobile MapView: MapLibre React Native, markers, clusters, areas, list alternative merged (TASK-15.4); Design: Location picker and fuzzed area (P5) approved (TASK-15.1)
Design: P5 docs/design/pages/P5-location-picker.md (mockup docs/design/mockups/P5-location-picker.html; TASK-15.1)
Copy: docs/content/pages/P5-*.md (content strategist; until it exists use clear SL and EN drafts and list the keys in your report)
Contracts: C6 (in references); conventions in C1
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-15.5-picker-mob
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 LocationPicker (mobile) supports GPS after the location primer, drop or drag pin, place search and the radius control for lost and alert modes, per P5.
- [ ] #2 With permission denied, pin and search work with an explanation; the EXIF suggestion is offered; the outside-Slovenia notice is shown.
- [ ] #3 Screen-reader labels and 44 px targets are verified on Android.
<!-- AC:END -->
