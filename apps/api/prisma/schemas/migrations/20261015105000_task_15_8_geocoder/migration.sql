-- task: TASK-15.8
-- rollback: drop table app.geo_addresses, app.geo_places; drop extension if exists pg_trgm;
-- Geocoder (C6 §Geocoder, ADR-007): GURS settlements, districts, streets and house numbers, filled by seeder
-- 02-geo-places. pg_trgm in schema `extensions` for the trigram indexes. ADR-021: RLS enabled, no policies.

create extension if not exists pg_trgm with schema extensions;

-- CreateTable
CREATE TABLE "geo_places" (
    "id" BIGINT NOT NULL,
    "kind" SMALLINT NOT NULL,
    "name" TEXT NOT NULL,
    "alt_name" TEXT,
    "search" TEXT NOT NULL,
    "search_alt" TEXT,
    "municipality_id" SMALLINT NOT NULL,
    "settlement_id" BIGINT,
    "weight" INTEGER NOT NULL DEFAULT 0,
    "point" extensions.geography(Point,4326) NOT NULL,
    "geom" extensions.geography(MultiPolygon,4326),

    CONSTRAINT "geo_places_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "geo_addresses" (
    "place_id" BIGINT NOT NULL,
    "number" SMALLINT NOT NULL,
    "suffix" TEXT NOT NULL DEFAULT '',
    "point" extensions.geography(Point,4326) NOT NULL,

    CONSTRAINT "geo_addresses_pkey" PRIMARY KEY ("place_id","number","suffix")
);

-- CreateIndex
CREATE INDEX "geo_places_search_idx" ON "geo_places" USING GIN ("search" extensions.gin_trgm_ops);

-- CreateIndex
CREATE INDEX "geo_places_search_alt_idx" ON "geo_places" USING GIN ("search_alt" extensions.gin_trgm_ops);

-- CreateIndex
CREATE INDEX "geo_places_geom_idx" ON "geo_places" USING GIST ("geom");

-- AddForeignKey
ALTER TABLE "geo_places" ADD CONSTRAINT "geo_places_municipality_id_fkey" FOREIGN KEY ("municipality_id") REFERENCES "municipalities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

alter table app.geo_places enable row level security;
alter table app.geo_addresses enable row level security;
