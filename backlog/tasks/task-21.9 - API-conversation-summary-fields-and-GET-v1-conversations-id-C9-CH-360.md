---
id: TASK-21.9
title: 'API: conversation summary fields and GET /v1/conversations/:id (C9; CH-360)'
status: To Do
assignee:
  - '@backend-dev'
created_date: '2026-10-19 21:32'
labels:
  - be
  - 'est:S'
  - web
dependencies: []
references:
  - docs/tech/backend.md
  - docs/tech/contracts/C9-chat.md§REST
parent_task_id: TASK-21
priority: medium
ordinal: 486200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Planned in C9 §REST: P12 rows and the thread header show more than ConversationSummary carries, and a thread beyond the first inbox page has no summary.

## Packet
Unblocks on: -
Branch: agent/task-21.9-conversation-summary-fields
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 `ConversationSummary.about_report` gains `name` (lost reports, else null) and `status` (report status); the summary gains `last_activity_at` (last message, else creation) and `blocked: 'by_me' | 'me' | 'none'`
- [ ] #2 `GET /v1/conversations/:id` returns one ConversationSummary to a participant; anyone else → NOT_FOUND
- [ ] #3 Route tests incl. both blocked states; no participant email or phone; openapi.json and `gen:api`
<!-- AC:END -->
