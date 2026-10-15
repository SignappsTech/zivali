---
id: TASK-15.8
title: >-
  Geocoder API: geo_places and geo_addresses, seeder, POST /v1/geo/search and
  /v1/geo/reverse
status: To Do
assignee:
  - '@backend-dev'
created_date: '2026-10-15 00:12'
labels:
  - be
  - 'est:M'
milestone: m-1
dependencies:
  - TASK-15.7
  - TASK-6.4
  - TASK-6.5
references:
  - docs/tech/backend.md
  - docs/tech/contracts/C6-location-geo-maps.md
  - docs/tech/contracts/C1-platform-conventions.md
  - docs/tech/adr/007-maps-and-geocoding.md
parent_task_id: TASK-15
priority: high
ordinal: 295000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The location picker and the map page search places and show an area label for a point without any third-party geocoder, so exact points never leave our infrastructure and the service costs nothing (ADR-007 revised, FR-004, LQ-21). Web and mobile code against `@zivali/api/geocode` with the mock until this lands.

## Packet

Unblocks on: GURS settlements, districts, streets and house numbers snapshot merged (TASK-15.7); geo models, GURS seeder and geoLookup merged, as this task extends prisma/schemas/geo.prisma after it (TASK-6.4); zod schemas incl. the C6 geo schemas and normalisePlace merged (TASK-6.5)
Contracts: C6 §Geocoder, C1 (in references)
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-15.8-geocoder
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 One migration enables pg_trgm (schema extensions) and creates app.geo_places and app.geo_addresses per C6 with RLS enabled, the trigram GIN and GiST indexes and data-inventory entries; seeder 02-geo-places loads the TASK-15.7 snapshot idempotently; the measured pg_total_relation_size of both tables is in the task notes (budget 70 MB).
- [ ] #2 POST /v1/geo/search follows C6 parsing and ranking (exact, prefix, similarity, tail qualifier, weight, near) and returns at most 5 Places with a house-number hit first; tests cover 'trubarjeva 5, ljubljana', 'sentvid' without diacritics, an Italian or Hungarian alt name, 'Cankarjeva ulica' with near, a village address and a too-short q (VALIDATION); a search takes under 50 ms locally.
- [ ] #3 POST /v1/geo/reverse returns the district or settlement label with its municipality per C6, the municipality alone when no settlement covers the point, and null outside Slovenia; tests cover Šiška in Ljubljana, a village and a point in Austria.
- [ ] #4 Both endpoints use optionalAuth and rate limit geo (60 per minute per IP and per device, then 429 RATE_LIMITED), accept the location only in the POST body and send Cache-Control: no-store; a test proves the request log line contains neither q nor coordinates; permission-matrix rows exist for anonymous visitor, anonymous user and user.
<!-- AC:END -->
