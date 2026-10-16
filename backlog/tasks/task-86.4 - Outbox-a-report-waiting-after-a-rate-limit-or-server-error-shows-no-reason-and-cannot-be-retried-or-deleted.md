---
id: TASK-86.4
title: >-
  Outbox: a report waiting after a rate limit or server error shows no reason
  and cannot be retried or deleted
status: Done
assignee:
  - '@frontend-dev'
created_date: '2026-10-16 02:42'
updated_date: '2026-10-16 03:00'
labels:
  - bug
  - 'est:XS'
dependencies: []
parent_task_id: TASK-86
ordinal: 340000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
From QA TASK-86.3 AC #3 (story TASK-86 AC #3: 'Given a failed send (captcha, rate limit, server error), when retried, then the user sees the reason and can retry or delete the queued report; nothing is lost silently').

Steps: 1) Online, publish a found report while POST /v1/reports answers 500 (or 503), or a later retry from the queue answers 429 RATE_LIMITED. 2) Look at the Q1 screen, then at the queue row on the Map tab / Profile -> My reports.

Expected: the row shows the reason (server error; rate limit with the wait time, errors.RATE_LIMITED needs {minutes}) with Retry and Delete, like failed and needs_action rows; Q1 does not claim the phone is offline.

Actual: outcome() in apps/mobile/lib/offline/outbox.ts keeps RATE_LIMITED, INTERNAL and SERVICE_UNAVAILABLE as status 'queued' (auto retry 1/5/15/60 min, C17), and components/outbox/queue.tsx shows queued rows as 'Waiting' + time only: no reason, no Retry, no Delete (only failed/needs_action rows get them). found-flow settle() sends a first-attempt server error to Q1 (found-done Waiting), whose body is offline_queued 'Saved. We will send your report when you are back online.' A report stuck behind repeated 5xx keeps retrying every 60 min and an anonymous finder has no way to see why or to delete it once Q1 is closed (signed-in users only via the sign-out prompt).

Severity: Medium (nothing is lost; reason hidden and no delete for waiting items). Contract note: C17 keeps these as queued; showing last_error_code on a queued row and offering Delete does not change the engine.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A queued outbox item whose last attempt failed with RATE_LIMITED (wait time), INTERNAL or SERVICE_UNAVAILABLE shows that reason on its queue row (Map tab group and Profile -> My reports) with Retry (send now) and Delete, and the Q1 Waiting screen does not say 'when you are back online' while the device is online; a jest test covers rate limit and server error rows
<!-- AC:END -->
