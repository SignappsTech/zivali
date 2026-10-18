---
id: TASK-114.37
title: 'GET /v1/admin/queues: accept any uuid-shaped job id in FailedJob (CH-194)'
status: Done
assignee:
  - '@backend-dev'
created_date: '2026-10-18 22:08'
updated_date: '2026-10-18 22:21'
labels:
  - be
  - bug
  - 'est:XS'
  - no-design
dependencies: []
references:
  - docs/tech/backend.md
parent_task_id: TASK-114
priority: medium
ordinal: 399200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
GET /v1/admin/queues answers 500 once any failed job has a non-RFC id (seen on a scratch DB: notify.send job fb94ce5c-0853-58fe-e1ba-..., variant e) because FailedJob.id is strict z.uuid() in the validation package. Accept any uuid-shaped string (regex) for job ids.

## Packet

Unblocks on: nothing open (TASK-14.1 merged).
Review: tech-lead code review; run pnpm verify before reporting done.
Branch: agent/task-114.37-failedjob-id
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 FailedJob.id accepts any 8-4-4-4-12 hex id; a route test with a failed job whose id has a non-RFC variant returns 200 and the item; openapi.json regenerated if the schema output changes.
<!-- AC:END -->
