---
id: TASK-86.3
title: 'QA: Offline queue for found and sighting reports (mobile)'
status: To Do
assignee:
  - '@qa'
created_date: '2026-10-14 22:40'
labels:
  - qa
  - 'est:XS'
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
- [ ] #1 Given no connectivity, when a finder completes a found or sighted report, then it is saved locally with photo, GPS and the capture time and shown as Waiting to send.
- [ ] #2 Given connectivity returns, when the app is open or resumed, then queued reports are sent automatically with an idempotency key so retries never create duplicates, and the state changes to Sent with the manage link available.
- [ ] #3 Given a failed send (captcha, rate limit, server error), when retried, then the user sees the reason and can retry or delete the queued report; nothing is lost silently.
- [ ] #4 Given the queue, when the user logs out or deletes data, then queued items are offered for sending or deletion first.
- [ ] #5 Given the report time, when sent late, then the original capture time is used for matching.
- [ ] #6 Story gates pass on main: `pnpm verify`, plus the offline checks in docs/05 (cache privacy dump, idempotent queue); results recorded in the QA notes.
<!-- AC:END -->
