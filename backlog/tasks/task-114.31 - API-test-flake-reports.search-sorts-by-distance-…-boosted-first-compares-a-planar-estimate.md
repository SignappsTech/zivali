---
id: TASK-114.31
title: >-
  API test flake: reports.search 'sorts by distance … boosted first' compares a
  planar estimate
status: To Do
assignee:
  - '@backend-dev'
created_date: '2026-10-18 21:49'
labels:
  - bug
  - be
  - 'est:XS'
  - trivial
  - no-design
dependencies: []
references:
  - apps/api/test/routes/reports.search.routes.test.ts
parent_task_id: TASK-114
priority: medium
ordinal: 393200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
CI verify on 3c42a339 (2026-10-18) failed once in apps/api/test/routes/reports.search.routes.test.ts:294-305: the expected order is rebuilt from a planar distance (Math.hypot on item.area lat/lng with a cos factor), while the API sorts by the PostGIS distance of public_point. With random public-blur offsets per seed, two near-equal distances can swap: 'expected [0.00195…, …(3)] to deeply equal [0.00195…, …(3)]'. Make the check robust without weakening it: e.g. assert non-decreasing order with a small tolerance (a few metres in degrees), or compare against the distance the API itself exposes if the item carries one, or seed fixed public points in the fixture. Test-only change unless the API order is actually wrong; if so, stop and report.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The test passes 20/20 runs on a scratch DB (vitest --repeat or a loop) and still fails if the API sorted by a different key
<!-- AC:END -->
