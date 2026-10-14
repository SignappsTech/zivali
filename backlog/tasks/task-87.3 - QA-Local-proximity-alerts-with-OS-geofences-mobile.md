---
id: TASK-87.3
title: 'QA: Local proximity alerts with OS geofences (mobile)'
status: To Do
assignee:
  - '@qa'
created_date: '2026-10-14 22:40'
labels:
  - qa
  - 'est:XS'
milestone: m-2
dependencies:
  - TASK-87.1
  - TASK-87.2
references:
  - docs/tech/frontend.md
  - docs/tech/contracts/C17-mobile-offline-data.md
  - docs/design/pages/P13-alerts-inbox-settings.md
parent_task_id: TASK-87
priority: medium
ordinal: 271000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Verify story TASK-87 (Local proximity alerts with OS geofences (mobile)) on main once all its tasks are merged: acceptance criteria below, airplane-mode checks on an Android dev build, battery and data behaviour, and the cache privacy dump. File bug tasks for failures and set qa:pass or qa:fail.

## Packet

Unblocks on: all tasks of TASK-87 merged to main (TASK-87.1, TASK-87.2)
Review: n/a (QA)
Branch: - (verify on main)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given the settings, when the user opts in after a clear primer explaining background location and what is stored, then the app requests Always location permission; declining leaves everything else working.
- [ ] #2 Given cached lost-pet areas, when geofences are registered, then the nearest and most recent areas are chosen within the OS limits (about 20 regions on iOS, platform limit on Android) and are refreshed as the user moves or the cache changes.
- [ ] #3 Given the user enters a geofence, when offline or online, then a local notification such as You are near where Maks was last seen yesterday, keep an eye out is shown with a deep link to the listing.
- [ ] #4 Given spam protection, when alerts fire, then quiet hours and a daily cap (default 3) apply, each pet alerts at most once per area, and closed or reunited reports are unregistered.
- [ ] #5 Given the toggle in settings, when turned off, then all geofences are removed at once and the Always permission is no longer needed.
- [ ] #6 Given battery and privacy, when running, then only OS geofencing is used (no continuous GPS), only public fuzzed areas are monitored, location is never uploaded, and the cache and geofences are wiped on logout.
- [ ] #7 Story gates pass on main: `pnpm verify`, plus the offline checks in docs/05 (cache privacy dump, idempotent queue); results recorded in the QA notes.
<!-- AC:END -->
