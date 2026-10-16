---
id: TASK-87.5
title: 'Bug (TASK-87 AC#4): daily cap exceeded when areas are entered at once'
status: To Do
assignee:
  - '@frontend-dev'
created_date: '2026-10-16 03:34'
updated_date: '2026-10-16 03:36'
labels:
  - bug
  - 'est:XS'
dependencies: []
parent_task_id: TASK-87
priority: low
ordinal: 342000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Story AC#4 (TASK-87): quiet hours and a daily cap (default 3) apply. Found in QA TASK-87.3.

Steps: in the apps/mobile/__tests__/geofence.test.ts harness (after enableGeofencing): cache(...many(6)); await enter('r01'); await enter('r02'); await Promise.all([enter('r03'), enter('r04'), enter('r05')]). On a device: walk into two or more overlapping lost areas at once (Android hands several triggering geofences in one event and expo-location runs the task once per geofence, concurrently in JS; iOS sends one didEnterRegion per region).

Expected: 3 notifications that day.

Actual: 5 (jest repro). apps/mobile/lib/offline/geofence.ts alertNear reads count(*) from geofence_events, then inserts the claim in a later await, so concurrent handlers all read the same count and all pass the cap. Fix idea: make the claim one conditional statement (insert ... select ... where (select count(*) from geofence_events where fired_at >= midnight) < DAILY_CAP), or run alertNear through the module's serial() queue.

Severity: low (one extra alert per simultaneous area, only where areas overlap).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Geofence entries that arrive together never show more than DAILY_CAP (3) local alerts a day; a jest test in geofence.test.ts enters several areas concurrently and expects exactly the cap.
<!-- AC:END -->
