---
id: TASK-6.15
title: 'API rate limits: key anonymous actors by ip_hash, never device_hash alone'
status: To Do
assignee:
  - '@backend-dev'
created_date: '2026-10-15 09:34'
labels:
  - be
  - 'est:XS'
dependencies:
  - TASK-6.12
references:
  - docs/tech/backend.md
parent_task_id: TASK-6
ordinal: 315000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
CH-126. x-device-id is client-chosen and can be rotated, so anonymous actors are rate-limited by ip_hash (or ip_hash+device_hash), never device_hash alone. From the TASK-6.12 fix round.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Anonymous rate-limit key is ip_hash or ip_hash+device_hash, never device_hash alone
- [ ] #2 Test: rotating x-device-id from one IP does not reset the limit
<!-- AC:END -->
Branch: agent/TASK-6.15-ratelimit-ip
