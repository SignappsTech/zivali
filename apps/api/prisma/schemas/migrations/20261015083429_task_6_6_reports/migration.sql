-- task: TASK-6.6
-- rollback: drop table app.report_contacts, app.report_managers, app.photos, app.reports, app.pets; drop type app."PHOTO_STATUS", app."PHOTO_REJECT_REASON", app."SPECIES", app."REPORT_TYPE", app."REPORT_STATUS", app."CLOSE_REASON", app."MODERATION_STATE", app."SIZE", app."SEX", app."COLOUR", app."PATTERN", app."CONTACT_PREF", app."REPORT_SOURCE"; delete from app.app_config where key like 'fuzz.%';
-- Reports, pets, managers, finder contacts (C4) and photos (C5). exact_point holds the coarsened point only (C6).
-- ADR-021: RLS enabled, no policies.

-- CreateEnum
CREATE TYPE "PHOTO_STATUS" AS ENUM ('uploaded', 'accepted', 'rejected', 'published', 'unpublished');

-- CreateEnum
CREATE TYPE "PHOTO_REJECT_REASON" AS ENUM ('not_jpeg', 'too_large', 'hash_mismatch', 'decode_failed');

-- CreateEnum
CREATE TYPE "SPECIES" AS ENUM ('dog', 'cat');

-- CreateEnum
CREATE TYPE "REPORT_TYPE" AS ENUM ('lost', 'found', 'sighted');

-- CreateEnum
CREATE TYPE "REPORT_STATUS" AS ENUM ('open', 'matched', 'reunited', 'closed');

-- CreateEnum
CREATE TYPE "CLOSE_REASON" AS ENUM ('found_elsewhere', 'gave_up', 'returned_to_owner', 'expired', 'removed', 'other');

-- CreateEnum
CREATE TYPE "MODERATION_STATE" AS ENUM ('visible', 'held', 'hidden', 'removed');

-- CreateEnum
CREATE TYPE "SIZE" AS ENUM ('xs', 's', 'm', 'l', 'xl');

-- CreateEnum
CREATE TYPE "SEX" AS ENUM ('male', 'female', 'unknown');

-- CreateEnum
CREATE TYPE "COLOUR" AS ENUM ('black', 'white', 'grey', 'brown', 'chocolate', 'red', 'cream', 'golden', 'tan', 'blue_grey');

-- CreateEnum
CREATE TYPE "PATTERN" AS ENUM ('solid', 'bicolour', 'tricolour', 'tabby', 'tortoiseshell', 'calico', 'brindle', 'merle', 'spotted', 'pointed', 'other');

-- CreateEnum
CREATE TYPE "CONTACT_PREF" AS ENUM ('chat_only', 'chat_and_phone');

-- CreateEnum
CREATE TYPE "REPORT_SOURCE" AS ENUM ('user', 'anonymous', 'organisation');

