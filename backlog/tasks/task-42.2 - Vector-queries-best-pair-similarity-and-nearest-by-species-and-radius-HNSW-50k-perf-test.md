---
id: TASK-42.2
title: >-
  Vector queries: best-pair similarity and nearest by species and radius (HNSW),
  50k perf test
status: To Do
assignee:
  - '@backend-dev'
created_date: '2026-10-18 21:24'
labels:
  - be
  - 'est:S'
milestone: m-2
dependencies:
  - TASK-40.1
references:
  - docs/tech/backend.md
  - >-
    docs/tech/contracts/C20-image-embeddings.md§Queries
    (`domains/embeddings/embeddings.dao.ts`
  - TASK-42.2)
  - docs/tech/contracts/C6-location-geo-maps.md
parent_task_id: TASK-42
priority: high
ordinal: 381200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The similarity functions matching v3 and search by photo use, fast enough at 50k photos (NFR-SCALE).

## Packet

Unblocks on: AI foundation merged (TASK-40.1); tests seed vectors directly
Contracts: C20 §Queries, C6 for public_point and ST_DWithin; conventions in C1
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-42.2-vector-queries
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 similarity(lostReportId, otherReportIds, model) returns the best photo pair per other report with both photo ids in one query with a 2 s statement timeout, and ignores other models
- [ ] #2 nearest({ photoId, species, point, radiusKm, types, k }, model) returns the best photo per open, visible report of the species within the radius using the HNSW index (EXPLAIN in the test notes), with iterative scans when pgvector is 0.8 or newer and ef_search 200 otherwise
- [ ] #3 A perf test seeds 50k mock vectors on the local stack: nearest p95 < 300 ms and similarity for 1000 lost reports with 5 photos each < 1 s; it runs on demand (pnpm --filter api test:perf), not in pnpm verify
- [ ] #4 Tests; pnpm verify green
<!-- AC:END -->
