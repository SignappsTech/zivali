---
id: TASK-55
title: >-
  Premium features: more pets, 1-tap lost mode, vet records, proactive
  protection
status: To Do
assignee:
  - '@tech-lead'
created_date: '2026-10-14 21:04'
labels:
  - story
  - 'req:FR-026'
milestone: m-3
dependencies:
  - TASK-52
  - TASK-16
  - TASK-23
  - TASK-43
priority: medium
ordinal: 55000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Premium must deliver visible value beyond the free core, without taking anything away from it.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given a Premium user, when they add pets, then there is no limit (free accounts keep at least 1 profile) and per-pet vet records (vaccinations, chip implant date, documents) can be stored privately.
- [ ] #2 Given a Premium user, when they tap Lost mode on a pet, then a prefilled lost report (pet data, last known phone location after confirmation) is created in at most 2 taps.
- [ ] #3 Given proactive protection, when new found or intake reports appear, then the registered pets of Premium owners are matched continuously and only strong matches alert the owner.
- [ ] #4 Given Premium alerts, when configured, then up to 3 alert zones (home, work, custom) and a radius up to 25 km are available.
- [ ] #5 Given Premium ends, when downgraded, then extra data is kept read-only for 90 days.
<!-- AC:END -->

## Packet

Unblocks on: hasEntitlement (TASK-52); pet limit hook (TASK-16); alert zones (TASK-23); continuous matching of profiles (TASK-43)
