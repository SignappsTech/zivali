---
id: TASK-42.2
title: >-
  Vector queries: best-pair similarity and nearest by species and radius (HNSW),
  50k perf test
status: In Progress
assignee:
  - '@backend-dev'
created_date: '2026-10-18 21:24'
updated_date: '2026-10-19 00:32'
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
- [x] #1 similarity(lostReportId, otherReportIds, model) returns the best photo pair per other report with both photo ids in one query with a 2 s statement timeout, and ignores other models
- [x] #2 nearest({ photoId, species, point, radiusKm, types, k }, model) returns the best photo per open, visible report of the species within the radius using the HNSW index (EXPLAIN in the test notes), with iterative scans when pgvector is 0.8 or newer and ef_search 200 otherwise
- [x] #3 A perf test seeds 50k mock vectors on the local stack: nearest p95 < 300 ms and similarity for 1000 lost reports with 5 photos each < 1 s; it runs on demand (pnpm --filter api test:perf), not in pnpm verify
- [ ] #4 Tests; pnpm verify green
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
As built (TASK-42.2): `similarity` and `nearest` (+ `nearestSql`, `hnswSettings`, `pgvectorVersion`) in apps/api/domains/embeddings/embeddings.dao.ts; tests in test/domains/embeddings.dao.test.ts (11); 50k check in test/perf/embeddings.perf.ts (`pnpm --filter api test:perf`, vitest.perf.config.ts, not in verify). CHANGE rows CH-580..582 (as built, backend.md command row).

Design notes:
- PostGIS estimates ST_DWithin at ~1 row for any radius, so the planner cannot choose between exact and ANN; left to it, a nationwide query nested-looped every report over every photo (34 s). nearest therefore collects candidates first (report ids as an array, photos via report_id index, only photos with a vector of the model) and ranks <= 2000 exactly, more via HNSW.
- `set local enable_sort = off` with the HNSW settings: the planner prices a distance as one operator call, not a 4 KB TOAST read, and otherwise picked seq scan + top-N sort (0.7 s) over the index (40 ms).
- Vectors read once per row with `subvector(v, 1, 1024)` behind `offset 0`: similarity re-read both TOASTed vectors for each pair (1.1 s for 25k pairs, now ~0.05-0.2 s).

Perf (local stack, 10k reports / 50k mock vectors, vacuumed, warm): nearest p95 96 ms over 120 queries (5 km 28, 10 km 20, 25 km 38, 50 km 92, 100 km 96, 250 km 113); similarity lost(5 photos) vs 1000 reports x 5 photos 51-61 ms. Earlier runs on a loaded machine / bloated index: p95 142-260 ms, similarity 0.1-0.25 s after the TOAST fix.

EXPLAIN ANALYZE nearest, 250 km, dog, found+sighted, k 20 (HNSW executed):
```
Limit (actual time=133.616..133.632 rows=20)
  CTE cand
    Seq Scan on reports r (rows=1 est, actual rows=2834)  Rows Removed by Filter: 7166
    Bitmap Index Scan on photos_report_id_idx (actual rows=14170)
    Index Only Scan using photo_embeddings_pkey on photo_embeddings v (loops=14170)  Heap Fetches: 0
  exact branch: One-Time Filter: ((InitPlan 6).col1 <= '2000'::bigint)  (never executed)
  index branch: One-Time Filter: ((InitPlan 9).col1 > '2000'::bigint)
    Limit (actual time=25.556..67.352 rows=100)
      Index Scan using photo_embeddings_hnsw on photo_embeddings e_1 (actual time=22.695..62.016 rows=100)
        Order By: (embedding <=> (InitPlan 8).col1)
        Filter: (((ANY (photo_id = (hashed SubPlan 10).col1)) IS TRUE) AND (model = 'voyage-multimodal-3.5'::text))
        Rows Removed by Filter: 282
Execution Time: 134.014 ms
```
EXPLAIN ANALYZE nearest, 5 km (exact branch):
```
Bitmap Index Scan on reports_public_point_idx (actual rows=43)
Index Scan using photo_embeddings_pkey on photo_embeddings e (loops=10)
Index Scan using photo_embeddings_hnsw on photo_embeddings e_1 (never executed)
Execution Time: 1.028 ms
```
<!-- SECTION:NOTES:END -->
