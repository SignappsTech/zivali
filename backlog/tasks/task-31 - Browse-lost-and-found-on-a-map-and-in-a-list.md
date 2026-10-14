---
id: TASK-31
title: Browse lost and found on a map and in a list
status: To Do
assignee:
  - '@design-lead'
created_date: '2026-10-14 21:03'
labels:
  - story
  - 'req:FR-007'
milestone: m-1
dependencies:
  - TASK-15
  - TASK-18
  - TASK-6
priority: high
ordinal: 31000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
People look for pets by place first; a map plus a filterable list serves owners checking for matches and community members seeing what is near them.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given the map, when it loads, then pins or clusters for LOST, FOUND and SIGHTED reports in view appear within 2 s on 4G for 500 reports, coded by icon and colour (not colour alone) with fuzzed locations.
- [ ] #2 Given the list, when opened, then it shows the same results ordered by distance or recency with pagination and works as the full alternative to the map for keyboard and screen reader users.
- [ ] #3 Given filters, when applied, then type, species, distance, date range, colour and size narrow both map and list, persist in the URL on web and show result counts with correct SL plural forms.
- [ ] #4 Given boosted reports, when listed, then boosted_until sorts them first and highlights them on the map (behaviour ready, purchase comes in M4).
- [ ] #5 Given closed or expired reports, when browsing, then they are excluded by default.
<!-- AC:END -->

## Packet

Unblocks on: MapView API (TASK-15); detail route for pin and card taps (TASK-18); report list and viewport query contract (TASK-6)
