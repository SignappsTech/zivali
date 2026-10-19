---
id: TASK-55
title: >-
  Premium features: unlimited pets, one-tap lost mode, yearly free Boost,
  ad-free
status: To Do
assignee:
  - '@tech-lead'
created_date: '2026-10-14 21:04'
updated_date: '2026-10-19 14:33'
labels:
  - story
  - 'req:FR-026'
milestone: m-3
dependencies:
  - TASK-52
  - TASK-16
  - TASK-53
  - TASK-35
priority: medium
ordinal: 55000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Premium must deliver visible value beyond the free core without taking anything from it.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given a Premium user, when they add pets, then there is no limit (free accounts have up to 2 profiles).
- [ ] #2 Given a Premium user, when they tap Lost mode on a pet, then a prefilled lost report (pet data, last known phone location after confirmation) is created in at most 2 taps.
- [ ] #3 Given a Premium user with no Boost used in the last 12 months, when they are on the yearly plan, or on the monthly plan after the 3rd paid month (default until OQ-004), then one free Boost is available and is consumed by the Boost flow; a plan switch never adds a second one.
- [ ] #4 Given a Premium user, when any ad slot is requested, then no ad and no house ad is returned and the slot collapses; Podpornik supporters still see ads.
- [ ] #5 Given Premium ends, when downgraded, then extra pets are kept read-only for 90 days and ads return.
- [ ] #6 Given a Premium user, when their listings, profile or chats are shown, then no Premium badge or other paid trust signal appears.
<!-- AC:END -->

## Packet

Unblocks on: hasEntitlement (TASK-52); pet limit hook (TASK-16); free-Boost redemption in the Boost flow (TASK-53); ad-free flag in the ad request context (TASK-35)
