---
id: TASK-86.3
title: 'QA: Offline queue for found and sighting reports (mobile)'
status: To Do
assignee:
  - '@qa'
created_date: '2026-10-14 22:40'
updated_date: '2026-10-16 02:42'
labels:
  - qa
  - 'est:XS'
  - 'qa:fail'
milestone: m-1
dependencies:
  - TASK-86.1
  - TASK-86.2
  - TASK-30.3
  - TASK-29.2
  - TASK-17.1
references:
  - docs/tech/frontend.md
  - docs/tech/contracts/C17-mobile-offline-data.md
  - docs/design/pages/P7-report-found.md
parent_task_id: TASK-86
priority: medium
ordinal: 270000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Verify story TASK-86 (Offline queue for found and sighting reports (mobile)) on main once all its tasks are merged: acceptance criteria below, airplane-mode checks on an Android dev build, battery and data behaviour, and the cache privacy dump. File bug tasks for failures and set qa:pass or qa:fail.

## Packet

Unblocks on: all tasks of TASK-86 merged to main (TASK-86.1, TASK-86.2, TASK-30.3, TASK-29.2, TASK-17.1)
Review: n/a (QA)
Branch: - (verify on main)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Given no connectivity, when a finder completes a found or sighted report, then it is saved locally with photo, GPS and the capture time and shown as Waiting to send.
- [x] #2 Given connectivity returns, when the app is open or resumed, then queued reports are sent automatically with an idempotency key so retries never create duplicates, and the state changes to Sent with the manage link available.
- [ ] #3 Given a failed send (captcha, rate limit, server error), when retried, then the user sees the reason and can retry or delete the queued report; nothing is lost silently.
- [x] #4 Given the queue, when the user logs out or deletes data, then queued items are offered for sending or deletion first.
- [x] #5 Given the report time, when sent late, then the original capture time is used for matching.
- [x] #6 Story gates pass on main: `pnpm verify`, plus the offline checks in docs/05 (cache privacy dump, idempotent queue); results recorded in the QA notes.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
QA 2026-10-16 on main 922041a (worktree reset to main). Result: qa:fail (AC #3, bug TASK-86.4).

Gates: verify: merge queue, main at 922041a (full pnpm verify not run here per machine rules). Mobile jest (--maxWorkers=2): 45/45 suites, 555/555 tests. API on scratch DB task_qa_86_3: idempotency.middleware + photos.routes + reports.write.routes 48/49 (the 1 failure is env-only: scratch DB has no GURS seed, municipality_slug undefined on PATCH move); new test/routes/outbox.qa.routes.test.ts 3/3; apps/api tsc, eslint, prettier clean.
docs/05 offline checks: cache privacy dump (offline-sync, data-reports, offline-store whitelist tests) pass; idempotent queue: jest outbox (lost response -> 1 report, same token) + API outbox.qa (same key, re-registered photo -> replay, same manage token, 1 report, event_at = captured_at) pass.

AC #1 pass: submitReport copies photos to outbox/<id>/, row queued with coarsened GPS + captured_at; Q1 'Waiting to be sent' + queue row (report-found offline test, outbox tests).
AC #2 pass: launch, resume, reconnect, backoff timer triggers; Idempotency-Key = outbox id on every attempt; replay gives same report and token; Sent row has the manage link from SecureStore. Known edge (CHANGE row): after the 24 h key TTL a photo-less sighting could duplicate; a found report is refused (VALIDATION) instead.
AC #3 FAIL: captcha (needs_action) and VALIDATION/FORBIDDEN (failed) show reason + Retry + Delete; rate limit and server errors stay 'Waiting' with no reason, no Retry, no Delete; Q1 says 'when you are back online' after a 5xx while online -> TASK-86.4 (Medium).
AC #4 pass: sign-out runs Send now / Delete / Cancel (signOutAndWipe + usePendingPrompt, shell + offline-store tests); 'Clear offline data' keeps outbox and drafts (TASK-85.3 decision); account deletion UI not built yet (TASK-51): CHANGE row filed so TASK-51 calls the prompt before wipeLocalData('account_deleted').
AC #5 pass: event_at = captured_at (photo EXIF time, else flow start; linked sighting = chosen time) on late sends; server stores it (API test).
AC #6 pass: as above.

Needs a device (Android dev build), not run here: airplane mode on Publish then back online (Q1 -> M6); app killed with items queued and relaunched (row 'sending' -> resent with same key); background -> resume retry and the 1/5/15/60 min timer while foreground; Turnstile sheet on a queued send; photos PUT via File.upload after reconnect; battery/data behaviour; screen reader announcements of status words.
<!-- SECTION:NOTES:END -->
