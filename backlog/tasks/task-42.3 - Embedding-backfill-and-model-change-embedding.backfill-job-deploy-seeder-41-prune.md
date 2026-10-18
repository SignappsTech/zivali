---
id: TASK-42.3
title: >-
  Embedding backfill and model change: embedding.backfill job, deploy seeder 41,
  prune
status: To Do
assignee:
  - '@backend-dev'
created_date: '2026-10-18 21:24'
updated_date: '2026-10-18 22:13'
labels:
  - be
  - 'est:S'
milestone: m-2
dependencies:
  - TASK-42.1
references:
  - docs/tech/backend.md
  - docs/tech/contracts/C20-image-embeddings.md§Jobs
  - >-
    docs/tech/contracts/C20-image-embeddings.md§Config keys (migration of
    TASK-40.1)
parent_task_id: TASK-42
priority: high
ordinal: 382200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Photos uploaded before M3 get vectors too, and a later model change re-embeds without stopping matching (FR-014 AC#3).

## Packet

Unblocks on: photo.embed job merged (TASK-42.1)
Contracts: C20 §Jobs (in references); conventions in C1
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-42.3-embedding-backfill
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 embedding.backfill pages eligible photos without a vector for the model, sends photo.embed with singleton key photo_id at no more than embedding.backfill_per_minute and logs embedding.backfill.done with remaining 0; a second run makes no duplicate calls
- [ ] #2 Seeder 41-embedding-backfill queues it on deploy when EMBEDDER_PROVIDER is not off and an eligible photo lacks a vector for embedding.model; a failure is logged and never stops the deploy
- [ ] #3 The model change (next_model, backfill, switch, prune) is tested end to end with two mock models, and similarity reads only embedding.model throughout
- [ ] #4 Tests; pnpm verify green
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
From the TASK-40.1 review and CH-562 (2026-10-19): photos uploaded while ai.extract is a stub have no ai_results row; embedding and backfill must skip any photo without a successful safety check (no ai_results row = not embedded).
<!-- SECTION:NOTES:END -->
