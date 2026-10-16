---
id: TASK-87.4
title: >-
  Bug (TASK-87 AC#3): nearby reminders never alert without notification
  permission
status: To Do
assignee:
  - '@frontend-dev'
created_date: '2026-10-16 03:34'
updated_date: '2026-10-16 03:36'
labels:
  - bug
  - 'est:S'
dependencies: []
parent_task_id: TASK-87
priority: medium
ordinal: 341000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Story AC#3 (TASK-87): entering a geofence must show a local notification. Found in QA TASK-87.3.

Steps: 1. Fresh install, sign in, never turn on a push switch in Kako vas obvestimo (notification permission undetermined), or decline it. 2. Settings, Opozorila v bližini: turn on Opozori me, ko sem blizu izgubljene živali, Dovoli vedno, grant Always location. 3. Enter a cached open lost area.

Expected: turning the reminders on makes sure local notifications can show, or says why they cannot.

Actual: apps/mobile/app/settings/alerts.tsx NearbyReminders checks only location permission; apps/mobile/lib/offline/geofence.ts alertNear returns silently when Notifications.getPermissionsAsync() is not granted. Geofencing with Always location runs, but no alert is ever shown and nothing explains it. Notification permission is asked only from the push switches in app/settings/notifications.tsx.

Severity: medium (the feature is silently dead for users who never enabled push, while they pay the privacy cost of Always location). P13 does not say how the reminders handle notification permission: ask the design lead to confirm the order (Always primer, then the notifications primer) and the note.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Turning on Nearby reminders without notification permission asks for it (notifications primer while the OS can still ask) or shows the notifications-denied note in the Nearby reminders section with Odpri nastavitve telefona; the section never shows the reminders as working while local notifications cannot show; jest tests cover ask, decline and already denied.
<!-- AC:END -->
