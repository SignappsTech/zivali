---
id: TASK-42.3
title: >-
  Embedding backfill and model change: embedding.backfill job, deploy seeder 41,
  prune
status: To Do
assignee:
  - '@backend-dev'
created_date: '2026-10-18 21:24'
updated_date: '2026-10-19 00:56'
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

Follow-ups from the TASK-42.1 review (2026-10-19), non-blocking, fold in here since 42.3 touches the same domain: (1) embeddings.domain.ts ~105: dead-letter a 400/401 right away instead of 5 retries; (2) embeddings.domain.ts ~73-80: a DB error before the per-model try logs no dead_letter on the last attempt; (3) embeddings.dao.ts ~70: mock calls are recorded as provider voyage, so local mock spend counts toward the budget (record provider mock).

Parity with the TASK-40.3 review (2026-10-19): make the embedder like the AI adapter: EMBEDDER_PROVIDER=mock outside APP_ENV=local must resolve to off (no fake vectors for real photos on staging/production). Add a select.test case.

From the TASK-42.2 review (2026-10-19), watch items: hnsw.max_scan_tuples (default 20k) caps recall above about 50k photos, so the backfill/model-change plan should note it; the pgvector < 0.8 fallback returns too few filtered rows but is dead code behind the migration's version check.
<!-- SECTION:NOTES:END -->
