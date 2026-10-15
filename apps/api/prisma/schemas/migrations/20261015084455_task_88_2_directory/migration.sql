-- task: TASK-88.2
-- rollback: drop table app.directory_changes, app.municipality_shelters, app.shelters; drop type app."DIRECTORY_STATUS";
-- Responsible-shelter directory (C18): shelters, one assignment per municipality, append-only versions.
-- ADR-021: RLS enabled, no policies.

-- CreateEnum
CREATE TYPE "DIRECTORY_STATUS" AS ENUM ('CONFIRMED', 'UNCONFIRMED');

-- CreateTable
CREATE TABLE "shelters" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "postal_code" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "phone" TEXT NOT NULL,
    "phone_display" TEXT NOT NULL,
    "email" TEXT,
    "website" TEXT,
    "opening_hours" JSONB NOT NULL,
    "registry_id" TEXT,
    "species" TEXT[] DEFAULT ARRAY['dog', 'cat']::TEXT[],
    "source" TEXT NOT NULL,
    "verified_at" DATE NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "shelters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "municipality_shelters" (
    "municipality_id" SMALLINT NOT NULL,
    "shelter_id" UUID,
    "status" "DIRECTORY_STATUS" NOT NULL,
    "source" TEXT NOT NULL,
    "verified_at" DATE NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "municipality_shelters_pkey" PRIMARY KEY ("municipality_id")
);

-- CreateTable
CREATE TABLE "directory_changes" (
    "id" UUID NOT NULL,
    "entity" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "data" JSONB NOT NULL,
    "source" TEXT NOT NULL,
    "actor_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "directory_changes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "shelters_slug_key" ON "shelters"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "directory_changes_entity_entity_id_version_key" ON "directory_changes"("entity", "entity_id", "version");

-- AddForeignKey
ALTER TABLE "municipality_shelters" ADD CONSTRAINT "municipality_shelters_shelter_id_fkey" FOREIGN KEY ("shelter_id") REFERENCES "shelters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- A confirmed municipality always names its shelter; an unconfirmed one may name the likely shelter.
ALTER TABLE "municipality_shelters" ADD CONSTRAINT "municipality_shelters_confirmed_shelter" CHECK ("status" <> 'CONFIRMED' OR "shelter_id" IS NOT NULL);

-- ADR-021
alter table app.shelters enable row level security;
alter table app.municipality_shelters enable row level security;
alter table app.directory_changes enable row level security;
