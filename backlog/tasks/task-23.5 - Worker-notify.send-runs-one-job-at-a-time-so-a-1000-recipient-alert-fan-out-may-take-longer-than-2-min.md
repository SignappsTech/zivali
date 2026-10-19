---
id: TASK-23.5
title: >-
  Worker: notify.send runs one job at a time, so a 1000-recipient alert fan-out
  may take longer than 2 min
status: To Do
assignee:
  - '@backend-dev'
created_date: '2026-10-19 19:46'
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
- [ ] #1 A test or benchmark on the scratch DB with the mock push/email providers measures end-to-end delivery for 1000 recipients; the target in C10 (or 2 min if none) is met
- [ ] #2 notify.send concurrency (pg-boss localConcurrency/batch) is set from config with a safe default for the Hetzner worker; provider rate limits (Expo push, SMTP) are respected
<!-- AC:END -->
