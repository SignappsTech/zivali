---
id: TASK-19.1
title: >-
  Matching engine v1: match.report job, TypedSQL candidates, scoring, idempotent
  suggestions
status: To Do
assignee:
  - '@backend-dev'
created_date: '2026-10-14 22:13'
updated_date: '2026-10-14 23:38'
labels:
  - be
  - 'est:M'
milestone: m-1
dependencies:
  - TASK-6.7
  - TASK-6.3
  - TASK-6.5
references:
  - docs/tech/backend.md
  - docs/tech/contracts/C8-matching.md
  - docs/tech/contracts/C4-reports-and-pets.md
  - docs/tech/adr/004-async-jobs-queue-and-worker.md
parent_task_id: TASK-19
priority: high
ordinal: 165000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The product promise is active matching; v1 must be fast, explainable and safe to run on every new report (FR-008, G-2).

## Packet

Unblocks on: Matching, chat, notification and alert models with seed merged (TASK-6.7); Worker and jobs: pg-boss, queue registry with stubs, schedules, keep-alive, drain merged (TASK-6.3); Domain wire types and DTOs, zod request schemas, chip normalisation and breed codes merged (TASK-6.5)
Contracts: C8, C4 (in references); conventions in C1
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-19.1-matching-be
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Publishing a report or a relevant update queues match.report; MatchingDomain stores suggestions idempotently (unique pair, never resurrecting rejected pairs) within 2 minutes p95 on the local stack.
- [ ] #2 Equal normalised chips on opposite sides score 1.0 with chip_match and strength strong and immediately queue a match_chip notification that ignores quiet hours; a chip on a sighting adds the chip_sighting reason.
- [ ] #3 Without a chip, species must match, sex conflicts are excluded, and the C8 score (distance decay, time proximity, attribute overlap) with weights, threshold 0.5 and top 10 from app_config applies; reasons use bands only (no exact distance).
- [ ] #4 scoreMatch lives in @zivali/validation/matching; candidates come from TypedSQL prisma/sql/matchCandidates.sql using spatial indexes; first_match_at is recorded.
- [ ] #5 New suggestions with strength good or better notify the lost report's managers once; neither side sees the other's contact data.
<!-- AC:END -->
