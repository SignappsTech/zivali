---
id: TASK-87
title: Local proximity alerts with OS geofences (mobile)
status: To Do
assignee:
  - '@tech-lead'
created_date: '2026-10-14 22:30'
labels:
  - story
  - 'req:FR-043'
  - 'req:NFR-BATT'
  - 'req:NFR-OFFLINE'
milestone: m-2
dependencies:
  - TASK-85
  - TASK-23
  - TASK-12
priority: medium
ordinal: 260000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Walking near where a pet was last seen is the best moment to ask for help, even offline; OS geofences deliver this without continuous GPS, as long as it is opt-in and never spams.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given the settings, when the user opts in after a clear primer explaining background location and what is stored, then the app requests Always location permission; declining leaves everything else working.
- [ ] #2 Given cached lost-pet areas, when geofences are registered, then the nearest and most recent areas are chosen within the OS limits (about 20 regions on iOS, platform limit on Android) and are refreshed as the user moves or the cache changes.
- [ ] #3 Given the user enters a geofence, when offline or online, then a local notification such as You are near where Maks was last seen yesterday, keep an eye out is shown with a deep link to the listing.
- [ ] #4 Given spam protection, when alerts fire, then quiet hours and a daily cap (default 3) apply, each pet alerts at most once per area, and closed or reunited reports are unregistered.
- [ ] #5 Given the toggle in settings, when turned off, then all geofences are removed at once and the Always permission is no longer needed.
- [ ] #6 Given battery and privacy, when running, then only OS geofencing is used (no continuous GPS), only public fuzzed areas are monitored, location is never uploaded, and the cache and geofences are wiped on logout.
<!-- AC:END -->

## Packet

Unblocks on: cached lost-pet areas (TASK-85); alert preferences, quiet hours and caps (TASK-23); permission primer pattern (TASK-12)
