-- task: TASK-6.2
-- rollback: drop table app.profiles, app.idempotency_keys, app.rate_limits, app.audit_log, app.app_config; drop type app."USER_ROLE";
-- Platform models (C1) and profiles (C3). ADR-021: RLS on every table and no policies; only the API (the postgres
-- owner role, which RLS does not restrict) reads and writes them. `?schema=app` puts everything below in `app`.

-- CreateEnum
CREATE TYPE "USER_ROLE" AS ENUM ('USER', 'SHELTER_MEMBER', 'MODERATOR', 'ADMIN');

-- CreateTable
CREATE TABLE "app_config" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "app_config_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" UUID NOT NULL,
    "actor_id" UUID,
    "action" TEXT NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_id" TEXT,
    "diff" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rate_limits" (
    "name" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "window_start" TIMESTAMPTZ(6) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "rate_limits_pkey" PRIMARY KEY ("name","key","window_start")
);

-- CreateTable
CREATE TABLE "idempotency_keys" (
    "key" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "route" TEXT NOT NULL,
    "status" INTEGER,
    "body" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "idempotency_keys_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "profiles" (
    "id" UUID NOT NULL,
    "display_name" VARCHAR(60),
    "locale" TEXT NOT NULL DEFAULT 'sl',
    "role" "USER_ROLE" NOT NULL DEFAULT 'USER',
    "home_point" extensions.geography(Point,4326),
    "home_radius_km" INTEGER NOT NULL DEFAULT 5,
    "phone" TEXT,
    "is_anonymous" BOOLEAN NOT NULL DEFAULT false,
    "supporter_badge_visible" BOOLEAN NOT NULL DEFAULT true,
    "quiet_from" TEXT,
    "quiet_to" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "rate_limits_window_start_idx" ON "rate_limits"("window_start");

-- CreateIndex
CREATE INDEX "idempotency_keys_created_at_idx" ON "idempotency_keys"("created_at");

-- ADR-021: deny-all RLS (no policies), also on Prisma's own migrations table (absent in the shadow database).
do $$
begin
	if to_regclass('app._prisma_migrations') is not null then
		alter table app._prisma_migrations enable row level security;
	end if;
end $$;
alter table app.app_config enable row level security;
alter table app.audit_log enable row level security;
alter table app.rate_limits enable row level security;
alter table app.idempotency_keys enable row level security;
alter table app.profiles enable row level security;
