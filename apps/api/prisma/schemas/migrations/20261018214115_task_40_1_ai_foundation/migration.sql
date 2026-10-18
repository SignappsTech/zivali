-- task: TASK-40.1
-- rollback: drop table app.photo_embeddings, app.ai_calls, app.ai_results; drop type app."AI_OUTCOME"; delete from app.app_config where key in ('ai.enabled', 'ai.min_confidence', 'ai.monthly_budget_usd', 'ai.daily_photos_anonymous', 'ai.daily_photos_user', 'embedding.model', 'embedding.next_model', 'embedding.monthly_budget_usd', 'embedding.backfill_per_minute');
-- M3 AI foundation: extraction results and the model-call ledger (C19 §Models), photo vectors with the HNSW cosine
-- index (C20 §Model), and the AI and embedding settings (C19, C20 §Config keys). ADR-021: RLS enabled, no policies.
-- pgvector lives in schema extensions (TASK-3.7 init); HNSW needs pgvector >= 0.5 (local stack: 0.8.2).

-- CreateEnum
CREATE TYPE "AI_OUTCOME" AS ENUM ('ok', 'cached', 'refused', 'invalid', 'failed', 'skipped_disabled', 'skipped_budget', 'skipped_limit');

-- CreateTable
CREATE TABLE "ai_results" (
    "sha256" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "prompt_version" TEXT NOT NULL,
    "result" JSONB NOT NULL,
    "moderation" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_results_pkey" PRIMARY KEY ("sha256")
);

-- CreateTable
CREATE TABLE "ai_calls" (
    "id" UUID NOT NULL,
    "photo_id" UUID,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "outcome" "AI_OUTCOME" NOT NULL,
    "input_tokens" INTEGER NOT NULL,
    "output_tokens" INTEGER NOT NULL,
    "pixels" BIGINT,
    "cost_usd" DECIMAL(10,6) NOT NULL,
    "latency_ms" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_calls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "photo_embeddings" (
    "photo_id" UUID NOT NULL,
    "model" TEXT NOT NULL,
    "embedding" extensions.vector(1024) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "photo_embeddings_pkey" PRIMARY KEY ("photo_id","model")
);

-- CreateIndex
CREATE INDEX "ai_calls_provider_created_at_idx" ON "ai_calls"("provider", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "ai_calls_photo_id_provider_model_key" ON "ai_calls"("photo_id", "provider", "model");

-- AddForeignKey
ALTER TABLE "ai_calls" ADD CONSTRAINT "ai_calls_photo_id_fkey" FOREIGN KEY ("photo_id") REFERENCES "photos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photo_embeddings" ADD CONSTRAINT "photo_embeddings_photo_id_fkey" FOREIGN KEY ("photo_id") REFERENCES "photos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

alter table app.ai_calls add constraint ai_calls_provider_check check (provider in ('anthropic', 'voyage'));

-- ANN search by cosine distance (C20 §Queries). Prisma cannot model an HNSW index, so it lives here only.
create index photo_embeddings_hnsw on app.photo_embeddings
    using hnsw (embedding extensions.vector_cosine_ops) with (m = 16, ef_construction = 64);

-- C19 §Config keys (ai.enabled and ai.min_confidence are public: the forms read them) and C20 §Config keys.
insert into app.app_config (key, value, is_public, description, updated_at) values
    ('ai.enabled', 'true', true, 'AI attribute suggestions from photos (C19); false = every form stays manual', now()),
    ('ai.min_confidence', '0.6', true, 'Lowest confidence a suggestion needs to pre-fill a form field (C19)', now()),
    ('ai.monthly_budget_usd', '20', false, 'Monthly cap on Anthropic spend (ai_calls.cost_usd); over it extraction is skipped (C19)', now()),
    ('ai.daily_photos_anonymous', '10', false, 'Photos of an anonymous owner extracted per 24 h (C19)', now()),
    ('ai.daily_photos_user', '30', false, 'Photos of a signed-in owner extracted per 24 h (C19)', now()),
    ('embedding.model', '"voyage-multimodal-3.5"', false, 'Embedding model that matching reads (C20)', now()),
    ('embedding.next_model', 'null', false, 'Model being backfilled before a switch; new photos get both vectors (C20)', now()),
    ('embedding.monthly_budget_usd', '5', false, 'Monthly cap on Voyage spend (ai_calls, provider voyage); over it photos are not embedded (C20)', now()),
    ('embedding.backfill_per_minute', '6', false, 'photo.embed jobs the backfill sends per minute (C20; 300 after Voyage Tier 1)', now())
on conflict (key) do nothing;

alter table app.ai_results enable row level security;
alter table app.ai_calls enable row level security;
alter table app.photo_embeddings enable row level security;
