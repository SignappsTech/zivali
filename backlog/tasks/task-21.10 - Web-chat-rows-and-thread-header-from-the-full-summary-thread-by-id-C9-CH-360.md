---
id: TASK-21.10
title: >-
  Web chat: rows and thread header from the full summary, thread by id (C9;
  CH-360)
status: To Do
assignee:
  - '@frontend-dev'
created_date: '2026-10-19 21:37'
labels:
  - fe
  - 'est:S'
  - web
dependencies:
  - TASK-21.9
  - TASK-21.1
references:
  - docs/tech/frontend.md
  - docs/tech/contracts/C9-chat.md§REST
  - docs/design/pages/P12-chat.md
  - docs/content/pages/P12-chat.md
parent_task_id: TASK-21
priority: medium
ordinal: 501200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Uses the C9 summary additions and GET /v1/conversations/:id.

## Packet
Unblocks on: TASK-21.9 (summary fields, GET /v1/conversations/:id) merged; design TASK-21.1 done
Branch: agent/task-21.10-web-chat-summary-fields
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Inbox rows show the pet name (`chat.row_title_fallback` when null), the time from `last_activity_at` and the P12 status word from `about_report.status` (matched, reunited) or read_only
- [ ] #2 The thread knows a blocked state from `blocked` before any send; /inbox/[id] loads its summary with GET /v1/conversations/:id (no inline error for a conversation beyond the first page)
- [ ] #3 Component tests; chat e2e still passes
<!-- AC:END -->
