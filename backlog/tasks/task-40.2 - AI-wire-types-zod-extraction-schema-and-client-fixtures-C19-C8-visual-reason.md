---
id: TASK-40.2
title: >-
  AI wire types, zod extraction schema and client fixtures (C19, C8 visual
  reason)
status: In Progress
assignee:
  - '@backend-dev'
created_date: '2026-10-18 21:22'
updated_date: '2026-10-18 22:14'
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
- [x] #1 packages/types exports AiExtraction, PhotoAttributes, Suggestion<T>, AiNotice and VisualBand; MatchReason gains { code: 'visual', band, lost_photo_id, other_photo_id }
- [x] #2 @zivali/validation/ai exports aiExtractionSchema (zod), the JSON schema generated from it for output_config.format (snapshot test) and photoAttributesSchema; the new subpath has its tsconfig paths entries in all the places backend.md lists
- [x] #3 packages/api/src/__fixtures__/ai.ts has fixtures for pending, unavailable and ready (each notice, low-confidence fields); createMockApi serves GET /v1/photos/:id/attributes going pending then ready; a match fixture carries a visual reason
- [ ] #4 Unit tests for the schemas (valid, invalid, other-species breed codes rejected); pnpm verify green
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
TASK-40.2 (backend-dev, 2026-10-19): types (domain/ai.ts, VISUAL_BANDS, AI_NOTICES, AI_ANIMALS, MatchReason = AttributeMatchReason | VisualMatchReason, MATCH_REASON_CODES + visual); @zivali/validation/ai (aiExtractionSchema with the species refine, aiExtractionJsonSchema = z.toJSONSchema with enums inlined minus min/max/maxItems/maxLength, photoAttributesSchema named PhotoAttributes); fixtures packages/api/src/__fixtures__/ai.ts (pending, unavailable, ready, low confidence, each notice, attributesPendingThenReady handler) and visualMatch in __fixtures__/matches.ts. Paths: the existing `@zivali/validation/*` wildcard (tsconfig.base, web, mobile tsconfig, jest moduleNameMapper) already covers /ai, no new entries. apps/api/openapi.json regenerated (MatchReason oneOf, VisualBand, VisualMatchReason, AiNotice). The union broke `reason(...)?.hours_band` in apps/{web,mobile}/components/matches/parts.tsx: the helper now narrows to AttributeMatchReason (no behaviour change). Not run here per the worktree rules: full pnpm verify (web next build); API routes tests need auth.users, which the scratch DB has not. Ran: prettier/eslint on changed files, tsc in types, validation, packages/api, apps/api, web, mobile; validation 117, packages/api 84, web matches+report 204, mobile matches 24, api matching domain 26/27 (the 1 needs auth.users), gen-openapi --check.
<!-- SECTION:NOTES:END -->
