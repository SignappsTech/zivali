---
id: TASK-85.4
title: 'QA: Offline cache of nearby reports (mobile)'
status: To Do
assignee:
  - '@qa'
created_date: '2026-10-14 22:40'
updated_date: '2026-10-16 02:50'
labels:
  - qa
  - 'qa:fail'
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
- [x] #2 Given the device is offline, when the map or list opens, then cached reports show with a clear offline, last updated state and actions that need a connection explain why they are unavailable.
- [x] #3 Given the cache, when inspected, then it never contains exact locations, chip numbers, contact data or chat content, and it is wiped on logout, account deletion and on user request in settings.
- [ ] #4 Given closed, hidden or expired reports, when the cache refreshes, then they are removed.
- [x] #5 Given battery and data use, when refreshing, then it uses incremental sync, respects data saver and refreshes on Wi-Fi or at most every 15 minutes in the foreground.
- [ ] #6 Story gates pass on main: `pnpm verify`, plus the offline checks in docs/05 (cache privacy dump, idempotent queue); results recorded in the QA notes.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
QA on main 922041a (worktree reset to main; no device). Gates: verify: merge queue, main at 922041a. Mobile jest 45 suites / 555 tests pass (--maxWorkers=2); offline-sync.test.ts with the QA block 29/29 (3 test.failing reproduce the bugs). API on scratch DB task_qa_85_4 (auth.users stub): sync.routes 16/16 (1000-row perf test over 500 ms once under machine load, passed on rerun); idempotency middleware + reports.write 35/36 (the 1 failure is municipality lookup on an unseeded scratch DB, not this story). tsc, eslint, prettier clean. docs/05 offline checks: cache privacy dump PASS (column whitelist, fuzzed areas only, no chip/contact/chat; plus a manager view keeps only its public subset); idempotent queue PASS (outbox jest, Idempotency-Key replay API test).
AC #1 FAIL: home/current area sync, thumbnails, 50 MB / 7 day limits, background task PASS; but non-active reports enter the cache from list/detail views (TASK-85.6) and OS-purged thumbnails never come back (TASK-85.7).
AC #2 PASS (code + jest): offline note 'Brez povezave, zadnja posodobitev {time}' (role status, iOS announce), first-launch offline empty state, filters on cache, detail saved-copy note, slot actions disabled with report.action_offline.
AC #3 PASS: C17 whitelist, isBlurred filter, privacy dump; wipe on sign-out (signOutAndWipe), user request (keeps drafts and outbox, CH row open) and account_deleted (built and tested; no caller until TASK-51, CHANGE row).
AC #4 FAIL: incremental removed_ids PASS; a fresh snapshot (first sync, moved or resized area) keeps rows it no longer lists and confirms them as seen (TASK-85.5); rows from views never removed (TASK-85.6).
AC #5 PASS: since cursor, resume only when older than 15 min, Wi-Fi regain, background task unmetered only (minimumInterval 60), mobile-data photo switch off by default and respected; data saver approximated by connection type (CHANGE row).
AC #6: verify by merge queue (main 922041a); offline checks above PASS.
Bugs: TASK-85.5 Medium, TASK-85.6 Low-Medium, TASK-85.7 Low. CHANGE rows: current-area sync trigger, unmetered/data saver approximation, TASK-51 account_deleted wipe call.
Needs a device (Android dev build): airplane mode on map, list and detail; background task run on Wi-Fi after an app kill (headless launch, adb jobscheduler/WorkManager); real storage limits with 480 px thumbnails and an OS cache purge; mobile-data switch on cellular and on a metered hotspot; Data Saver / Low Data Mode; sign-out wipe of files and tables (adb run-as pull zivali.db); cache privacy dump of the device database.
<!-- SECTION:NOTES:END -->
