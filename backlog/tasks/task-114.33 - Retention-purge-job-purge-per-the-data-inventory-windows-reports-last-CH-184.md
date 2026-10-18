---
id: TASK-114.33
title: >-
  Retention purge job: purge per the data-inventory windows, reports last
  (CH-184)
status: To Do
assignee:
  - '@backend-dev'
created_date: '2026-10-18 22:06'
labels:
  - be
  - 'est:M'
  - no-design
dependencies: []
references:
  - docs/tech/backend.md
  - docs/05-quality-security-plan.md
  - docs/tech/contracts/C4-reports-and-pets.md
parent_task_id: TASK-114
priority: medium
ordinal: 395200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
apps/api/jobs/retention.purge.job.ts purges rate limits, idempotency keys, chats, photos and device hashes, but not the rest of the data-inventory windows. Add them. Delete reports last: only after their conversations' 6-month window, because matches, conversations and alert_deliveries now cascade from reports (TASK-6.16).

## Packet

Unblocks on: nothing open (TASK-6.16, TASK-26.7 merged). Windows come from the data inventory in docs/05 section Security, privacy and compliance; ask the lead for any window the lawyer has not confirmed.
Review: tech-lead code review; run pnpm verify before reporting done.
Branch: agent/task-114.33-retention-purge
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 retention.purge purges every record class of the data inventory at its window (windows in app_config where a key exists); each class is idempotent, batched, and logs counts only.
- [ ] #2 Reports are deleted last, only once their conversations are past the 6-month read-only window; tests with a faked clock check cascade order (matches, conversations, alert_deliveries go with the report) and that nothing younger is touched.
<!-- AC:END -->
