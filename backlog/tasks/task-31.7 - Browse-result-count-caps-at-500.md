---
id: TASK-31.7
title: Browse result count caps at 500 (counts map pins, ignores total_estimate)
status: To Do
assignee:
  - '@frontend-dev'
created_date: '2026-10-16 11:30'
labels:
  - bug
  - est:XS
dependencies: []
parent_task_id: TASK-31
priority: low
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Found by QA TASK-31.6 against TASK-31 AC#3 (result counts).

Steps: seed more than 500 visible open reports in the default area (or Slovenia-wide with no location), open /zemljevid or the mobile Map tab.
Expected: the count shows the real number of matches.
Actual: apps/web/components/browse/browse.tsx and apps/mobile/app/(tabs)/index.tsx set count = pins.length of GET /v1/reports/map, which the API caps at 500 (MAP_LIMIT, apps/api/domains/reports/search.domain.ts). total_estimate from GET /v1/reports is never read in the apps. The drawer's live count (draftCount) has the same cap.
Severity: low (only above 500 reports in view).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 With more than 500 matching reports the list header, the filter button and the mobile sheet show the real total (total_estimate, or "500+" when only the map is known); map and list counts agree below 500 (jest test on web and mobile)
<!-- AC:END -->
