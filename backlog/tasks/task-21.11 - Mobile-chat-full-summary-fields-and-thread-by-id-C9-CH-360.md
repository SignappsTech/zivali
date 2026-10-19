---
id: TASK-21.11
title: 'Mobile chat: full summary fields and thread by id (C9; CH-360)'
status: To Do
assignee:
  - '@frontend-dev'
created_date: '2026-10-19 21:41'
labels:
  - fe
  - 'est:S'
  - mobile
dependencies:
  - TASK-21.9
  - TASK-21.1
references:
  - docs/tech/frontend.md
  - docs/tech/contracts/C9-chat.md§REST
  - docs/design/pages/P12-chat.md
parent_task_id: TASK-21
priority: low
ordinal: 508200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Mobile side of the C9 summary additions; rows and the thread header fall back today.

## Packet
Unblocks on: TASK-21.9 merged; design TASK-21.1 done
Branch: agent/task-21.11-mobile-chat-summary-fields
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Rows and the thread header use pet name, `last_activity_at`, the status word and `blocked`; the thread loads its summary with GET /v1/conversations/:id; jest-expo tests
<!-- AC:END -->
