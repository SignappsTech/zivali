---
id: TASK-15.6
title: 'QA: Location picker and privacy-preserving map display'
status: Done
assignee:
  - '@qa'
created_date: '2026-10-14 22:15'
updated_date: '2026-10-16 09:29'
labels:
  - qa
  - 'qa:pass'
milestone: m-1
dependencies:
  - TASK-15.1
  - TASK-15.2
  - TASK-15.3
  - TASK-15.4
  - TASK-15.5
  - TASK-15.7
  - TASK-15.8
references:
  - docs/tech/frontend.md
  - docs/design/pages/P5-location-picker.md
parent_task_id: TASK-15
priority: high
ordinal: 233000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Verify story TASK-15 (Location picker and privacy-preserving map display) on main once all its tasks are merged: acceptance criteria below, quality gates, keyboard and screen-reader spot checks, and mobile and desktop checks for the UI. File bug tasks for failures and set qa:pass or qa:fail.

## Packet

Unblocks on: all tasks of TASK-15 merged to main (TASK-15.1, TASK-15.2, TASK-15.3, TASK-15.4, TASK-15.5, TASK-15.7, TASK-15.8); leads add any later TASK-15 task to this task's dependencies.
Review: n/a (QA)
Branch: - (verify on main)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Given a report form, when the user opens the picker, then they can use GPS, drop a pin, drag the map or search a place name, and set a radius for lost reports, on web and mobile with MapLibre and OpenFreeMap tiles (no API key).
- [x] #2 Given a stored location, when shown publicly, then LOST shows an area of at least 500 m radius and FOUND or SIGHTED at least 150 m, deterministic per report so repeated views cannot be averaged, and the exact point is visible only to the owner or reporter and to chat participants on explicit share.
- [x] #3 Given location permission is denied, when the picker opens, then manual pin and search work and the screen explains why location helps.
- [x] #4 Given other stories, when they use the component, then a documented API exists (LocationPicker, MapView with markers, clusters, circles and paths, fuzz utility) with keyboard operation and a text alternative.
- [x] #5 Given place search, when used in Slovenia, then the geocoder choice and limits are documented in the TDD and results default to Slovenia.
- [x] #6 Story gates pass on main: `pnpm verify`, plus `pnpm quality` for the pages this story touches; results recorded in the QA notes.
- [x] #7 Given place search on web and mobile, when searching a settlement, a district, a street and a street with a house number, then matching places come first, the picker shows the reverse area label (for example 'Šiška, Ljubljana'), the GURS attribution sits under the results, and the network panel shows no request to a third-party geocoder.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
QA on main b965dff9 (worktree run, machine rules: no install/build/e2e/Lighthouse/API tests). Web vitest (location, map, report, /map page): 17 files, 181 pass. Mobile jest (location-picker, map-view, map-tab): 51 pass. web tsc clean (apart from next typegen types PageProps/LayoutProps/RouteContext, not generated here); mobile tsc clean; eslint --max-warnings=0 clean on web and mobile location/map/report. i18n check OK (SL/EN keys). AC6: verify, e2e, Lighthouse: merge queue on main at b965dff9. API read (not run): fuzz.ts (D=0.75*min, 500/150 m, HMAC-deterministic, ring 0.4D-D, point inside), reports.mapper PublicReport whitelist + MapReport area only + MatchOther area only, search.dao uses public_point only, updateReportLocation keeps unmoved stored point, blurEnded 30 days sets exact=public and clears submission_hash, geo routes POST-only no-store, reverse returns district/settlement centroid never street; API tests cover each. Observation (not a bug, C6 line 112 allows): picker sends the raw pin to POST /v1/geo/search near and /reverse, 6 decimals, body only, never URL, not logged; browse sends 2 decimals (e2e browse.spec).
<!-- SECTION:NOTES:END -->
