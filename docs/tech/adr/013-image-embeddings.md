# ADR-013: Image similarity with a hosted multimodal embedding API behind an adapter, pgvector HNSW, gated by an evaluation set

- Status: Accepted (implementation in M3, TASK-42/43; contracts C20, C8) · Date: 2026-10-14 · Owner: Tech Lead
- Amended 2026-10-15 (ADR-020): embedding runs in the Node worker (`photo.embed` job); vector search uses `$queryRaw` with pgvector; a self-hosted model could now run on the VPS if the evaluation requires it.
- Amended 2026-10-18 (M3 breakdown, CH-541): `voyage-multimodal-3.5` instead of `-3`; chained after extraction so flagged photos are never embedded; hash reuse; scoring with the v2 attribute scorer as fallback.
- Source: FR-014, NFR-AI (1 embedding per photo), NFR-SCALE (50k photos < 300 ms), R-010

## Context

We need "same animal, different angle" similarity across ~50k photos, one embedding per photo, offline mocks, and a lean budget. Similarity alone must never trigger a notification without a geo-time fit, and photos where a person is prominent are ignored (FR-014 edge cases).

## Options

| Option | Quality for pet re-identification | Cost / ops | Notes |
|---|---|---|---|
| A. Hosted multimodal embeddings API (Voyage `voyage-multimodal-3.5`, 1024-d) | Good general visual similarity (breed, coat, markings) | USD 0.60 per 10⁹ pixels (≈ USD 0.0005 for a 1024 × 768 photo), first 150·10⁹ pixels free, one API key, plain HTTPS | Chosen |
| B. Self-hosted DINOv2 / OpenCLIP on the VPS or Cloud Run (EU) | Best instance-level features (DINOv2) | CPU inference on the CAX11 is slow; GPU costs; ops burden | Escalation path |
| C. Vertex AI multimodal embeddings (europe-west3) | Similar to A | Needs a GCP project with billing and service account | Alternative if EU processing is required |
| D. Embed Claude's text description | Weak for individuals | Already paid | Rejected |

**3.5 vs 3** (checked 2026-10-18 on docs.voyageai.com): `voyage-multimodal-3.5` is the current model, same price as `-3` (USD 0.12 per M text tokens, USD 0.60 per 10⁹ pixels, same free allowance), 1024-d by default (also 256, 512, 2048), and Voyage calls the newer models better in all aspects; `-3` is legacy. No photo has been embedded yet, so there is nothing to re-embed.

## Decision

- **A, behind an `embedder` adapter** (`voyage | mock | off`), model from `app_config.embedding.model` (`voyage-multimodal-3.5`). The model id is stored per row; the `mock` embedder derives deterministic vectors from fixture labels so tests can assert ranking (C20).
- **Pipeline**: `ai.extract` sends `photo.embed` at its end, except for photos flagged `person_prominent`, `nsfw` or with no animal (C19), so those photos never reach Voyage and never get a vector. An identical image (same SHA-256) reuses an existing vector. Budget `embedding.monthly_budget_usd`.
- **Storage**: `photo_embeddings(photo_id, model, embedding vector(1024), created_at)`, primary key `(photo_id, model)`, one HNSW index with cosine distance (m 16, ef_construction 64), queried with iterative scans (pgvector ≥ 0.8). Re-embedding with a new model writes new rows (`embedding.next_model`); matching switches through `embedding.model` only after the backfill completes, so it stays available (FR-014 AC#3).
- **Scoring** (TASK-43, C8 §Visual similarity): candidates still come from the geo-time-species filter; the best photo pair's cosine, normalised per model, is a weighted term (algo v3); the v2 attribute scorer is the fallback whenever a vector is missing or the query fails. Bands in reasons (`very_similar`, `similar`, `some`). Chip match stays 1.0.
- **Evaluation harness** (TASK-43.3): ≥ 100 labelled pairs, recall@10 and precision at the notification strength; v3 ships only if not worse than v2. If A fails the bar, B is the next step (new ADR).

## Consequences

- One more processor (Voyage AI, USA) in the privacy policy; photos only, EXIF stripped, no identifiers. Before real photos go to Voyage on staging, the owner confirms the training opt-out and data retention of the Voyage account (not yet verified by us) and adds a payment method for Tier 1 rate limits (without it the limits allow only a few images a minute; the backfill is throttled to `embedding.backfill_per_minute`).
- `VOYAGE_API_KEY` is set in `.env.local` (owner, checked 2026-10-18); staging gets it in TASK-40.7. Local and CI use the mock.
