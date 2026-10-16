---
id: TASK-87.5
title: 'Bug (TASK-87 AC#4): daily cap exceeded when areas are entered at once'
status: Done
assignee:
  - '@frontend-dev'
created_date: '2026-10-16 03:34'
updated_date: '2026-10-16 04:02'
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
- [x] #1 Geofence entries that arrive together never show more than DAILY_CAP (3) local alerts a day; a jest test in geofence.test.ts enters several areas concurrently and expects exactly the cap.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Branch: agent/task-87.4-proximity-fixes. The claim insert checks the daily cap in the same statement (insert ... select ... where count < DAILY_CAP), so concurrent handlers never pass it together. Test: geofence.test.ts 'areas entered at once' (6 before the fix, 3 now).
<!-- SECTION:NOTES:END -->
