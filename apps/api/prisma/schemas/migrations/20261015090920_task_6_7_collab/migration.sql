-- task: TASK-6.7
-- rollback: drop table app.email_outbox, app.alert_deliveries, app.alert_subscriptions, app.push_tokens,
--   app.notification_prefs, app.notifications, app.blocks, app.messages, app.conversation_participants,
--   app.conversations, app.match_feedback, app.matches; drop type app."MATCH_STATE";
-- Matching (C8), chat (C9), notifications and nearby alerts (C10). ADR-021: RLS enabled, no policies.
-- Follow-up once TASK-6.6 (reports) is merged, in a new migration:
--   foreign keys to app.reports(id) on matches.lost_report_id, matches.other_report_id (on delete cascade),
--   conversations.about_report_id, .lost_report_id, .other_report_id and alert_deliveries.report_id;
--   alert_subscriptions.species text[] -> app."SPECIES"[] (drop the species check and default, alter type
--   using species::app."SPECIES"[], restore the default '{dog,cat}').

-- CreateEnum
CREATE TYPE "MATCH_STATE" AS ENUM ('suggested', 'confirmed', 'rejected', 'closed');

-- CreateTable
CREATE TABLE "conversations" (
    "id" UUID NOT NULL,
    "lost_report_id" UUID,
    "other_report_id" UUID,
    "about_report_id" UUID NOT NULL,
    "match_id" UUID,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closed_at" TIMESTAMPTZ(6),

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversation_participants" (
    "conversation_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" TEXT NOT NULL,
    "alias" TEXT,
    "last_read_at" TIMESTAMPTZ(6),
    "muted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "conversation_participants_pkey" PRIMARY KEY ("conversation_id","user_id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" UUID NOT NULL,
    "conversation_id" UUID NOT NULL,
    "sender_id" UUID,
    "kind" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "location" JSONB,
    "has_link" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blocks" (
    "blocker_id" UUID NOT NULL,
    "blocked_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blocks_pkey" PRIMARY KEY ("blocker_id","blocked_id")
);

