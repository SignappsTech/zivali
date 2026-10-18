---
id: TASK-40.2
title: >-
  AI wire types, zod extraction schema and client fixtures (C19, C8 visual
  reason)
status: To Do
assignee:
  - '@backend-dev'
created_date: '2026-10-18 21:22'
updated_date: '2026-10-18 21:29'
labels:
  - be
  - 'est:S'
milestone: m-2
dependencies: []
references:
  - docs/tech/contracts/C19-ai-extraction.md§Model output
  - docs/tech/contracts/C19-ai-extraction.md§REST
  - docs/tech/contracts/C8-matching.md§Visual similarity
  - docs/tech/frontend.md§Repo map (your side)
parent_task_id: TASK-40
priority: high
ordinal: 372200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The contract as code: types, zod schemas and client fixtures, so the worker, the endpoint and both apps code against the same shapes from day one and the frontend never waits for the backend.

## Packet

Unblocks on: - (no dependencies)
Contracts: C19, C8 §Visual similarity; conventions in C1
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-40.2-ai-types
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 packages/types exports AiExtraction, PhotoAttributes, Suggestion<T>, AiNotice and VisualBand; MatchReason gains { code: 'visual', band, lost_photo_id, other_photo_id }
- [ ] #2 @zivali/validation/ai exports aiExtractionSchema (zod), the JSON schema generated from it for output_config.format (snapshot test) and photoAttributesSchema; the new subpath has its tsconfig paths entries in all the places backend.md lists
- [ ] #3 packages/api/src/__fixtures__/ai.ts has fixtures for pending, unavailable and ready (each notice, low-confidence fields); createMockApi serves GET /v1/photos/:id/attributes going pending then ready; a match fixture carries a visual reason
- [ ] #4 Unit tests for the schemas (valid, invalid, other-species breed codes rejected); pnpm verify green
<!-- AC:END -->
