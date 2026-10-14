---
id: TASK-50
title: Sighting trail on the map
status: To Do
assignee:
  - '@design-lead'
created_date: '2026-10-14 21:04'
labels:
  - story
  - 'req:FR-017'
milestone: m-2
dependencies:
  - TASK-31
  - TASK-18
  - TASK-30
priority: low
ordinal: 50000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Several sightings of the same animal show searchers where it is heading; a path turns scattered reports into a lead.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given a lost report with two or more linked sightings, when the detail page opens, then sightings appear as numbered points on a path in time order with relative times.
- [ ] #2 Given fuzzed locations, when drawn, then each sighting uses its fuzzed point only.
- [ ] #3 Given the owner viewing the trail, when a sighting is not their pet, then they can mark it so and it leaves the path.
- [ ] #4 Given a new sighting, when saved, then the owner is notified and the map updates.
- [ ] #5 Given a screen reader, when the trail is read, then a chronological list gives the same information.
<!-- AC:END -->

## Packet

Unblocks on: MapView path layer (TASK-31); detail page (TASK-18); linked sightings (TASK-30)
