---
id: TASK-30.7
title: 'Mobile: CONFLICT and RATE_LIMITED drop the Idempotency-Key on the next Publish'
status: Done
assignee:
  - '@frontend-dev'
created_date: '2026-10-16 07:31'
updated_date: '2026-10-16 08:56'
labels:
  - bug
  - 'est:S'
dependencies: []
parent_task_id: TASK-30
ordinal: 354000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Steps: mobile found flow to Publish, API answers CONFLICT (first request with the key still running), press Publish again. Expected (AC: key pinned and kept on NETWORK/5xx/429/CONFLICT): same key, so the API dedupes. Actual: apps/mobile/components/report-found/found-flow.tsx settle() removes the outbox item for every code except sent/queued(non-429), so CONFLICT (outcome 'failed') and RATE_LIMITED get a new uuid; a CONFLICT retry can create a second report. Severity: medium for CONFLICT (duplicate report), low for 429 (nothing stored). Test: report-found.test.tsx 'a CONFLICT keeps the Idempotency-Key' (test.failing, remove .failing on fix).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 After a CONFLICT or RATE_LIMITED answer the next Publish on mobile reuses the same Idempotency-Key (web keepsSubmission parity) while the answers are unchanged
<!-- AC:END -->

## Packet
Branch: agent/task-30.7-outbox-key-mob
