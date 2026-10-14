---
id: TASK-6.7
title: 'Matching, chat, notification and alert schema with RLS and seed'
status: To Do
assignee:
  - '@backend-dev'
created_date: '2026-10-14 22:12'
labels:
  - be
  - 'est:M'
milestone: m-0
dependencies:
  - TASK-6.6
references:
  - docs/tech/backend.md
  - docs/tech/contracts/C8-matching.md
  - docs/tech/contracts/C9-chat.md
  - docs/tech/contracts/C10-notifications-alerts.md
parent_task_id: TASK-6
priority: high
ordinal: 127000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Match review, chat, notifications and alerts build in parallel against agreed tables and seeded rows.

## Packet

Unblocks on: Reports, pets and photos schema, deterministic fuzz, public read model, seed merged (TASK-6.6)
Contracts: C8, C9, C10 (in references); conventions in C1
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-6.7-collab-schema
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 matches, match_feedback, conversations, conversation_participants, messages, blocks, notifications, notification_prefs, push_tokens, alert_subscriptions, alert_deliveries and email_outbox exist with constraints and indexes from C8–C10 (GiST on alert centres) and RLS for participants, recipients, managers and staff; RLS matrix tests.
- [ ] #2 messages, conversation_participants and notifications are in the supabase_realtime publication; a test proves a non-participant gets no rows.
- [ ] #3 Seed: suggested and confirmed matches for fixture reports, one conversation with messages, notifications and alert subscriptions for fixture users.
- [ ] #4 data-inventory.json entries are added and `pnpm gen:types` output is committed.
<!-- AC:END -->
