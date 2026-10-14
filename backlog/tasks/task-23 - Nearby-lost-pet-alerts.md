---
id: TASK-23
title: Nearby lost-pet alerts
status: To Do
assignee:
  - '@tech-lead'
created_date: '2026-10-14 21:02'
labels:
  - story
  - 'req:FR-010'
milestone: m-1
dependencies:
  - TASK-22
  - TASK-15
  - TASK-6
  - TASK-7
priority: medium
ordinal: 23000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Community members drive sightings; alerts within a chosen radius turn them into helpers without searching the app.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given a signed-in user, when they set a home area, radius (default 5 km, range 1-25 km) and species and opt in, then alert_opt_in fires (consent only) and alerts are enabled.
- [ ] #2 Given a new LOST report, when published, then users whose area covers its fuzzed location receive one push or in-app alert within 2 minutes, never exceeding the daily cap (default 5).
- [ ] #3 Given the owner closes or reunites a report, when alerts are still pending, then they are cancelled.
- [ ] #4 Given the user pauses or disables alerts, when a new report appears, then nothing is sent.
- [ ] #5 Given the fan-out, when 1000 recipients match, then it completes under 60 s using spatial indexes (tested locally).
<!-- AC:END -->

## Packet

Unblocks on: sendNotification contract (TASK-22); radius picker (TASK-15); reports schema (TASK-6); track() (TASK-7)
