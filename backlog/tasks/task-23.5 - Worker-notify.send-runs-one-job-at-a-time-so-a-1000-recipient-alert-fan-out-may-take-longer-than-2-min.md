---
id: TASK-23.5
title: >-
  Worker: notify.send runs one job at a time, so a 1000-recipient alert fan-out
  may take longer than 2 min
status: In Progress
assignee:
  - '@backend-dev'
created_date: '2026-10-19 19:46'
updated_date: '2026-10-19 20:16'
labels:
  - tech
  - 'est:S'
  - web
dependencies: []
references:
  - docs/tech/contracts/C10-notifications-alerts.md
parent_task_id: TASK-23
priority: medium
ordinal: 448200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Risk noted by QA TASK-23.4 (2026-10-19): fan-out of 1000 subscribers takes 5.8 s, but notify.send has localConcurrency 1, so the last alert may arrive minutes later. Not tested yet.

## Packet
Unblocks on: -
Branch: agent/task-23-notify-concurrency
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 A test or benchmark on the scratch DB with the mock push/email providers measures end-to-end delivery for 1000 recipients; the target in C10 (or 2 min if none) is met
- [x] #2 notify.send concurrency (pg-boss localConcurrency/batch) is set from config with a safe default for the Hetzner worker; provider rate limits (Expo push, SMTP) are respected
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Root cause: notify.send had 1 pg-boss poller with batchSize 1, which waits the 2 s poll after every job (~2000 s for 1000 alerts). Now NOTIFY_SEND_CONCURRENCY pollers (default 10, 1-20), 10 jobs per fetch run one at a time, burstWhenBatchFull, perJobResults (a failure retries only that job). Bench test/perf/alerts.perf.ts on scratch DB task_23_5, mock push+email delayed 150 ms each, every recipient push+email: 41-43 s at 10, 50-58 s at 8, 104 s at 4; 0 ms delay 13-23 s at 4-8, 73 s at 1. In flight caps provider rate at ~10/round trip (~65 req/s at 150 ms), far below Expo 600/s; DB pool stays 5.
<!-- SECTION:NOTES:END -->
