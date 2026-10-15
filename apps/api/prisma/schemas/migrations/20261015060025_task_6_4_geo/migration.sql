-- task: TASK-6.4
-- rollback: drop table app.municipalities, app.regions;
-- Geo reference (C6, ADR-006): GURS statistical regions and municipalities, filled by seeder 01-geo.
-- ADR-021: RLS enabled, no policies.

-- CreateTable
CREATE TABLE "regions" (
    "id" SMALLINT NOT NULL,
    "slug" TEXT NOT NULL,
    "name_sl" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "geom" extensions.geography(MultiPolygon,4326) NOT NULL,

    CONSTRAINT "regions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "municipalities" (
    "id" SMALLINT NOT NULL,
    "slug" TEXT NOT NULL,
    "name_sl" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "region_id" SMALLINT NOT NULL,
    "geom" extensions.geography(MultiPolygon,4326) NOT NULL,

    CONSTRAINT "municipalities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "regions_slug_key" ON "regions"("slug");

-- CreateIndex
CREATE INDEX "regions_geom_idx" ON "regions" USING GIST ("geom");

-- CreateIndex
CREATE UNIQUE INDEX "municipalities_slug_key" ON "municipalities"("slug");

-- CreateIndex
CREATE INDEX "municipalities_geom_idx" ON "municipalities" USING GIST ("geom");

-- AddForeignKey
ALTER TABLE "municipalities" ADD CONSTRAINT "municipalities_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "regions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

alter table app.regions enable row level security;
alter table app.municipalities enable row level security;
