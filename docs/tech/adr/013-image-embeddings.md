# ADR-013: Image similarity with a hosted multimodal embedding API behind an adapter, pgvector HNSW, gated by an evaluation set

- Status: Accepted (implementation in M3, TASK-42/43) · Date: 2026-10-14 · Owner: Tech Lead
- Amended 2026-10-15 (ADR-020): embedding runs in the Node worker (`photo.embed` job); vector search uses Prisma TypedSQL with pgvector; a self-hosted model could now run on the VPS if the evaluation requires it.
- Source: FR-014, NFR-AI (1 embedding per photo), NFR-SCALE (50k photos < 300 ms), R-010

## Context

We need "same animal, different angle" similarity across ~50k photos, one embedding per photo, offline mocks, and a lean budget. Supabase Edge Functions cannot run vision models (CPU and memory limits). Similarity alone must never trigger a notification without a geo-time fit (FR-014 edge case).

## Options

| Option | Quality for pet re-identification | Cost / ops | Notes |
|---|---|---|---|
| A. Hosted multimodal embeddings API (Voyage `voyage-multimodal-3`, 1024-d) | Good general visual similarity (breed, coat, markings) | ~USD 0.0005 per photo, generous free tier, one API key, plain HTTPS | Chosen |
| B. Self-hosted DINOv2 / OpenCLIP on Cloud Run (EU) | Best instance-level features (DINOv2) | Container, cold starts, GPU or slow CPU, ops burden | Escalation path |
| C. Vertex AI multimodal embeddings (europe-west3) | Similar to A | Needs a GCP project with billing and service account | Alternative if EU processing is required |
| D. Embed Claude's text description | Weak for individuals | Already paid | Rejected |

## Decision

- **A, behind an `embedder` adapter** (`voyage | mock`): `embed(imageBytes) → { model, dim, vector }`. The model id and dimension are stored per row; the `mock` embedder derives a deterministic vector from fixture labels so tests can assert ranking.
- **Storage**: `photo_embeddings(photo_id, model, embedding vector(1024), created_at)`, primary key `(photo_id, model)`, HNSW index with cosine distance. Re-embedding with a new model writes new rows; matching switches models through `app_config.embedding_model` only after backfill completes, so matching stays available (FR-014 AC#3).
- **Scoring** (TASK-43): candidates still come from the v1 geo-time-species filter; visual similarity is a weighted term in the v1 score, banded in reasons (`very similar`, `similar`, `some resemblance`). Chip match stays 1.0.
- **Evaluation harness** (TASK-43): ≥ 100 labelled pairs, recall@10 and precision at the notification threshold; v2 ships only if not worse than v1. If A fails the bar, B is the next step (new ADR).

## Consequences

- One more processor (Voyage AI, US) in the privacy policy; photos only, EXIF stripped, no identifiers.
- Credential `VOYAGE_API_KEY` needed for staging (new client item); local and CI use the mock.
