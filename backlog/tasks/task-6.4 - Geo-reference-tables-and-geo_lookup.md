---
id: TASK-6.4
title: 'Geo reference models, GURS seeder and TypedSQL geo lookup'
status: In Progress
assignee:
  - '@backend-dev'
created_date: '2026-10-14 22:12'
updated_date: '2026-10-15 05:46'
labels:
  - be
  - 'est:S'
milestone: m-0
dependencies:
  - TASK-6.2
  - TASK-6.1
references:
  - docs/tech/backend.md
  - docs/tech/contracts/C6-location-geo-maps.md
  - docs/tech/contracts/C1-platform-conventions.md
parent_task_id: TASK-6
priority: high
ordinal: 124000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Reports, ads and stats derive municipality and region from a point inside Postgres (ADR-006).

## Packet

Unblocks on: DB foundation and lockdown: schema app, extensions, deny-all RLS, security tests, platform models, fixture users merged (TASK-6.2); GURS municipalities and statistical regions: data, licence, generator merged (TASK-6.1)
Contracts: C6, C1 (in references); conventions in C1
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-6.4-geo
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Prisma models regions and municipalities (geom as Unsupported geography with GiST indexes in the migration) are loaded by seeder 01-geo, which runs the GURS SQL in supabase/seed/geo (scripts/geo-to-sql.mjs output) idempotently as an upsert (not truncate+insert; cascade-safe).
- [ ] #2 GeoDomain.lookup (lib/geo.ts, `$queryRaw` + `Prisma.sql`, lat/lng validated with `LatLng` first; TypedSQL dropped, it needs a live DB at build time; geography type is `extensions.geography`) returns municipality and region ids and slugs for a point and breaks ties with `order by id limit 1` (the Ivančna Gorica and Žužemberk polygons overlap by about 330 m²); no row means in_slovenia = false; GeoDomain.lookup wraps it.
- [ ] #3 Tests cover inside, the overlap tie, near-border and outside-Slovenia points; a lookup runs in under 5 ms locally using the spatial index.
<!-- AC:END -->
