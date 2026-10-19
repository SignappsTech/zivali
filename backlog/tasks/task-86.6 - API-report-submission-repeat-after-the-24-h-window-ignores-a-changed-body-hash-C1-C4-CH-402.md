---
id: TASK-86.6
title: >-
  API: report submission repeat after the 24 h window ignores a changed body
  hash (C1, C4; CH-402)
status: To Do
assignee:
  - '@backend-dev'
created_date: '2026-10-19 21:32'
labels:
  - be
  - 'est:XS'
  - mobile
dependencies: []
references:
  - docs/tech/backend.md
  - docs/tech/contracts/C1-platform-conventions.md§HTTP
  - docs/tech/contracts/C17-mobile-offline-data.md§Outbox
parent_task_id: TASK-86
priority: low
ordinal: 484200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Decision CH-402 (1): after the idempotency window a repeat matches on (created_by, submission_id) alone, so a RATE_SALT rotation or a new zod default never turns an outbox resend into 409. Mobile outbox only.

## Packet
Unblocks on: -
Branch: agent/task-86.6-submission-repeat-hash
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A repeat by the same creator with a known `submission_id` after the 24 h window returns the stored report as a submission repeat (201) even when `submission_hash` differs; the mismatch logs warn `reports.submission_hash_mismatch` (no body); tests
- [ ] #2 Within 24 h the idempotency middleware rule is unchanged (another body → 409 CONFLICT)
<!-- AC:END -->
