---
id: TASK-20.2
title: 'Match review RPCs: suggestions, confirm (opens chat), reject with feedback'
status: To Do
assignee:
  - '@backend-dev'
created_date: '2026-10-14 22:13'
labels:
  - be
  - 'est:S'
milestone: m-1
dependencies:
  - TASK-6.7
  - TASK-21.2
references:
  - docs/tech/backend.md
  - docs/tech/contracts/C8-matching.md
  - docs/tech/contracts/C9-chat.md
parent_task_id: TASK-20
priority: high
ordinal: 168000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Owners judge and act on suggestions; confirming must open a chat and rejecting must stop the pair from reappearing (FR-008).

## Packet

Unblocks on: Matching, chat, notification and alert schema with RLS and seed merged (TASK-6.7); Chat backend: conversations, send_message rules, realtime, notifications, retention merged (TASK-21.2)
Contracts: C8, C9 (in references); conventions in C1
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-20.2-matchreview-be
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 get_match_suggestions returns ranked suggestions for a lost report's managers with only the C8 MatchSuggestion fields (no contact data).
- [ ] #2 confirm_match sets the match confirmed and the lost report matched, opens the conversation through start_conversation and notifies the other side; repeated calls are idempotent; an unverified email returns UNVERIFIED_EMAIL.
- [ ] #3 reject_match hides the pair for good and stores match_feedback with the optional reason.
- [ ] #4 pgTAP covers permissions (lost managers only), state transitions and idempotency.
<!-- AC:END -->