-- CreateTable
CREATE TABLE "photos" (
    "id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "pet_id" UUID,
    "report_id" UUID,
    "position" SMALLINT NOT NULL DEFAULT 0,
    "sha256" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "bytes" INTEGER NOT NULL,
    "status" "PHOTO_STATUS" NOT NULL DEFAULT 'uploaded',
    "reject_reason" "PHOTO_REJECT_REASON",
    "public_display_url" TEXT,
    "public_thumb_url" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pets" (
    "id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "species" "SPECIES" NOT NULL,
    "name" TEXT NOT NULL,
    "breed_codes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "colours" "COLOUR"[] DEFAULT ARRAY[]::"COLOUR"[],
    "pattern" "PATTERN",
    "size" "SIZE",
    "sex" "SEX",
    "birth_year" INTEGER,
    "chip_number" TEXT,
    "chip_status" TEXT NOT NULL DEFAULT 'none',
    "chip_registered_crhz" TEXT,
    "ear_tip" BOOLEAN,
    "lifestyle" TEXT,
    "collar" TEXT,
    "notes" TEXT,
    "archived_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" UUID NOT NULL,
    "short_code" TEXT NOT NULL,
    "type" "REPORT_TYPE" NOT NULL,
    "status" "REPORT_STATUS" NOT NULL DEFAULT 'open',
    "close_reason" "CLOSE_REASON",
    "moderation_state" "MODERATION_STATE" NOT NULL DEFAULT 'visible',
    "pet_id" UUID,
    "species" "SPECIES" NOT NULL,
    "name" TEXT,
    "breed_codes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "colours" "COLOUR"[] DEFAULT ARRAY[]::"COLOUR"[],
    "pattern" "PATTERN",
    "size" "SIZE",
    "sex" "SEX",
    "chip_number" TEXT,
    "chip_status" TEXT NOT NULL DEFAULT 'none',
    "collar" TEXT,
    "ear_tip" BOOLEAN,
    "lifestyle" TEXT,
    "exact_point" extensions.geography(Point,4326) NOT NULL,
    "requested_radius_m" INTEGER,
    "public_point" extensions.geography(Point,4326) NOT NULL,
    "public_radius_m" INTEGER NOT NULL,
    "municipality_id" SMALLINT,
    "region_id" SMALLINT,
    "in_slovenia" BOOLEAN NOT NULL DEFAULT false,
    "event_at" TIMESTAMPTZ(6) NOT NULL,
    "circumstances" TEXT,
    "contact_pref" "CONTACT_PREF" NOT NULL DEFAULT 'chat_only',
    "reward_eur" INTEGER,
    "reward_note" TEXT,
    "linked_report_id" UUID,
    "source" "REPORT_SOURCE" NOT NULL DEFAULT 'user',
    "organisation_id" UUID,
    "boosted_until" TIMESTAMPTZ(6),
    "manage_token_hash" BYTEA,
    "first_match_at" TIMESTAMPTZ(6),
    "reunited_at" TIMESTAMPTZ(6),
    "closed_at" TIMESTAMPTZ(6),
    "last_owner_update_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_managers" (
    "report_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "report_managers_pkey" PRIMARY KEY ("report_id","user_id")
);

-- CreateTable
CREATE TABLE "report_contacts" (
    "report_id" UUID NOT NULL,
    "email" TEXT NOT NULL,

    CONSTRAINT "report_contacts_pkey" PRIMARY KEY ("report_id")
);

-- CreateIndex
CREATE INDEX "photos_report_id_idx" ON "photos"("report_id");

-- CreateIndex
CREATE INDEX "photos_pet_id_idx" ON "photos"("pet_id");

-- CreateIndex
CREATE UNIQUE INDEX "photos_owner_id_sha256_key" ON "photos"("owner_id", "sha256");

-- CreateIndex
CREATE INDEX "pets_owner_id_idx" ON "pets"("owner_id");

-- CreateIndex
CREATE UNIQUE INDEX "reports_short_code_key" ON "reports"("short_code");

-- CreateIndex
CREATE INDEX "reports_exact_point_idx" ON "reports" USING GIST ("exact_point");

-- CreateIndex
CREATE INDEX "reports_public_point_idx" ON "reports" USING GIST ("public_point");

-- CreateIndex
CREATE INDEX "reports_pet_id_idx" ON "reports"("pet_id");

-- CreateIndex
CREATE INDEX "report_managers_user_id_idx" ON "report_managers"("user_id");

-- AddForeignKey
ALTER TABLE "photos" ADD CONSTRAINT "photos_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photos" ADD CONSTRAINT "photos_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "pets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photos" ADD CONSTRAINT "photos_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "reports"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pets" ADD CONSTRAINT "pets_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "pets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_municipality_id_fkey" FOREIGN KEY ("municipality_id") REFERENCES "municipalities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "regions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_linked_report_id_fkey" FOREIGN KEY ("linked_report_id") REFERENCES "reports"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_managers" ADD CONSTRAINT "report_managers_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_managers" ADD CONSTRAINT "report_managers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_contacts" ADD CONSTRAINT "report_contacts_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Constraints (C4, C5)
alter table app.pets
    add constraint pets_chip_status_check check (chip_status in ('valid', 'invalid', 'none')),
    add constraint pets_chip_registered_crhz_check check (chip_registered_crhz in ('yes', 'no', 'unknown')),
    add constraint pets_lifestyle_check check (lifestyle in ('indoor', 'outdoor', 'both'));
alter table app.reports
    add constraint reports_chip_status_check check (chip_status in ('valid', 'invalid', 'none')),
    add constraint reports_lifestyle_check check (lifestyle in ('indoor', 'outdoor', 'both')),
    add constraint reports_name_lost_only check (name is null or type = 'lost'),
    add constraint reports_requested_radius_check check (requested_radius_m between 200 and 20000),
    add constraint reports_public_radius_check check (public_radius_m > 0),
    add constraint reports_circumstances_length check (char_length(circumstances) <= 1000),
    add constraint reports_reward_eur_check check (reward_eur between 1 and 10000),
    add constraint reports_reward_note_length check (char_length(reward_note) <= 80),
    add constraint reports_reward_lost_only check (type = 'lost' or (reward_eur is null and reward_note is null));
alter table app.report_managers
    add constraint report_managers_role_check check (role in ('owner', 'finder', 'staff'));
alter table app.photos
    add constraint photos_position_check check (position between 0 and 4),
    add constraint photos_one_parent check (pet_id is null or report_id is null);

alter table app.pets enable row level security;
alter table app.reports enable row level security;
alter table app.report_managers enable row level security;
alter table app.report_contacts enable row level security;
alter table app.photos enable row level security;

-- Public blur defaults (C6, lib/fuzz.ts)
insert into app.app_config (key, value, description) values
    ('fuzz.lost_min_radius_m', '500', 'Minimum public circle radius of lost reports, metres (C6)'),
    ('fuzz.found_min_radius_m', '150', 'Minimum public circle radius of found and sighted reports, metres (C6)'),
    ('fuzz.grid_m', '50', 'Grid the public circle centre snaps to, metres (C6)')
on conflict do nothing;
