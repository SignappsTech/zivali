source: docs/04-technical-design.md§External integrations, ADR-013, ADR-014, ADR-022; FR-014, NFR-AI, NFR-SCALE

# C20 Image embeddings and the vector index (M3, TASK-42)

One vector per photo and model, stored in pgvector, used by matching v3 (C8 §Visual similarity). Matching never waits for a vector: without one it scores with the v2 attributes.

**Embed only after a successful safety check** (CH-562, LQ-70): a photo goes to Voyage only when it has a clean `ai_results` row (C19: `animal` dog or cat, `person_prominent` and `nsfw` false). No row (extraction off, skipped, refused, invalid or failed) means never embedded; there is no fallback that embeds an unchecked photo, on any path (job, backfill, hash reuse).

## Model (Prisma `prisma/schemas/ai.prisma`, schema `app`, RLS deny-all; TASK-40.1)

```sql
photo_embeddings(photo_id uuid → photos on delete cascade, model text, embedding vector(1024), created_at,
                 primary key (photo_id, model))
create index photo_embeddings_hnsw on app.photo_embeddings
  using hnsw (embedding extensions.vector_cosine_ops) with (m = 16, ef_construction = 64);
```
Prisma type `Unsupported("extensions.vector(1024)")`; read and written only through `$queryRaw` with parameters (vector passed as a `'[…]'` text literal cast to `extensions.vector`). A model with another dimension needs a migration (new column or table); `voyage-multimodal-3.5` is 1024-d by default.

## Jobs

**`photo.embed { photo_id }`** (`jobs/photo.embed.job.ts` → `EmbeddingsDomain.embedPhoto`; sent by `ai.extract`, C19, and by the backfill; local concurrency 1; retry 5× with backoff):
1. Skip when the photo is not `accepted`/`published`, has no `ai_results` row, or its row is not clean (fails closed: embeds only `animal` dog/cat with `person_prominent` and `nsfw` false). Embedder `off` → skip, log `photo.embed.off`, no retry.
2. Models = `embedding.model`, plus `embedding.next_model` when set. For each model without a row:
   - **Hash reuse**: another photo with the same `sha256` already has a vector for this model → copy it, no call.
   - Monthly spend (UTC calendar month; `ai_calls` of provider `voyage`) ≥ `embedding.monthly_budget_usd` → skip, log `photo.embed.budget` (matching falls back to v2). An unset or 0 budget skips every call.
   - Else embed `display.jpg` downscaled in memory to a 1024 px long edge (EXIF already stripped), insert (`on conflict do nothing`), write `ai_calls` only for a successful call: provider = the adapter's (`voyage` or `mock`, so mock calls never count toward the Voyage budget), outcome `ok`, tokens 0, `pixels` = clamp(w × h of the 1024 px JPEG, 50k, 2M), `cost_usd` = pixels × USD 0.60 / 10⁹ (Voyage bills 50k to 2M pixels per image).
