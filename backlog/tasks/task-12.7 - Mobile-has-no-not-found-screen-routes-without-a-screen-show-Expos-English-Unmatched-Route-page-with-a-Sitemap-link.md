---
id: TASK-12.7
title: >-
  Mobile has no +not-found screen: routes without a screen show Expo's English
  Unmatched Route page with a Sitemap link
status: Done
assignee:
  - '@frontend-dev'
created_date: '2026-10-16 01:50'
updated_date: '2026-10-16 02:42'
labels:
  - bug
  - 'est:XS'
dependencies: []
references:
  - docs/design/pages/P2-mobile-shell.md
  - apps/mobile/app/_layout.tsx
parent_task_id: TASK-12
priority: low
ordinal: 338000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
TASK-12 AC#1 and AC#2 (QA TASK-12.4), P2 Deep link landing ('link invalid: neutral page with Open the map'). Steps: on main 01a32d5, open a route that has no screen yet: a Report sheet choice (/report/lost, /report/found?type=sighted; screens come with TASK-29.5 and TASK-30.3), an inbox row or push tap for a match or chat (toTargetPath/notificationTarget give /r/<code>/matches and /inbox/<id>; screens with TASK-20.4 and TASK-21.4), or zivali://payments/x (allowlisted /payments/.+). Verified with renderRouter over the app's route files: all five render expo-router's default Unmatched view. Expected: a localised not-found page with 'Open the map'. Actual: Expo Router's built-in English 'Unmatched Route / Page could not be found.' with 'Go back' and 'Sitemap' links (sitemap: true by default, also in release builds). Not a crash. Severity: Minor (stop-gap until the missing screens land; stays the safety net afterwards).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 apps/mobile/app/+not-found.tsx renders the P2 invalid-link page (neutral, localised SL/EN, primary 'Open the map' to /) for any route without a screen
- [x] #2 Expo Router's default _sitemap is not reachable from the app (no Sitemap link in production)
- [x] #3 A jest test renders /inbox/x and /r/x/matches (until their screens exist) and an unknown path, and finds the localised page, not testID expo-router-unmatched
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Fixed with TASK-12.6 (agent/task-12.6-deep-links): app/+not-found.tsx (P2 invalid-link page), expo-router sitemap: false, not-found.test.tsx.
<!-- SECTION:NOTES:END -->
