---
id: TASK-85.5
title: 'Offline cache: a fresh area snapshot keeps closed reports it no longer lists'
status: Done
assignee:
  - '@frontend-dev'
created_date: '2026-10-16 02:42'
updated_date: '2026-10-16 03:09'
labels:
  - bug
  - 'est:XS'
dependencies: []
parent_task_id: TASK-85
ordinal: 340000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Found by TASK-85.4 (QA), AC #4 (closed, hidden or expired reports are removed when the cache refreshes). Steps: 1) current area synced with lost report X open inside it; 2) X is reunited; 3) the user moves about 1 km, setCacheArea('current') rounds to a new centre and resets since; 4) next syncNow: the server snapshot lists live reports only and never sends removed_ids (sync.domain: no 'after' cursor returns live rows only). Expected: X is deleted from reports_cache. Actual: X stays with status 'open' and confirmArea() sets its synced_at to now, so cache.max_age_days never evicts it while the user stays nearby; offline the map and list show a reunited pet as still lost. Fix hint: in syncArea, when the area started from since = null, delete rows inside the area that the completed snapshot did not upsert (instead of confirming them). Severity: Medium (wrong offline data, AC #4).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 After a complete sync with since = null (first sync, or an area moved or resized by setCacheArea), cached rows inside that area that the snapshot does not list are deleted, not marked seen; the QA test.failing 'a fresh snapshot drops cached rows inside the area it no longer lists' in apps/mobile/__tests__/offline-sync.test.ts passes as a plain test
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Delete only after the whole snapshot completed (has_more pages), and keep rows the snapshot did upsert on earlier pages. The existing 'limits' tests in offline-sync.test.ts seed rows with upsertReports and then run a snapshot sync; they need a since cursor (or rows outside the area) once this is fixed. Applies to rows written by browsing (useReportSearch/useReport) before the area's first snapshot too.

Branch: agent/task-85.5-cache-fixes
<!-- SECTION:NOTES:END -->
