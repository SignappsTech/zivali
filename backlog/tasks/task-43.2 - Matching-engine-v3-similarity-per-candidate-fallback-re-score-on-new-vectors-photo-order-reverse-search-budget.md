---
id: TASK-43.2
title: >-
  Matching engine v3: similarity per candidate, fallback, re-score on new
  vectors, photo order, reverse-search budget
status: In Progress
assignee:
  - '@backend-dev'
created_date: '2026-10-18 21:24'
updated_date: '2026-10-19 01:05'
labels:
  - be
  - 'est:M'
milestone: m-2
dependencies:
  - TASK-43.1
  - TASK-42.1
  - TASK-42.2
references:
  - docs/tech/backend.md
  - docs/tech/contracts/C8-matching.md§Visual similarity
  - docs/tech/contracts/C20-image-embeddings.md§Queries
parent_task_id: TASK-43
priority: high
ordinal: 384200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Photo matching runs on every report, re-scores pairs once their photos are embedded, and keeps working on attributes alone when vectors or the provider are missing (FR-014).

## Packet

Unblocks on: v3 scorer merged (TASK-43.1); photo.embed job merged (TASK-42.1); vector queries merged (TASK-42.2)
Contracts: C8 (engine, REST, config keys), C20 §Queries; conventions in C1
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-43.2-engine-v3
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 match.report gets V for all candidates in one similarity call (embedding.model, floor and ceiling from app_config); missing vectors, a query error or the 2 s timeout score with visual null, log matching.visual_unavailable, and the job succeeds
- [ ] #2 photo.embed sends match.report (singleton key report_id, 60 s) after a new vector of a photo on an open report; the pair is re-scored with V and its managers are notified at most once
- [ ] #3 A migration adds matching.weights_visual, matching.visual_floor and matching.visual_ceiling; seeder 40-matching-rescore moves v2 rows to v3; GET /v1/reports/:code/matches orders other.photos with other_photo_id first when a visual reason exists
- [ ] #4 A new found report against 1000 open lost reports with photos finishes in under 5 s on the local stack (test); pnpm verify green
<!-- AC:END -->
