---
id: TASK-29.14
title: 'Web lost flow: skip the photo step for a saved pet with photos'
status: To Do
assignee:
  - '@frontend-dev'
created_date: '2026-10-18 21:21'
updated_date: '2026-10-18 21:23'
labels:
  - fe
  - 'est:XS'
  - no-design
milestone: m-1
dependencies:
  - TASK-29.13
  - TASK-29.4
references:
  - docs/tech/frontend.md
parent_task_id: TASK-29
priority: medium
ordinal: 378200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
R-005.6 (CH-348).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given a saved pet with photos, when the owner reports it lost on web, then the photo step is skipped and the report carries the pet's photos; photos can still be added
<!-- AC:END -->

## Packet

Unblocks on: Contract C4/C5 change merged: create_report copies a saved pet's photos (TASK-29.13); web lost flow merged (TASK-29.4)
Review: local
