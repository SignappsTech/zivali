---
id: TASK-29.11
title: 'Mobile lost flow: RATE_LIMITED shows the generic text, not the wait in minutes'
status: Done
assignee:
  - '@frontend-dev'
created_date: '2026-10-16 09:01'
labels:
  - bug
  - 'est:XS'
dependencies: []
parent_task_id: TASK-29
ordinal: 355000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Linked: TASK-29 AC#6 (errors specific and localised), TASK-29.9. Steps: mobile lost flow, publish, API answers 429 with details.retry_after_s=720. Expected: 'Poskusite znova cez 12 minut' (errors.RATE_LIMITED, {minutes}) as apps/web/components/report-lost/lost-flow.tsx failed(). Actual: apps/mobile/components/auth/parts.tsx useErrorText maps RATE_LIMITED to RATE_LIMITED_generic ('malo pozneje'); lost-flow.tsx failed() has no RATE_LIMITED branch. Severity: low.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 A 429 with details.retry_after_s on POST /v1/reports shows errors.RATE_LIMITED with minutes (ceil(retry_after_s/60), min 1), as the web flow does; key kept (jest test)
<!-- AC:END -->

## Packet
Branch: agent/task-29.12-lost-errors-mob
