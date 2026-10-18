---
id: TASK-40.3
title: >-
  ai.extract job: Claude vision via the Anthropic SDK, hash cache, caps,
  moderation signal, fail open
status: Done
assignee:
  - '@backend-dev'
created_date: '2026-10-18 21:22'
updated_date: '2026-10-18 23:48'
labels:
  - be
  - 'est:M'
milestone: m-2
dependencies:
  - TASK-40.1
  - TASK-40.2
references:
  - docs/tech/backend.md
  - docs/tech/contracts/C19-ai-extraction.md§Pipeline
  - docs/tech/contracts/C19-ai-extraction.md§Provider call
  - docs/tech/adr/012-ai-attribute-extraction.md§Decision
parent_task_id: TASK-40
priority: high
ordinal: 373200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The extraction service of FR-013: one capped, cached Claude vision call per photo that never blocks a form, and the moderation signal FR-018 needs later.

## Packet

Unblocks on: AI foundation merged (TASK-40.1); AI wire types and schemas merged (TASK-40.2)
Contracts: C19 (in references), C20 §Jobs for the photo.embed hand-off; conventions in C1
Local and tests run on AI_PROVIDER=mock; never call the paid API from tests.
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-40.3-ai-extract
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 An accepted photo runs ai.extract and stores an ai_results row validated by aiExtractionSchema; another photo with the same sha256 gets outcome cached with no adapter call (test asserts the call count)
- [ ] #2 Caps per C19: ai.enabled false or AI_PROVIDER off, the monthly budget, 10 photos a day per anonymous owner and 30 per signed-in owner give skipped_* outcomes without a call; refusal, invalid output and the last failed retry give refused, invalid, failed; each photo gets one ai_calls row with tokens, cost and latency, and the photo pipeline never fails
- [ ] #3 adapters/ai/anthropic.ts uses @anthropic-ai/sdk: model AI_VISION_MODEL, effort AI_VISION_EFFORT, thinking disabled, output_config.format from the zod JSON schema, no sampling parameters, the 1024 px JPEG from display.jpg, no ids, metadata, location or user text (a test inspects the built request); typed SDK errors only
- [ ] #4 The mock adapter returns fixtures by sha256 (deterministic default plus refusal, invalid and person fixtures); moderation is stored; photo.embed is sent on every outcome except photos flagged person_prominent or nsfw or with animal none or other
- [ ] #5 retention.purge deletes ai_calls older than 62 days and ai_results whose sha256 no photo has; ai.extract.done is logged with outcome and latency_ms; pnpm verify green
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
From the TASK-40.1 review (2026-10-19): an unset AI_PROVIDER on staging or production must never mean anthropic; default to the mock/no-op adapter and require an explicit opt-in (owner approvals pending: privacy text, Voyage opt-out).

From the TASK-40.2 review (2026-10-19): the structured-output JSON schema carries no bounds or descriptions (stripped for output_config.format). The adapter must: not use SDK zod auto-parse; clamp confidences to 0-1 and drop other-species breeds (isBreedOf) on the raw JSON; then run aiExtractionSchema.safeParse as the final gate. The prompt must state the limits: at most 3 breeds, 3 colours, 5 marks; confidences 0-1; animal_count 0, 1 or 2.
<!-- SECTION:NOTES:END -->
