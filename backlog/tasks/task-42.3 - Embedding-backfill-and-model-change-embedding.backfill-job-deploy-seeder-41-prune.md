---
id: TASK-42.3
title: >-
  Embedding backfill and model change: embedding.backfill job, deploy seeder 41,
  prune
status: In Progress
assignee:
  - '@backend-dev'
created_date: '2026-10-18 21:24'
updated_date: '2026-10-19 01:37'
labels:
  - be
  - 'est:S'
milestone: m-2
dependencies:
  - TASK-42.1
references:
  - docs/tech/backend.md
  - docs/tech/contracts/C20-image-embeddings.md§Jobs
  - >-
    docs/tech/contracts/C20-image-embeddings.md§Config keys (migration of
    TASK-40.1)
parent_task_id: TASK-42
priority: high
ordinal: 382200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Photos uploaded before M3 get vectors too, and a later model change re-embeds without stopping matching (FR-014 AC#3).

## Packet

Unblocks on: photo.embed job merged (TASK-42.1)
Contracts: C20 §Jobs (in references); conventions in C1
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-42.3-embedding-backfill
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 embedding.backfill pages eligible photos without a vector for the model, sends photo.embed with singleton key photo_id at no more than embedding.backfill_per_minute and logs embedding.backfill.done with remaining 0; a second run makes no duplicate calls
- [x] #2 Seeder 41-embedding-backfill queues it on deploy when EMBEDDER_PROVIDER is not off and an eligible photo lacks a vector for embedding.model; a failure is logged and never stops the deploy
- [x] #3 The model change (next_model, backfill, switch, prune) is tested end to end with two mock models, and similarity reads only embedding.model throughout
- [ ] #4 Tests; pnpm verify green
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
From the TASK-40.1 review and CH-562 (2026-10-19): photos uploaded while ai.extract is a stub have no ai_results row; embedding and backfill must skip any photo without a successful safety check (no ai_results row = not embedded).

Follow-ups from the TASK-42.1 review (2026-10-19), non-blocking, fold in here since 42.3 touches the same domain: (1) embeddings.domain.ts ~105: dead-letter a 400/401 right away instead of 5 retries; (2) embeddings.domain.ts ~73-80: a DB error before the per-model try logs no dead_letter on the last attempt; (3) embeddings.dao.ts ~70: mock calls are recorded as provider voyage, so local mock spend counts toward the budget (record provider mock).

Parity with the TASK-40.3 review (2026-10-19): make the embedder like the AI adapter: EMBEDDER_PROVIDER=mock outside APP_ENV=local must resolve to off (no fake vectors for real photos on staging/production). Add a select.test case.

From the TASK-42.2 review (2026-10-19), watch items: hnsw.max_scan_tuples (default 20k) caps recall above about 50k photos, so the backfill/model-change plan should note it; the pgvector < 0.8 fallback returns too few filtered rows but is dead code behind the migration's version check.

### As built (TASK-42.3, 2026-10-19)

- `EmbeddingsDomain.backfill` (jobs/embedding.backfill.job.ts): one bounded pass by photo id, pages of 500; each page sends photo.embed (singletonKey photo_id + singletonSeconds 3600) staggered by `startAfter` to at most `embedding.backfill_per_minute` a minute, then re-queues itself with `after` = the page's last id once those are due. Empty page → `embedding.backfill.done { model, remaining }`. Embedder off or a model that is not active → log only. `prune` deletes vectors of models other than embedding.model/next_model first.
- Seeder 41 → `EmbeddingsDomain.queueBackfill`: checks the resolved adapter (`embedderOn`), so it stays off with EMBEDDER_PROVIDER off, or unset or mock outside APP_ENV=local; one `limit 1` query; sends `{ model: embedding.model }`; a failure is logged, never thrown. Deploy-mode seed (APP_ENV=staging) on the scratch DB: 41 queued nothing.
- photo.embed: refused 4xx (not 408/429) dead-letters at once and completes the job; the whole body is in the try, so a DB error before the model loop dead-letters on the last attempt; `ai_calls.provider` = adapter provider (migration 20261019030000_task_42_3_ai_calls_mock adds `mock` to the check). The AI domain still records its mock calls as `anthropic` (not in scope).
- Adapter: mock (or voyage without a key) outside APP_ENV=local → off; select.test case.
- `pnpm --filter api jobs:send <queue> '<json>'` (scripts/jobs-send.ts): C20 names it for the manual backfill, it did not exist.
- hnsw.max_scan_tuples note: apps/api/prisma/seeders/README.md §41 (and a C20 CHANGE below).
- Tests: test/domains/embeddings.backfill.test.ts (in-memory scheduler runs sent jobs in startAfter order; one real-queue test for the singleton key; model change A → B end to end with similarity at each step; the prune runs in a rolled-back transaction so it never deletes other tests' or a developer's vectors), test/seeders/embedding-backfill.seeder.test.ts, additions to embeddings.domain.test.ts and select.test.ts.

- Verification (scratch DB task_42_3; Supabase auth schema copied in with `pg_dump -s -n auth` and a no-op `realtime.send`, as TASK-114.36's db:scratch does): api tsc, eslint (incl. openapi check), prettier, tsup build green; full API suite 1100 passed, the rest were the scratch DB's missing auth/realtime, and after adding them the 9 affected files pass (139 tests). Still red on a scratch DB, not this change: seeders 00-users/10-reports/20-collab (fixture users go through the shared stack's Auth API). `prisma migrate dev --create-only` replays every migration in the shadow DB; it only proposes the known `DROP INDEX photo_embeddings_hnsw` (discarded). Deploy-mode seed (APP_ENV=staging) ran through 41. Not run in the worktree (owner rule 4): full `pnpm verify` (web `next build`, mobile export): run it at merge.

### CHANGE rows (the worktree isolation refused the append to the main checkout's backlog/changes.md; please move them there)

| - | - | docs/tech/contracts/C20-image-embeddings.md§Jobs | As built (TASK-42.3), `embedding.backfill { model?, prune?, after? }`: `after` = the page cursor (last photo id of the previous page; the re-queued job carries it, a manual run can pass it to resume). Eligible also means a clean `ai_results` row (dog or cat, no prominent person, no nsfw; no row = never embedded, CH-562). `photo.embed` is sent with `singletonKey: photo_id` **and** `singletonSeconds: 3600`: pg-boss's standard queue policy dedupes a key only within a time slot (a policy cannot be changed on an existing queue). The pass ends with `embedding.backfill.done { model, remaining }`; `remaining` > 0 when the budget, the embedder off or refused requests left photos (run it again). A model that is neither `embedding.model` nor `next_model` → `embedding.backfill.inactive` log, nothing sent; the embedder off → `embedding.backfill.off`. Seeder 41 sends `{ model: embedding.model }` and checks the resolved adapter (off also when EMBEDDER_PROVIDER is unset or mock outside APP_ENV=local), not only the variable. | TASK-42.3 | open |
| - | - | docs/tech/contracts/C20-image-embeddings.md§Jobs | As built (TASK-42.3, TASK-42.1 review), `photo.embed` steps 2-3: the `ai_calls` row has the adapter's provider (`voyage` or `mock`; migration `task_42_3_ai_calls_mock` adds `mock` to `ai_calls_provider_check`), so mock calls never count toward the Voyage budget. A refused request (4xx other than 408 and 429, e.g. 400 bad image, 401 bad key) logs `photo.embed.dead_letter` at once and completes the job (no retries). Any other error, a database error before the model loop included, throws for retry and dead-letters on the last attempt (`model` absent when it failed before the loop). | TASK-42.3 | open |
| - | - | docs/tech/contracts/C20-image-embeddings.md§Adapter | As built (TASK-42.3, parity with TASK-40.3): `EMBEDDER_PROVIDER=mock`, or `voyage` without `VOYAGE_API_KEY`, outside `APP_ENV=local` resolves to off (no made-up vectors for real photos); NODE_ENV=production still refuses mock at boot. | TASK-42.3 | open |
| - | - | docs/tech/contracts/C20-image-embeddings.md§Jobs | Model change, add (TASK-42.2 review watch item): `hnsw.max_scan_tuples` (pgvector default 20k) caps `nearest`'s recall above about 50k photos; between `next_model` and the prune the index holds two vectors per photo, so the cap bites at about half that. Prune soon after the switch; raise the setting in `hnswSettings` before a model change at that size (apps/api/prisma/seeders/README.md §41). | TASK-42.3 | open |
| - | - | docs/tech/backend.md§Commands | Add row: `pnpm --filter api jobs:send <queue> '<json>'`: sends one job by hand (apps/api/scripts/jobs-send.ts), e.g. `jobs:send embedding.backfill '{"model":"…","prune":true}'` (C20 §Jobs). | TASK-42.3 | open |
<!-- SECTION:NOTES:END -->
