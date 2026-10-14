---
id: TASK-15.6
title: 'QA: Location picker and privacy-preserving map display'
status: To Do
assignee:
  - '@qa'
created_date: '2026-10-14 22:15'
labels:
  - qa
  - 'est:XS'
milestone: m-1
dependencies:
  - TASK-15.2
  - TASK-15.3
  - TASK-15.4
  - TASK-15.5
  - TASK-15.1
references:
  - docs/tech/frontend.md
  - docs/design/pages/P5-location-picker.md
parent_task_id: TASK-15
priority: high
ordinal: 233000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Verify story TASK-15 (Location picker and privacy-preserving map display) on main once all its tasks are merged: acceptance criteria below, quality gates, keyboard and screen-reader spot checks, and mobile and desktop checks for the UI. File bug tasks for failures and set qa:pass or qa:fail.

## Packet

Unblocks on: all tasks of TASK-15 merged to main (TASK-15.2, TASK-15.3, TASK-15.4, TASK-15.5, TASK-15.1); leads add any later TASK-15 task to this task's dependencies.
Review: n/a (QA)
Branch: - (verify on main)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given a report form, when the user opens the picker, then they can use GPS, drop a pin, drag the map or search a place name, and set a radius for lost reports, on web and mobile with MapLibre and OpenFreeMap tiles (no API key).
- [ ] #2 Given a stored location, when shown publicly, then LOST shows an area of at least 500 m radius and FOUND or SIGHTED at least 150 m, deterministic per report so repeated views cannot be averaged, and the exact point is visible only to the owner or reporter and to chat participants on explicit share.
- [ ] #3 Given location permission is denied, when the picker opens, then manual pin and search work and the screen explains why location helps.
- [ ] #4 Given other stories, when they use the component, then a documented API exists (LocationPicker, MapView with markers, clusters, circles and paths, fuzz utility) with keyboard operation and a text alternative.
- [ ] #5 Given place search, when used in Slovenia, then the geocoder choice and limits are documented in the TDD and results default to Slovenia.
- [ ] #6 Story gates pass on main: `pnpm verify`, plus `pnpm quality` for the pages this story touches; results recorded in the QA notes.
<!-- AC:END -->
