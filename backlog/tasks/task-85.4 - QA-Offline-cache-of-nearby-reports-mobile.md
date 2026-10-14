---
id: TASK-85.4
title: 'QA: Offline cache of nearby reports (mobile)'
status: To Do
assignee:
  - '@qa'
created_date: '2026-10-14 22:40'
labels:
  - qa
  - 'est:XS'
milestone: m-1
dependencies:
  - TASK-85.1
  - TASK-85.2
  - TASK-85.3
references:
  - docs/tech/frontend.md
  - docs/tech/contracts/C17-mobile-offline-data.md
  - docs/design/pages/P4-map-list.md
parent_task_id: TASK-85
priority: medium
ordinal: 269000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Verify story TASK-85 (Offline cache of nearby reports (mobile)) on main once all its tasks are merged: acceptance criteria below, airplane-mode checks on an Android dev build, battery and data behaviour, and the cache privacy dump. File bug tasks for failures and set qa:pass or qa:fail.

## Packet

Unblocks on: all tasks of TASK-85 merged to main (TASK-85.1, TASK-85.2, TASK-85.3)
Review: n/a (QA)
Branch: - (verify on main)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given the app is online, when it runs, then active lost and found reports around the home area and the current area are cached with thumbnails and public fuzzed locations only, within a size limit (default 50 MB) and age limit (default 7 days), refreshed in the background.
- [ ] #2 Given the device is offline, when the map or list opens, then cached reports show with a clear offline, last updated state and actions that need a connection explain why they are unavailable.
- [ ] #3 Given the cache, when inspected, then it never contains exact locations, chip numbers, contact data or chat content, and it is wiped on logout, account deletion and on user request in settings.
- [ ] #4 Given closed, hidden or expired reports, when the cache refreshes, then they are removed.
- [ ] #5 Given battery and data use, when refreshing, then it uses incremental sync, respects data saver and refreshes on Wi-Fi or at most every 15 minutes in the foreground.
- [ ] #6 Story gates pass on main: `pnpm verify`, plus the offline checks in docs/05 (cache privacy dump, idempotent queue); results recorded in the QA notes.
<!-- AC:END -->
