---
id: TASK-21.2
title: >-
  Chat backend: conversations, send_message rules, realtime, notifications,
  retention
status: To Do
assignee:
  - '@backend-dev'
created_date: '2026-10-14 22:13'
labels:
  - be
  - 'est:M'
milestone: m-1
dependencies:
  - TASK-6.7
references:
  - docs/tech/backend.md
  - docs/tech/contracts/C9-chat.md
  - docs/tech/contracts/C10-notifications-alerts.md
  - docs/tech/contracts/C7-anonymous-manage-link.md
parent_task_id: TASK-21
priority: high
ordinal: 167000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Hidden phone numbers and in-app chat are the main scam defence and the way owners and finders reunite (FR-009).

## Packet

Unblocks on: Matching, chat, notification and alert schema with RLS and seed merged (TASK-6.7)
Contracts: C9, C10, C7 (in references); conventions in C1
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-21.2-chat-be
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 start_conversation, send_message, mark_read, block_participant and list_conversations behave as in C9, including anonymous report managers participating through their anonymous session.
- [ ] #2 send_message refuses non-participants, blocked senders, read-only conversations and over-limit senders (30/min, 500/day), flags has_link, and allows location messages only from a manager of the related report.
- [ ] #3 Offline participants get a chat_message notification through enqueue_notification (deduped per conversation per 5 minutes, no message body in the payload).
- [ ] #4 Conversations become read-only when the related report closes, and purge_retention deletes messages 6 months after close.
- [ ] #5 Realtime delivers a new message to the other participant in under 2 s p95 on the local stack (integration test); pgTAP covers RLS and every refusal.
<!-- AC:END -->