3. Errors: a refused request (4xx other than 408 and 429, e.g. 400 bad image, 401 bad key) logs `photo.embed.dead_letter` at once and completes the job (no retries). 429, 5xx, timeout, network and any other error, a database error before the model loop included, throw for retry; `retry-after` is honoured by waiting up to 60 s inside the attempt before throwing (pg-boss `fail` takes no delay). The last attempt failing (the job ctx has `lastAttempt`: retryCount ≥ the queue's retryLimit) logs `photo.embed.dead_letter` with `photo_id`, model (absent when it failed before the loop) and error code, never image data; pg-boss keeps the failed job.
4. When the photo had no `embedding.model` vector before the run and has one after, on an open or matched report (also when a later `next_model` embed throws): send `match.report { report_id }`, debounced (C8 §Visual similarity 5).

p95 from photo accepted to vector stored ≤ 60 s on staging, once Voyage has a payment method (Tier 1 limits).

**`embedding.backfill { model?: string, prune?: boolean, after?: string }`** (`jobs/embedding.backfill.job.ts`):
- `model` defaults to `embedding.next_model ?? embedding.model`. Pages (500, by photo id; `after` = the last photo id of the previous page, carried by the re-queued job and usable by hand to resume) over eligible photos (accepted or published, attached to a report or a pet, with a clean `ai_results` row; no row = never embedded) without a row for the model, and sends `photo.embed` with `singletonKey: photo_id` **and** `singletonSeconds: 3600` (pg-boss's standard queue policy dedupes a key only within a time slot; a policy cannot be changed on an existing queue), at most `embedding.backfill_per_minute` per minute (re-queues itself with `startAfter` for the next page).
- Ends with `embedding.backfill.done { model, remaining }`; `remaining` > 0 when the budget, the embedder off or refused requests left photos (run it again). A model that is neither `embedding.model` nor `next_model` → `embedding.backfill.inactive`, nothing sent; the embedder off → `embedding.backfill.off`.
- `prune: true` deletes rows whose model is neither `embedding.model` nor `embedding.next_model`.
- Started on deploy by seeder `41-embedding-backfill` (`{ model: embedding.model }`) when the resolved adapter is not off and an eligible photo lacks a vector for `embedding.model` (one cheap `exists` query; a failure is logged and never stops the deploy). It checks the resolved adapter rather than the variable and always calls `stopJobs()`, so pg-boss's timers never keep the seed (and the deploy) from exiting. By hand: `pnpm --filter api jobs:send embedding.backfill '{"model":"…"}'`.

**Model change without downtime**: set `embedding.next_model` (new photos get both vectors) → run the backfill for it → after `remaining: 0`, an admin sets `embedding.model` to it and clears `next_model` → run the backfill with `prune: true`. Matching reads only `embedding.model`. `hnsw.max_scan_tuples` (pgvector default 20k) caps `nearest`'s recall above about 50k photos; between `next_model` and the prune the index holds two vectors per photo, so the cap bites at about half that: prune soon after the switch, and raise the setting in `hnswSettings` before a model change at that size (apps/api/prisma/seeders/README.md §41).

## Adapter (`adapters/embedder/{index,mock,voyage}.ts`)

`embed(images: { jpegBase64: string; sha256: string }[], model: string) → number[][]` (each `EMBED_DIM` = 1024 long, L2-normalised). `sha256` is the photo's upload hash (`photos.sha256`), read only by the mock (its labels are keyed by it; the 1024 px re-encode would not match) and never sent to Voyage. The adapter exposes `provider` (`mock` | `voyage`; `embedderOn()` is false for the off adapter) and throws `EmbedderError { code, retryAfterS? }` with `code` `http_<status>`, `timeout`, `network` or `bad_response` (logged, never image data).
- **Resolution**: `EMBEDDER_PROVIDER` unset = `mock` locally and `off` elsewhere. `mock`, or `voyage` without `VOYAGE_API_KEY`, outside `APP_ENV=local` resolves to off when NODE_ENV is not production (no made-up vectors for real photos); under NODE_ENV=production (the deployed images) `mock` is refused at boot, so staging and production set `off` or leave it unset. Same rule as `AI_PROVIDER` (C19).
- **voyage**: `POST https://api.voyageai.com/v1/multimodalembeddings`, `{ model, inputs: [{ content: [{ type: 'image_base64', image_base64: 'data:image/jpeg;base64,…' }] }], output_dimension: 1024 }`, `Authorization: Bearer VOYAGE_API_KEY`; plain `fetch` (no SDK); no ids or text in the request; 10 s timeout.
- **mock** (default locally and in CI): deterministic. When `apps/api/test/fixtures/embeddings/labels.json` maps the image's sha256 to `{ animal, view }`, the vector is `normalise(base(animal) + 0.35 · noise(view))` (same animal ≈ 0.9 cosine, different animals ≈ 0.1); otherwise a vector derived from the hash. It exports `labelledVector({ animal, view })` (the labels.json formula): the matching harness (TASK-43.3) labels its synthetic photos with it directly; the 50k perf test uses the mock too.

## Queries (`domains/embeddings/embeddings.dao.ts`, TASK-42.2)

Both take an optional tx (their `set local` settings then last until that transaction ends). Only accepted or published photos count (a photo rejected or unpublished later stops matching).
- `similarity(lostReportId, otherReportIds, model) → { other_report_id, cos, lost_photo_id, other_photo_id }[]`: exact best pair per other report (no index; ≤ 25 pairs each), one query for all candidates, ordered by `other_report_id`; reports without a vector of the model are absent; 2 s statement timeout. Vectors are read out of TOAST once per photo (`subvector(v, 1, 1024)` behind `offset 0`; a plain column re-read both 4 KB vectors per pair: 1.1 s for 25k pairs, now 0.05 to 0.2 s). Used by matching (C8).
- `nearest({ photoId, species, point, radiusKm, types, k }, model) → { report_id, photo_id, cos }[]`: best photo per report. Candidates = accepted/published photos with a vector of the model on open/matched, visible reports of the species and types whose `public_point` is within `radiusKm` (`ST_DWithin`), excluding the query photo's own report. Up to 2000 candidate photos are ranked exactly; more go through the HNSW index (iterative relaxed scan; the candidate check as a hashed filter on the index scan). Reason: PostGIS estimates `ST_DWithin` at about one row whatever the radius, so the planner cannot choose (left to it, a nationwide search joined every report to every photo: 34 s at 50k). It also sets `enable_sort = off` locally (the planner prices a distance as one operator call, not a 4 KB TOAST read, and would prefer a full scan and sort). `ef_search` 100 + `iterative_scan = relaxed_order` on pgvector ≥ 0.8 (version read from `pg_extension` once per process), else `ef_search` 200. `k` outside 1..50 or `radiusKm` ≤ 0 throws `RangeError`; no types or no vector for the photo returns `[]`. At 50k photos (local stack, vacuumed): p95 96 ms over 5 to 250 km (perf check: `pnpm --filter api test:perf`). For search by photo and the reverse search budget; matching itself uses `similarity`.

## Config keys (migration of TASK-40.1)

`embedding.model` `"voyage-multimodal-3.5"` · `embedding.next_model` null · `embedding.monthly_budget_usd` 5 · `embedding.backfill_per_minute` 6 (fits Voyage's limits without a payment method; raise to 300 after Tier 1). Env: `EMBEDDER_PROVIDER` (`mock | voyage | off`), `VOYAGE_API_KEY`.

## Privacy

Only the 1024 px re-encoded image goes to Voyage: no EXIF, ids, location or text. Vectors are deleted with their photo (cascade), so retention and account deletion follow the photo. Photos with a prominent person, nsfw content, no animal or no safety check are never embedded. Before real photos go to Voyage on staging, the owner confirms the training opt-out and retention (TASK-40.7).

## Changelog

- 2026-10-18 (M3 breakdown): first version.
- 2026-10-19 (CH-562, CH-568, CH-569, CH-578, CH-580, CH-581, CH-589 to CH-592): embed only after a clean safety check (no fallback); adapter signature, provider, errors and resolution; `photo.embed` and `embedding.backfill` as built by TASK-42.1 and 42.3; queries as built by TASK-42.2; `hnsw.max_scan_tuples` watch item for a model change.
