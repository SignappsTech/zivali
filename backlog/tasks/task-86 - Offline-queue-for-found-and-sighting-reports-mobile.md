---
id: TASK-86
title: Offline queue for found and sighting reports (mobile)
status: To Do
assignee:
  - '@tech-lead'
created_date: '2026-10-14 22:30'
labels:
  - story
  - 'req:FR-042'
  - 'req:FR-006'
milestone: m-1
dependencies:
  - TASK-30
  - TASK-14
  - TASK-12
priority: medium
ordinal: 259000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
A finder may have no signal exactly where the animal is; the report must be created offline with photo, GPS and time and sent automatically later.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given no connectivity, when a finder completes a found or sighted report, then it is saved locally with photo, GPS and the capture time and shown as Waiting to send.
- [ ] #2 Given connectivity returns, when the app is open or resumed, then queued reports are sent automatically with an idempotency key so retries never create duplicates, and the state changes to Sent with the manage link available.
- [ ] #3 Given a failed send (captcha, rate limit, server error), when retried, then the user sees the reason and can retry or delete the queued report; nothing is lost silently.
- [ ] #4 Given the queue, when the user logs out or deletes data, then queued items are offered for sending or deletion first.
- [ ] #5 Given the report time, when sent late, then the original capture time is used for matching.
<!-- AC:END -->

## Packet

Unblocks on: found flow and anonymous submit endpoint (TASK-30); resumable photo upload and drafts (TASK-14); app shell storage (TASK-12)
