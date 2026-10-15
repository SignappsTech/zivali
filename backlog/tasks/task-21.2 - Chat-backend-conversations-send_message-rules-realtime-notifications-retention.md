---
id: TASK-21.2
title: >-
  Chat API: conversations and messages endpoints, Realtime Broadcast with
  membership policy, retention
status: Done
assignee:
  - '@backend-dev'
created_date: '2026-10-14 22:13'
updated_date: '2026-10-15 17:40'
labels:
  - be
  - 'est:M'
milestone: m-1
dependencies:
  - TASK-6.7
  - TASK-6.12
references:
  - docs/tech/backend.md
  - docs/tech/contracts/C9-chat.md
  - docs/tech/adr/023-realtime-chat.md
  - docs/tech/contracts/C10-notifications-alerts.md
parent_task_id: TASK-21
priority: high
ordinal: 167000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Hidden phone numbers and in-app chat are the main scam defence and the way owners and finders reunite (FR-009).

## Packet

Unblocks on: Matching, chat, notification and alert models with seed merged (TASK-6.7); API auth and platform middleware: JWKS verification, guards, rate limits, idempotency, ctx, audit, public config merged (TASK-6.12)
Contracts: C9, C10, C7 (in references); conventions in C1
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-21.2-chat-be
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 POST and GET /v1/conversations, GET and POST /v1/conversations/:id/messages, POST /v1/conversations/:id/read and /block behave as in C9, including anonymous report managers through their anonymous session.
- [x] #2 Sending refuses non-participants, blocked senders, read-only conversations and over-limit senders (30/min, 500/day), flags has_link, and allows location messages only from a manager of the related report.
- [x] #3 After a message is stored the API broadcasts message.created on the private channel conversation:<id> with realtime.send in the same transaction; the realtime.messages RLS policy with app.can_join_topic lets only participants receive and clients cannot broadcast; a two-client test delivers in under 2 s p95 locally.
- [x] #4 Offline participants get a chat_message notification through enqueueNotification (deduped per conversation per 5 minutes, no message body in the payload).
- [x] #5 Conversations become read-only when the related report closes, and retention.purge deletes messages 6 months after close; Supertest covers the permission matrix and every refusal.
<!-- AC:END -->
