---
id: TASK-42.1
title: >-
  photo.embed job: Voyage multimodal-3.5 adapter, hash reuse, flagged photos
  skipped, budget, retries and dead-letter log
status: In Progress
assignee:
  - '@backend-dev'
created_date: '2026-10-18 21:24'
updated_date: '2026-10-18 22:20'
labels:
  - be
  - 'est:S'
milestone: m-2
dependencies:
  - TASK-40.1
references:
  - docs/tech/backend.md
  - docs/tech/contracts/C20-image-embeddings.md§Jobs
  - docs/tech/contracts/C20-image-embeddings.md§Adapter
  - docs/tech/contracts/C19-ai-extraction.md§Pipeline
parent_task_id: TASK-42
priority: high
ordinal: 380200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Every eligible photo gets one comparable vector soon after upload, so visual matching can find pets that owners and finders describe differently (FR-014).

## Packet

Unblocks on: AI foundation merged (TASK-40.1). Tests send photo.embed directly with the mock embedder; ai.extract (TASK-40.3) is not needed.
Contracts: C20 (in references); conventions in C1. Local and tests run on EMBEDDER_PROVIDER=mock.
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-42.1-photo-embed
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 photo.embed stores one L2-normalised 1024-d vector per photo and model for embedding.model, and also embedding.next_model when set; a photo whose sha256 already has a vector for the model reuses it with no adapter call (test)
- [ ] #2 Photos not accepted or published, and photos flagged person_prominent or nsfw or with animal none or other, are skipped; the monthly budget skips with a log line; each call writes an ai_calls row (provider voyage, pixels, cost)
- [ ] #3 The voyage adapter sends voyage-multimodal-3.5 (model from config), image_base64 of the 1024 px JPEG and output_dimension 1024 with a 10 s timeout and no ids or text; 429 and 5xx throw for retry; the last failed attempt logs photo.embed.dead_letter without image data
- [ ] #4 The mock embedder derives vectors from test/fixtures/embeddings/labels.json (same animal about 0.9 cosine, different about 0.1) and else from the hash; tests; pnpm verify green
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
From the TASK-40.1 review and CH-562 (2026-10-19): photos uploaded while ai.extract is a stub have no ai_results row; embedding and backfill must skip any photo without a successful safety check (no ai_results row = not embedded).
<!-- SECTION:NOTES:END -->
