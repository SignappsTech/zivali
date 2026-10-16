---
id: TASK-87.3
title: 'QA: Local proximity alerts with OS geofences (mobile)'
status: To Do
assignee:
  - '@qa'
created_date: '2026-10-14 22:40'
updated_date: '2026-10-16 03:36'
labels:
  - qa
  - 'qa:fail'
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
- [x] #1 Given the settings, when the user opts in after a clear primer explaining background location and what is stored, then the app requests Always location permission; declining leaves everything else working.
- [x] #2 Given cached lost-pet areas, when geofences are registered, then the nearest and most recent areas are chosen within the OS limits (about 20 regions on iOS, platform limit on Android) and are refreshed as the user moves or the cache changes.
- [ ] #3 Given the user enters a geofence, when offline or online, then a local notification such as You are near where Maks was last seen yesterday, keep an eye out is shown with a deep link to the listing.
- [ ] #4 Given spam protection, when alerts fire, then quiet hours and a daily cap (default 3) apply, each pet alerts at most once per area, and closed or reunited reports are unregistered.
- [x] #5 Given the toggle in settings, when turned off, then all geofences are removed at once and the Always permission is no longer needed.
- [ ] #6 Given battery and privacy, when running, then only OS geofencing is used (no continuous GPS), only public fuzzed areas are monitored, location is never uploaded, and the cache and geofences are wiped on logout.
- [x] #7 Story gates pass on main: `pnpm verify`, plus the offline checks in docs/05 (cache privacy dump, idempotent queue); results recorded in the QA notes.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
QA on main b7dc52d (worktree reset to main), 2026-10-16.

Gates: verify: merge queue, main at b7dc52d. Mobile jest --maxWorkers=2: 49 suites, 625 tests pass (+2 new in __tests__/app-entry.test.ts, commit 773f39b). Mobile tsc and eslint pass. Web quality kit: n/a (mobile-only story). Offline checks (docs/05): cache privacy dump (offline-sync.test, every table, no private coordinate, contact, chip or message) and idempotent queue (outbox.test, same Idempotency-Key on retry) pass.

AC results: #1 pass (primer before the OS Always prompt, Ne zdaj asks nothing, an OS decline leaves the alerts working). #2 pass (open LOST only, nearest whole km then newest, iOS 18 + boundary, Android 50 + boundary, re-pick after each sync, on resume and on leaving the 2 km boundary). #3 FAIL: without notification permission nothing shows and nothing says why (TASK-87.4, medium); the deep link zivali://r/<code> opens /r/<code>, also from a launching tap. #4 FAIL: concurrent entries exceed the cap, jest repro 5 of 3 (TASK-87.5, low); quiet hours, once per pet per area, closed and reunited skipped, the user's own reports skipped, a scheduling failure frees the claim: pass. #5 pass (stopGeofencingAsync and the geofences table cleared at once; nothing else uses background location). #6 FAIL: a session ended outside the app (revoked refresh token, account deleted on the web) runs no wipe and hides the off switch (TASK-87.6, low); OS geofencing only (no watchPosition or startLocationUpdates), no fetch from the engine, public fuzzed areas, in-app sign-out wipe: pass. #7 pass (as recorded above).

Labels: the pause switch and the Nearby reminders switch are separate, with alerts.reminders_separate saying pausing alerts does not stop the reminders; the product decision stays open in backlog/changes.md (TASK-23.3 review row).

Needs a device (Android and iOS dev builds): geofence entry with the app in the background and killed, also offline and with the phone locked; the iOS 20-region and Android 100-region limits; geofences after an Android reboot; the Android 11+ Always flow (settings page) and the iOS When In Use to Always upgrade prompt; the permission downgraded to While using or Never (the note on resume); battery over a day with the reminders on; the cold-start tap on the alert opening the listing; TalkBack and VoiceOver labels on the switch and the primer.

Machine note: during the run another agent's install changed the shared node_modules (packages briefly missing); the jest results above came from a stable state.
<!-- SECTION:NOTES:END -->
