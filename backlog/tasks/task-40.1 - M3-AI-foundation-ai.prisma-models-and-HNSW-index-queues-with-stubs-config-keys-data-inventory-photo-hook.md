---
id: TASK-40.1
title: >-
  M3 AI foundation: ai.prisma models and HNSW index, queues with stubs, config
  keys, data inventory, photo hook
status: In Progress
assignee:
  - '@backend-dev'
created_date: '2026-10-18 21:22'
updated_date: '2026-10-18 22:06'
labels:
  - be
  - 'est:S'
milestone: m-2
dependencies: []
references:
  - docs/tech/backend.md§Ownership and shared files
  - docs/tech/contracts/C19-ai-extraction.md§Models
  - docs/tech/contracts/C20-image-embeddings.md§Model
  - docs/tech/contracts/C1-platform-conventions.md§Jobs
parent_task_id: TASK-40
priority: high
ordinal: 371200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
One task owns every shared file the M3 AI stories need (schema, migration, queue registry, config keys, data inventory, the photo hook), so extraction, embeddings and matching build in parallel without touching the same files.

## Packet

Unblocks on: - (no dependencies; uses the merged photo pipeline, C5)
Contracts: C19 §Models and §Config keys, C20 §Model and §Config keys; conventions in C1
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-40.1-ai-foundation
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Migration <ts>_task_40_1_ai_foundation (header with task and rollback) creates app.ai_results, app.ai_calls with enum ai_outcome and app.photo_embeddings (vector(1024), primary key photo_id + model, on delete cascade) with the HNSW cosine index (m 16, ef_construction 64), each with RLS enabled; Prisma models in prisma/schemas/ai.prisma use Unsupported("extensions.vector(1024)"); the installed pgvector version (local and project najdimo) is recorded in the task notes
- [x] #2 Queues ai.extract (retry 2, delay 2 s, no backoff, local concurrency 4), photo.embed (local concurrency 1) and embedding.backfill are in QUEUES with stub handlers registered in jobs/index.ts; PHOTO_HOOKS = ['ai.extract']
- [x] #3 app_config defaults per C19 and C20 (ai.enabled and ai.min_confidence public) inserted with on conflict do nothing; lib/config.ts defaults AI_VISION_MODEL claude-haiku-5-5 and AI_VISION_EFFORT low, and .env.example lists them
- [x] #4 data-inventory.json rows for the three models (category, personal-data flag, retention: ai_calls 62 days, ai_results by hash, photo_embeddings with the photo); the data-inventory and schema-exposure tests and pnpm verify pass
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
pgvector: local stack 0.8.2 (PostgreSQL 17.11; scratch DB task_40_1). Project najdimo (omtpppzrugibquukhnyl): not read, the agent's Supabase MCP list_extensions call was denied; lead to record it (select extversion from pg_extension where extname = 'vector'). HNSW needs >= 0.5, iterative_scan (C20 nearest) >= 0.8.

Prisma cannot model HNSW: every later migrate dev adds DROP INDEX photo_embeddings_hnsw; delete that line (comment in ai.prisma, guard in test/security/ai-schema.test.ts, CHANGE for backend.md).

Verify (worktree rules: no next build): prettier, secretlint, api eslint + openapi check, tsc, env-sync test pass. API vitest on scratch DB task_40_1: all TASK-40.1 tests pass (ai-schema, jobs, photos.domain, data-inventory, schema-exposure); 230 other failures are identical on main in the same scratch DB (no Supabase auth schema: relation auth.users does not exist). Seed not run on the scratch DB for the same reason (no seeder change). Full pnpm verify on the shared DB at merge. AC #1 open only for the najdimo pgvector version.
<!-- SECTION:NOTES:END -->
