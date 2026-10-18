source: docs/04-technical-design.md§External integrations, ADR-013, ADR-014, ADR-022; FR-014, NFR-AI, NFR-SCALE

# C20 Image embeddings and the vector index (M3, TASK-42)

One vector per photo and model, stored in pgvector, used by matching v3 (C8 §Visual similarity). Matching never waits for a vector: without one it scores with the v2 attributes.

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
1. Skip when the photo is not `accepted`/`published`, or its `ai_results` flags `person_prominent`, `nsfw`, or `animal` `none`/`other`.
2. Models = `embedding.model`, plus `embedding.next_model` when set. For each model without a row:
   - **Hash reuse**: another photo with the same `sha256` already has a vector for this model → copy it, no call.
   - Monthly Voyage spend (`ai_calls`, provider `voyage`) ≥ `embedding.monthly_budget_usd` → skip, log `photo.embed.budget` (matching falls back to v2).
   - Else embed `display.jpg` downscaled in memory to a 1024 px long edge (EXIF already stripped), insert (`on conflict do nothing`), write `ai_calls` (provider `voyage`, `pixels`, `cost_usd` = pixels × USD 0.60 / 10⁹; Voyage bills 50k to 2M pixels per image).
3. Provider 429 or 5xx → throw (retry, honour `retry-after`). The last attempt failing logs `photo.embed.dead_letter` with `photo_id`, model and error code (never image data); pg-boss keeps the failed job.
4. After a new vector of a photo on an open report: send `match.report { report_id }` (C8 §Visual similarity 5; added by TASK-43.2).

p95 from photo accepted to vector stored ≤ 60 s on staging, once Voyage has a payment method (Tier 1 limits).

**`embedding.backfill { model?: string, prune?: boolean }`** (`jobs/embedding.backfill.job.ts`):
- `model` defaults to `embedding.next_model ?? embedding.model`. Pages (500, by photo id) over eligible photos (accepted or published, attached to a report or a pet, not flagged) without a row for the model and sends `photo.embed` with singleton key `photo_id`, at most `embedding.backfill_per_minute` per minute (re-queues itself with `startAfter` for the next page). Logs `embedding.backfill.done { model, remaining: 0 }` when nothing is left.
- `prune: true` deletes rows whose model is neither `embedding.model` nor `embedding.next_model`.
- Started on deploy by seeder `41-embedding-backfill` when `EMBEDDER_PROVIDER` is not `off` and an eligible photo lacks a vector for `embedding.model` (one cheap `exists` query; a failure is logged and never stops the deploy), and by hand: `pnpm --filter api jobs:send embedding.backfill '{"model":"…"}'`.

**Model change without downtime**: set `embedding.next_model` (new photos get both vectors) → run the backfill for it → after `remaining: 0`, an admin sets `embedding.model` to it and clears `next_model` → run the backfill with `prune: true`. Matching reads only `embedding.model`.

## Adapter (`adapters/embedder/{index,mock,voyage}.ts`)

`embed(images: { jpegBase64: string }[], model: string) → number[][]` (each `EMBED_DIM` = 1024 long, L2-normalised).
- **voyage**: `POST https://api.voyageai.com/v1/multimodalembeddings`, `{ model, inputs: [{ content: [{ type: 'image_base64', image_base64: 'data:image/jpeg;base64,…' }] }], output_dimension: 1024 }`, `Authorization: Bearer VOYAGE_API_KEY`; plain `fetch` (no SDK); no ids or text in the request; 10 s timeout.
- **mock** (default locally and in CI): deterministic. When `apps/api/test/fixtures/embeddings/labels.json` maps the image's sha256 to `{ animal, view }`, the vector is `normalise(base(animal) + 0.35 · noise(view))` (same animal ≈ 0.9 cosine, different animals ≈ 0.1); otherwise a vector derived from the hash. The matching harness (TASK-43.3) and the 50k perf test use it.

## Queries (`domains/embeddings/embeddings.dao.ts`, TASK-42.2)

- `similarity(lostReportId, otherReportIds, model) → { other_report_id, cos, lost_photo_id, other_photo_id }[]`: exact best pair per other report (no index; ≤ 25 pairs each), one query for all candidates; 2 s statement timeout. Used by matching (C8).
- `nearest({ photoId, species, point, radiusKm, types, k ≤ 50 }, model) → { report_id, photo_id, cos }[]`: best photo per report, ANN over the HNSW index with `set local hnsw.ef_search = 100` and `set local hnsw.iterative_scan = relaxed_order` (pgvector ≥ 0.8, checked by the migration; else `ef_search = 200`), filtered by species, report type, status open/matched, moderation visible, `ST_DWithin(public_point, point, radius)`. p95 < 300 ms at 50k photos on the local stack (perf test with seeded mock vectors). For search by photo and the reverse search budget; matching itself uses `similarity`.

## Config keys (migration of TASK-40.1)

`embedding.model` `"voyage-multimodal-3.5"` · `embedding.next_model` null · `embedding.monthly_budget_usd` 5 · `embedding.backfill_per_minute` 6 (fits Voyage's limits without a payment method; raise to 300 after Tier 1). Env: `EMBEDDER_PROVIDER` (`mock | voyage | off`), `VOYAGE_API_KEY`.

## Privacy

Only the 1024 px re-encoded image goes to Voyage: no EXIF, ids, location or text. Vectors are deleted with their photo (cascade), so retention and account deletion follow the photo. Photos with a prominent person, nsfw content or no animal are never embedded. Before real photos go to Voyage on staging, the owner confirms the training opt-out and retention (TASK-40.7).

## Changelog

- 2026-10-18 (M3 breakdown): first version.
