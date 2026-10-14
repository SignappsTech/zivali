---
id: TASK-15
title: Location picker and privacy-preserving map display
status: To Do
assignee:
  - '@design-lead'
created_date: '2026-10-14 21:02'
labels:
  - story
  - 'req:FR-004'
milestone: m-1
dependencies:
  - TASK-6
  - TASK-8
priority: high
ordinal: 15000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Reports need an accurate place and radius from a phone in the field while the public must never see exact home or holding addresses; this story also provides the shared MapLibre component other map stories reuse.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given a report form, when the user opens the picker, then they can use GPS, drop a pin, drag the map or search a place name, and set a radius for lost reports, on web and mobile with MapLibre and OpenFreeMap tiles (no API key).
- [ ] #2 Given a stored location, when shown publicly, then LOST shows an area of at least 500 m radius and FOUND or SIGHTED at least 150 m, deterministic per report so repeated views cannot be averaged, and the exact point is visible only to the owner or reporter and to chat participants on explicit share.
- [ ] #3 Given location permission is denied, when the picker opens, then manual pin and search work and the screen explains why location helps.
- [ ] #4 Given other stories, when they use the component, then a documented API exists (LocationPicker, MapView with markers, clusters, circles and paths, fuzz utility) with keyboard operation and a text alternative.
- [ ] #5 Given place search, when used in Slovenia, then the geocoder choice and limits are documented in the TDD and results default to Slovenia.
<!-- AC:END -->

## Packet

Unblocks on: location columns and fuzz config contract (TASK-6); map container styling tokens (TASK-8)
