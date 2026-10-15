-- task: TASK-6.8
-- rollback: drop table app.ad_stats_daily, app.ads, app.partner_stats_snapshot, app.leads, app.organisation_members, app.organisations, app.payment_events, app.payments, app.moderation_flags, app.abuse_reports; drop type app."ABUSE_REASON", app."AD_SLOT", app."ORGANISATION_KIND", app."ORGANISATION_ROLE", app."PAYMENT_PURPOSE", app."PAYMENT_STATUS"; delete from app.app_config where key in ('payments.prices', 'payments.live_allowed');
-- Abuse (C11), payments (C13), ads, partner stats and leads (C14), organisations. ADR-021: RLS enabled, no policies.
-- Check constraints are hand-written below (Prisma does not model them).

-- CreateEnum
CREATE TYPE "ABUSE_REASON" AS ENUM ('SCAM', 'FAKE', 'SPAM', 'INAPPROPRIATE_IMAGE', 'OTHER');

-- CreateEnum
CREATE TYPE "AD_SLOT" AS ENUM ('FEED', 'DETAIL', 'REUNITED', 'SIDEBAR');

-- CreateEnum
CREATE TYPE "ORGANISATION_KIND" AS ENUM ('SHELTER', 'VET', 'MUNICIPALITY');

-- CreateEnum
CREATE TYPE "ORGANISATION_ROLE" AS ENUM ('ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "PAYMENT_PURPOSE" AS ENUM ('TIP', 'REPORT_CONTRIBUTION', 'SUPPORT', 'BOOST', 'SUBSCRIPTION');

-- CreateEnum
CREATE TYPE "PAYMENT_STATUS" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED', 'CANCELED', 'REFUNDED');

-- CreateTable
CREATE TABLE "abuse_reports" (
    "id" UUID NOT NULL,
    "reporter_id" UUID NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_id" UUID NOT NULL,
    "reason" "ABUSE_REASON" NOT NULL,
    "note" VARCHAR(500),
    "weight" DECIMAL(2,1) NOT NULL DEFAULT 1.0,
    "status" TEXT NOT NULL DEFAULT 'open',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "abuse_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "moderation_flags" (
    "id" UUID NOT NULL,
    "kind" TEXT NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_id" UUID NOT NULL,
    "details" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMPTZ(6),

    CONSTRAINT "moderation_flags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ads" (
    "id" UUID NOT NULL,
    "title" VARCHAR(60) NOT NULL,
    "body" VARCHAR(120) NOT NULL,
    "cta" VARCHAR(24) NOT NULL,
    "link_url" TEXT NOT NULL,
    "image_path" TEXT,
    "image_alt" TEXT NOT NULL,
    "locales" TEXT[] DEFAULT ARRAY['sl', 'en']::TEXT[],
    "slots" "AD_SLOT"[] NOT NULL,
    "region_ids" SMALLINT[],
    "municipality_ids" SMALLINT[],
    "species" TEXT[],
    "starts_at" TIMESTAMPTZ(6),
    "ends_at" TIMESTAMPTZ(6),
    "status" TEXT NOT NULL DEFAULT 'draft',
    "is_house" BOOLEAN NOT NULL DEFAULT false,
    "house_kind" TEXT,
    "exclusive" BOOLEAN NOT NULL DEFAULT false,
    "weight" INTEGER NOT NULL DEFAULT 1,
    "deleted_at" TIMESTAMPTZ(6),
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ad_stats_daily" (
    "day" DATE NOT NULL,
    "ad_id" UUID NOT NULL,
    "slot" "AD_SLOT" NOT NULL,
    "region_id" SMALLINT NOT NULL DEFAULT 0,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ad_stats_daily_pkey" PRIMARY KEY ("day","ad_id","slot","region_id")
);

-- CreateTable
CREATE TABLE "partner_stats_snapshot" (
    "id" UUID NOT NULL,
    "generated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data" JSONB NOT NULL,

    CONSTRAINT "partner_stats_snapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads" (
    "id" UUID NOT NULL,
    "company" TEXT NOT NULL,
    "contact_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "region_interest" TEXT,
    "interest" TEXT NOT NULL DEFAULT 'unsure',
    "message" VARCHAR(2000) NOT NULL,
    "consent_at" TIMESTAMPTZ(6) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'new',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organisations" (
    "id" UUID NOT NULL,
    "kind" "ORGANISATION_KIND" NOT NULL,
    "name" TEXT NOT NULL,
    "municipality_id" SMALLINT,
    "verified_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "organisations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organisation_members" (
    "organisation_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "ORGANISATION_ROLE" NOT NULL DEFAULT 'MEMBER',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organisation_members_pkey" PRIMARY KEY ("organisation_id","user_id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "purpose" "PAYMENT_PURPOSE" NOT NULL,
    "amount_cents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "status" "PAYMENT_STATUS" NOT NULL DEFAULT 'PENDING',
    "provider" TEXT NOT NULL,
    "provider_session_id" TEXT,
    "provider_payment_id" TEXT,
    "refs" JSONB,
    "receipt_sent_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_events" (
    "id" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_event_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "summary" JSONB NOT NULL,
    "received_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "abuse_reports_target_type_target_id_idx" ON "abuse_reports"("target_type", "target_id");

-- CreateIndex
CREATE UNIQUE INDEX "abuse_reports_reporter_id_target_type_target_id_key" ON "abuse_reports"("reporter_id", "target_type", "target_id");

-- CreateIndex
CREATE INDEX "moderation_flags_target_type_target_id_idx" ON "moderation_flags"("target_type", "target_id");

-- CreateIndex
CREATE INDEX "partner_stats_snapshot_generated_at_idx" ON "partner_stats_snapshot"("generated_at");

-- CreateIndex
CREATE INDEX "organisation_members_user_id_idx" ON "organisation_members"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_provider_session_id_key" ON "payments"("provider_session_id");

-- CreateIndex
CREATE INDEX "payments_user_id_created_at_idx" ON "payments"("user_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "payment_events_provider_event_id_key" ON "payment_events"("provider_event_id");

-- AddForeignKey
ALTER TABLE "ad_stats_daily" ADD CONSTRAINT "ad_stats_daily_ad_id_fkey" FOREIGN KEY ("ad_id") REFERENCES "ads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organisation_members" ADD CONSTRAINT "organisation_members_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organisation_members" ADD CONSTRAINT "organisation_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "abuse_reports" ADD CONSTRAINT "abuse_reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ads" ADD CONSTRAINT "ads_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organisations" ADD CONSTRAINT "organisations_municipality_id_fkey" FOREIGN KEY ("municipality_id") REFERENCES "municipalities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Checks (C11, C13, C14)
alter table app.abuse_reports
    add constraint abuse_reports_target_type_check check (target_type in ('report', 'message', 'profile')),
    add constraint abuse_reports_status_check check (status in ('open', 'dismissed', 'actioned'));
alter table app.moderation_flags
    add constraint moderation_flags_kind_check check (kind in ('duplicate_chip', 'anon_hold', 'auto_hidden'));
alter table app.payments
    add constraint payments_amount_cents_check check (amount_cents >= 200),
    add constraint payments_currency_check check (currency = 'EUR'),
    add constraint payments_provider_check check (provider in ('stripe', 'mock'));
-- Never the raw provider event: only these top-level keys (no customer details, no card brand/last4/expiry).
alter table app.payment_events
    add constraint payment_events_summary_keys_check check (
        summary - array['id', 'type', 'object_id', 'payment_intent', 'amount', 'currency', 'status', 'livemode'] = '{}'::jsonb
    );
alter table app.ads
    add constraint ads_link_url_check check (link_url ~ '^https://'),
    add constraint ads_image_alt_check check (char_length(image_alt) between 5 and 140),
    add constraint ads_slots_check check (slots is not null and cardinality(slots) > 0),
    add constraint ads_species_check check (species <@ array['dog', 'cat']),
    add constraint ads_status_check check (status in ('draft', 'active', 'paused', 'ended')),
    add constraint ads_house_kind_check check (house_kind in ('supporter', 'partner', 'adopt'));
alter table app.leads
    add constraint leads_interest_check check (interest in ('ad', 'vet_partner', 'unsure'));

-- Prices in EUR cents (C13, client decisions): fixed prices come only from here, never from the client. Vet Partner is
-- a test price; shelters and municipalities never pay. Support: EUR 3 / 5 / 10 suggested (5 highlighted, nothing
-- pre-selected), custom from EUR 2; Podpornik from EUR 2 a month.
insert into app.app_config (key, value, is_public, description, updated_at) values
    ('payments.prices', '{"boost_cents": 499, "premium_monthly_cents": 299, "premium_yearly_cents": 2499, "vet_partner_monthly_cents": 3900, "podpornik_min_monthly_cents": 200, "support_suggested_cents": [300, 500, 1000], "support_highlight_cents": 500, "custom_min_cents": 200}', true, 'Fixed prices and suggested amounts in EUR cents (C13)', now()),
    ('payments.live_allowed', 'false', false, 'Live Stripe keys stay refused until fiscal invoicing is settled (C13)', now())
on conflict (key) do nothing;

alter table app.abuse_reports enable row level security;
alter table app.moderation_flags enable row level security;
alter table app.payments enable row level security;
alter table app.payment_events enable row level security;
alter table app.ads enable row level security;
alter table app.ad_stats_daily enable row level security;
alter table app.partner_stats_snapshot enable row level security;
alter table app.leads enable row level security;
alter table app.organisations enable row level security;
alter table app.organisation_members enable row level security;
