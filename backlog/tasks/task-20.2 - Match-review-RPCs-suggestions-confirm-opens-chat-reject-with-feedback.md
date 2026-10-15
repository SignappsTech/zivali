---
id: TASK-20.2
title: 'Match review API: suggestions, confirm (opens chat), reject with feedback'
status: Done
assignee:
  - '@backend-dev'
created_date: '2026-10-14 22:13'
updated_date: '2026-10-15 19:36'
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

Unblocks on: Matching, chat, notification and alert models with seed merged (TASK-6.7); Chat API: conversations and messages endpoints, Realtime Broadcast with membership policy, retention merged (TASK-21.2)
Contracts: C8, C9 (in references); conventions in C1
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-20.2-matchreview-be
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 GET /v1/reports/:code/matches returns ranked MatchSuggestion items (C8) for managers of the lost report only, with no contact data.
- [ ] #2 POST /v1/matches/:id/confirm sets the match confirmed and the lost report matched, creates the conversation through ChatDomain and notifies the other side; repeated calls are idempotent; an unverified email returns UNVERIFIED_EMAIL.
- [ ] #3 POST /v1/matches/:id/reject hides the pair for good and stores match_feedback with the optional reason.
- [ ] #4 Supertest covers the permission matrix, state transitions and idempotency.
<!-- AC:END -->
