---
id: TASK-86.5
title: 'Reports: dedupe outbox submissions beyond the 24 h Idempotency-Key window'
status: To Do
assignee:
  - '@tech-lead'
created_date: '2026-10-16 02:44'
labels:
  - be
  - 'est:S'
milestone: m-1
dependencies:
  - TASK-86.1
parent_task_id: TASK-86
priority: high
ordinal: 340000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
From QA TASK-86.3 (CHANGE row on C17 §Outbox). The mobile outbox sends only in the foreground, but the API replays an Idempotency-Key for 24 h only (C1), and a post-commit 5xx frees the key. If a create's answer is lost and the next attempt comes after the key expired (app not opened for a day), a photo-less sighting is created twice, and a found report is refused (VALIDATION) so its manage token is never saved on the device.

## Packet

Contracts: C1 (Idempotency-Key), C4 (create_report), C17 §Outbox
Review: tech-lead code review (full mode)
Branch: agent/task-86.5-outbox-dedupe
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 POST /v1/reports stores the client's outbox id (the Idempotency-Key, or a client_submission_id field) with the report, unique per actor, with no 24 h expiry; a repeat with the same id returns the existing report (201/200 with its short_code and, for the anonymous submitter, a fresh way to recover the manage token per C7) instead of creating a duplicate or refusing.
- [ ] #2 A post-commit 5xx can't free the dedupe: a retry after it returns the created report.
- [ ] #3 Tests cover a repeat after 25 h (key expired), a repeat after a post-commit failure, and different bodies with the same id (409 per C1); C1/C4/C17 updated via CHANGE to tech-lead.
<!-- AC:END -->
