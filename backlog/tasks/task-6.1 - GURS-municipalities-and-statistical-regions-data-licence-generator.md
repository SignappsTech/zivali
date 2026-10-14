---
id: TASK-6.1
title: 'GURS municipalities and statistical regions: data, licence, generator'
status: Done
assignee:
  - '@backend-dev'
created_date: '2026-10-14 22:12'
updated_date: '2026-10-14 23:18'
labels:
  - be
  - 'est:S'
milestone: m-0
dependencies: []
references:
  - docs/tech/backend.md
  - docs/tech/contracts/C6-location-geo-maps.md
  - docs/tech/adr/006-location-privacy-and-geo-reference.md
parent_task_id: TASK-6
priority: high
ordinal: 121000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Ad targeting, partner stats and the analytics dimensions need municipality and statistical region for every report without an API call (ADR-006, R-019). Pure data work, independent of the stack.

## Packet

Unblocks on: nothing (ready now)
Contracts: C6 (in references); conventions in C1
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-6.1-geodata
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Slovenia's 12 statistical regions and 212 municipalities are obtained from GURS open data (Register of Spatial Units); licence and required attribution are recorded in supabase/seed/geo/LICENSE.md, and an unsuitable licence is reported as needs-input with the ADR-006 fallback.
- [x] #2 Geometries are simplified to at most 2 MB of WGS84 GeoJSON with slug (ASCII lower-case), name_sl, name_en and the municipality-to-region relation, committed under supabase/seed/geo/.
- [x] #3 scripts/geo-to-sql.mjs deterministically generates the seed SQL from the GeoJSON; a test checks 12 and 212 features, unique slugs, valid polygons, and that points in Ljubljana, Maribor and Koper fall in the right municipality and region.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
GURS RPE via WFS (OBCINE, STATISTICNE_REGIJE), licence CC BY 4.0 (suitable, commercial use allowed); attribution text SL/EN in supabase/seed/geo/LICENSE.md.
GeoJSON: regions.geojson + municipalities.geojson, 1.67 MB total, ids = GURS codes (SIFRA), regions dissolved from simplified municipalities (borders coincide). Processing reproducible from the mapshaper command in LICENSE.md (npx one-off, no repo dependency).
Generator: node scripts/geo-to-sql.mjs <out.sql> writes plain SQL (insert ... on conflict (id) do update, geometry as EWKT literals) for public.regions then public.municipalities; loadable by any tool. Verified once in PostGIS 3.4: 224 rows, all ST_IsValid, total 20,273 km2, idempotent reload, 3 city points correct.
Tests: node --test scripts/*.test.mjs (5 pass). Integration: root package.json (TASK-3.1) needs this in test/verify; TASK-6.4 runs the generator into its seed file or migration.
Source artefact: Ivancna Gorica / Zuzemberk overlap ~330 m2 in GURS data; geo_lookup should pick one deterministically (order by id limit 1).
<!-- SECTION:NOTES:END -->