-- CreateTable
CREATE TABLE "matches" (
    "id" UUID NOT NULL,
    "lost_report_id" UUID NOT NULL,
    "other_report_id" UUID NOT NULL,
    "score" DECIMAL(4,3) NOT NULL,
    "strength" TEXT NOT NULL,
    "chip_match" BOOLEAN NOT NULL,
    "reasons" JSONB NOT NULL,
    "state" "MATCH_STATE" NOT NULL DEFAULT 'suggested',
    "algo_version" TEXT NOT NULL DEFAULT 'v1',
    "rejected_reason" TEXT,
    "notified_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "matches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "match_feedback" (
    "match_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "verdict" TEXT NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "match_feedback_pkey" PRIMARY KEY ("match_id","user_id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "read_at" TIMESTAMPTZ(6),
    "dedupe_key" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_prefs" (
    "user_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "in_app" BOOLEAN NOT NULL DEFAULT true,
    "push" BOOLEAN NOT NULL DEFAULT true,
    "email" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "notification_prefs_pkey" PRIMARY KEY ("user_id","type")
);

-- CreateTable
CREATE TABLE "push_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "last_seen_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "push_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alert_subscriptions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "center_point" extensions.geography(Point,4326) NOT NULL,
    "radius_km" INTEGER NOT NULL,
    "species" TEXT[] DEFAULT ARRAY['dog', 'cat']::TEXT[],
    "paused" BOOLEAN NOT NULL DEFAULT false,
    "daily_cap" INTEGER NOT NULL DEFAULT 5,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "alert_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alert_deliveries" (
    "report_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "sent_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "channel" TEXT NOT NULL,

    CONSTRAINT "alert_deliveries_pkey" PRIMARY KEY ("report_id","user_id")
);

-- CreateTable
CREATE TABLE "email_outbox" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "template" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "to_address_hash" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "provider_id" TEXT,
    "error" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_outbox_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "conversations_match_id_key" ON "conversations"("match_id");

-- CreateIndex
CREATE INDEX "conversations_about_report_id_idx" ON "conversations"("about_report_id");

-- CreateIndex
CREATE INDEX "conversation_participants_user_id_idx" ON "conversation_participants"("user_id");

-- CreateIndex
CREATE INDEX "messages_conversation_id_created_at_id_idx" ON "messages"("conversation_id", "created_at", "id");

-- CreateIndex
CREATE INDEX "messages_sender_id_idx" ON "messages"("sender_id");

-- CreateIndex
CREATE INDEX "blocks_blocked_id_idx" ON "blocks"("blocked_id");

-- CreateIndex
CREATE INDEX "matches_other_report_id_idx" ON "matches"("other_report_id");

-- CreateIndex
CREATE UNIQUE INDEX "matches_lost_report_id_other_report_id_key" ON "matches"("lost_report_id", "other_report_id");

-- CreateIndex
CREATE INDEX "match_feedback_user_id_idx" ON "match_feedback"("user_id");

-- CreateIndex
CREATE INDEX "notifications_user_id_created_at_idx" ON "notifications"("user_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "notifications_user_id_dedupe_key_key" ON "notifications"("user_id", "dedupe_key");

-- CreateIndex
CREATE UNIQUE INDEX "push_tokens_token_key" ON "push_tokens"("token");

-- CreateIndex
CREATE INDEX "push_tokens_user_id_idx" ON "push_tokens"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "alert_subscriptions_user_id_key" ON "alert_subscriptions"("user_id");

-- CreateIndex
CREATE INDEX "alert_subscriptions_center_point_idx" ON "alert_subscriptions" USING GIST ("center_point");

-- CreateIndex
CREATE INDEX "alert_deliveries_user_id_sent_at_idx" ON "alert_deliveries"("user_id", "sent_at");

-- CreateIndex
CREATE INDEX "email_outbox_user_id_idx" ON "email_outbox"("user_id");

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_participants" ADD CONSTRAINT "conversation_participants_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_participants" ADD CONSTRAINT "conversation_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_blocker_id_fkey" FOREIGN KEY ("blocker_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_blocked_id_fkey" FOREIGN KEY ("blocked_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_feedback" ADD CONSTRAINT "match_feedback_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_feedback" ADD CONSTRAINT "match_feedback_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_prefs" ADD CONSTRAINT "notification_prefs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "push_tokens" ADD CONSTRAINT "push_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alert_subscriptions" ADD CONSTRAINT "alert_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alert_deliveries" ADD CONSTRAINT "alert_deliveries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_outbox" ADD CONSTRAINT "email_outbox_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Value checks (C8-C10); Prisma keeps these columns as text.
alter table app.matches add constraint matches_strength_check check (strength in ('strong', 'good', 'possible'));
alter table app.match_feedback add constraint match_feedback_verdict_check check (verdict in ('confirm', 'reject'));
alter table app.conversations add constraint conversations_status_check check (status in ('active', 'read_only'));
alter table app.conversation_participants
	add constraint conversation_participants_role_check check (role in ('owner', 'finder', 'contact'));
alter table app.messages add constraint messages_kind_check check (kind in ('text', 'location', 'system'));
alter table app.messages add constraint messages_body_check check (char_length(body) between 1 and 2000);
alter table app.push_tokens add constraint push_tokens_platform_check check (platform in ('ios', 'android'));
alter table app.alert_subscriptions add constraint alert_subscriptions_radius_km_check check (radius_km between 1 and 25);
alter table app.alert_subscriptions
	add constraint alert_subscriptions_species_check check (species <@ array['dog', 'cat']::text[]);
alter table app.email_outbox
	add constraint email_outbox_status_check check (status in ('queued', 'sent', 'failed', 'mocked'));

alter table app.matches enable row level security;
alter table app.match_feedback enable row level security;
alter table app.conversations enable row level security;
alter table app.conversation_participants enable row level security;
alter table app.messages enable row level security;
alter table app.blocks enable row level security;
alter table app.notifications enable row level security;
alter table app.notification_prefs enable row level security;
alter table app.push_tokens enable row level security;
alter table app.alert_subscriptions enable row level security;
alter table app.alert_deliveries enable row level security;
alter table app.email_outbox enable row level security;
