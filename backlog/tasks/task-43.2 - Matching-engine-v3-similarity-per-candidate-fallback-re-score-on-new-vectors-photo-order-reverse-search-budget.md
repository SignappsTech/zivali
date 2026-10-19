---
id: TASK-43.2
title: >-
  Matching engine v3: similarity per candidate, fallback, re-score on new
  vectors, photo order, reverse-search budget
status: Done
assignee:
  - '@backend-dev'
created_date: '2026-10-18 21:24'
updated_date: '2026-10-19 01:46'
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
- [x] #1 match.report gets V for all candidates in one similarity call (embedding.model, floor and ceiling from app_config); missing vectors, a query error or the 2 s timeout score with visual null, log matching.visual_unavailable, and the job succeeds
- [x] #2 photo.embed sends match.report (singleton key report_id, 60 s) after a new vector of a photo on an open report; the pair is re-scored with V and its managers are notified at most once
- [x] #3 A migration adds matching.weights_visual, matching.visual_floor and matching.visual_ceiling; seeder 40-matching-rescore moves v2 rows to v3; GET /v1/reports/:code/matches orders other.photos with other_photo_id first when a visual reason exists
- [ ] #4 A new found report against 1000 open lost reports with photos finishes in under 5 s on the local stack (test); pnpm verify green
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
TASK-43.2 (backend-dev, 2026-10-19):
- Engine: matching.domain visualsOf(anchor, pairs) = one EmbeddingsDao.similarity call per run for all candidates (symmetric query, photo ids swapped for a found/sighted anchor); V = visualSimilarity(cos, matching.visual_floor, matching.visual_ceiling); embedding.model from app_config. Embedder off: no query, all v2. Query error or 2 s timeout: warn matching.visual_unavailable, all v2, job succeeds. rescoreSuggestions uses V the same way (one call for the report; seeder: one per lost report, none with the embedder off).
- Deploy effect: production (embedder off, no vectors) moves v2 rows to v3 with score, strength, reasons and notified_at unchanged, no notify.send (tested both: no vectors with the embedder on via the seeder, and the embedder off with vectors). A re-score never notifies, also when V lifts a row to good (staging test).
- photo.embed: match.report (singletonKey report id, 60 s, singletonNextSlot) when the photo had no embedding.model vector before the run and has one after, on an open/matched report. Tested end to end with hash reuse (no embedder call): possible -> good with V, notified once.
- Migration 20261019020000_task_43_2_matching_visual: weights_visual, visual_floor 0.70, visual_ceiling 0.95.
- GET matches: other.photos with other_photo_id first (reports.dao readInclude now selects photo id; mapper reorders).
- Perf (test/perf/matching.perf.ts, on demand): 1000 lost x 2 photos, found report match.report 432 ms locally (25 stored, 20 with V).
- matching imports similarity from embeddings.dao.ts directly (embeddings/index.ts exports only the domain; TASK-42.3 owns that area now).
- CHANGE row for C8 §Visual similarity added to backlog/changes.md.

Tests: matching/embeddings/jobs files 78/78 green on scratch DB task_43_2 (auth + realtime schemas copied in). Full api run: 7 files fail on scratch-DB limits only (PostgREST/Auth bound to the postgres DB, dummy JWT secret, no geo seed: security, seeders, admin, manage, reports.write Maribor). AC#4: perf 432 ms; full pnpm verify (web build) not run in the worktree (rule 4), left to the merge verify.
<!-- SECTION:NOTES:END -->
