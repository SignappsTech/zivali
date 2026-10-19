---
id: TASK-42.4
title: 'QA: Photo embeddings and vector index'
status: Done
assignee:
  - '@qa'
created_date: '2026-10-18 21:26'
updated_date: '2026-10-19 02:04'
labels:
  - qa
  - 'qa:pass'
  - 'est:XS'
milestone: m-2
dependencies:
  - TASK-42.1
  - TASK-42.2
  - TASK-42.3
  - TASK-40.3
references:
  - docs/tech/frontend.md
  - docs/tech/contracts/C20-image-embeddings.md
parent_task_id: TASK-42
priority: high
ordinal: 391200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Verify TASK-42 on main against its acceptance criteria once all its tasks are merged.

## Packet

Unblocks on: TASK-42.1 merged; TASK-42.2 merged; TASK-42.3 merged; TASK-40.3 merged
Review: QA report in the task notes; bugs as tasks.
Branch: agent/task-42.4-qa
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Given a new photo, when stored, then an embedding is generated asynchronously (p95 within 60 s), saved in pgvector with an ANN index and retried on failure with a dead-letter log.
- [x] #2 Given existing photos, when the backfill runs, then all eligible photos are embedded without duplicate model calls (image hash cache).
- [x] #3 Given a query photo, when searching, then nearest neighbours restricted by species and radius return in under 300 ms for 50k photos locally.
- [x] #4 Given a model change, when the embedding model is replaced, then a versioned column and re-embed job support it without downtime.
- [x] #5 Given local development and tests, when no model credentials exist, then a deterministic mock or small local model is used.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
QA (2026-10-19, main 9ed57466, scratch DB task_42_4, EMBEDDER_PROVIDER=mock, dummy env, no Voyage calls): PASS.
- Tests: embeddings.domain/dao/backfill, adapters/embedder+select, seeders/embedding-backfill: 58/58. With ai.domain, photos.domain, photo-attributes, jobs, security/ai-schema, matching.visual and all seeders: 202 passed; 3 failed = seeders 00-users/10-reports/20-collab (need the Auth API; dummy SUPABASE_URL on a scratch DB, known since TASK-42.3, not TASK-42). api tsc and lint (eslint + openapi check) green. Full pnpm verify not run (web/mobile builds out of scope).
- AC1: photo hook -> ai.extract -> photo.embed tested; 1024-d L2 vector per model, HNSW, 5 retries, dead_letter on last attempt and at once on 400/401, no image data in logs. p95 <= 60 s is a staging metric (C20): not measurable while the embedder is off.
- AC2: backfill paces at backfill_per_minute, done with remaining 0, second run no calls, singleton key, sha256 reuse with no adapter call.
- AC3: perf suite once (embeddings.perf.ts, 50k vectors/10k reports): nearest p95 106 ms over 120 queries (5 km 11, 250 km 102), HNSW used above 2000 candidates; similarity 1000x25 pairs 48-50 ms.
- AC4: model change A -> B end to end (next_model, backfill, switch, prune), similarity reads only embedding.model; versioned by (photo_id, model) PK.
- AC5: mock default locally/tests, labels.json ~0.9/~0.1, hash fallback; mock or keyless voyage outside APP_ENV=local resolves to off.
- Live (najdimo.si, read-only SQL on Supabase najdimo, no sign-in): API v565bc2d2 (has 42.1/42.2, not yet 42.3/43.2), health ok. photo_embeddings 0 rows, ai_calls 0 (no voyage), no photo.embed/embedding.backfill jobs, 5 photos, 0 ai_results; HNSW index present, pgvector 0.8.2; config defaults. Not verifiable until 42.3 deploys and Voyage is on: seeder 41 on deploy, staging p95, real Voyage request.
<!-- SECTION:NOTES:END -->
