---
id: TASK-17.20
title: 'API: submission guard also holds by IP hash (C7 Submission guard; CH-321)'
status: To Do
assignee:
  - '@backend-dev'
created_date: '2026-10-19 21:30'
labels:
  - be
  - 'est:XS'
  - web
dependencies: []
references:
  - docs/tech/backend.md
  - docs/tech/contracts/C7-anonymous-manage-link.md§Submission guard
parent_task_id: TASK-17
priority: medium
ordinal: 479200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Decision CH-321: the device-volume hold keys on a client-chosen x-device-id, so a script rotating it stays visible within the IP rate limits. The hold also counts anonymous reports per IP hash.

## Packet
Unblocks on: -
Branch: agent/task-17.20-hold-by-ip-hash
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Migration adds `reports.ip_hash text null` (anonymous reports only, the request's ip_hash), index (ip_hash, created_at); retention.purge clears it 48 h after creation; data inventory updated
- [ ] #2 Hold reason `ip_volume` when the IP hash has more than 10 anonymous reports in 48 h (same comparison as `device_volume`); a test with a rotating x-device-id from one IP is held
<!-- AC:END -->
