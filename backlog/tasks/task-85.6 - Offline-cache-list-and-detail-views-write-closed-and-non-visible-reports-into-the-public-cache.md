---
id: TASK-85.6
title: >-
  Offline cache: list and detail views write closed and non-visible reports into
  the public cache
status: To Do
assignee:
  - '@frontend-dev'
created_date: '2026-10-16 02:43'
labels:
  - bug
  - 'est:XS'
dependencies: []
parent_task_id: TASK-85
ordinal: 341000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Found by TASK-85.4 (QA), AC #1 (active reports only), AC #4 (closed or hidden removed on refresh), focus 'never owner views'. Steps: 1) online, open the Map tab list, tap 'Pokaži zaključene' (include_closed) or open a reunited report from a link: useReportSearch / useReport upsert it via toCached(); 2) as the owner, open your own report while it is held or hidden by moderation: useReport upserts the owner view's public subset and drops moderation_state, so it is stored as status 'open'; 3) keep syncing for 8 days. Expected: such rows never enter reports_cache, or the next refresh removes them. Actual: the incremental feed never lists them (unchanged since the cursor), confirmArea() keeps refreshing synced_at for every row inside the area, so they stay indefinitely; offline the owner's held report shows as an open public report on the map and list, and closed rows show in the detail as saved copies. No private field is written (toCached whitelist holds). Severity: Low-Medium (AC #1/#4; owner-only exposure, wiped on sign-out).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 lib/data/reports.ts caches only live public reports (status open or matched; an owner view only when moderation_state is visible), or the sync removes such rows; a closed report from 'Pokaži zaključene' or a shared link and an owner's held report are gone from reports_cache after the next refresh past cache.max_age_days; the QA test.failing 'a closed report or a held owner view seen online does not stay in the cache' in apps/mobile/__tests__/offline-sync.test.ts passes as a plain test
<!-- AC:END -->
