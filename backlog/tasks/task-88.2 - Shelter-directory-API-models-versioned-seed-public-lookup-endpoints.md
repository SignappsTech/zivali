---
id: TASK-88.2
title: 'Shelter directory API: models, versioned seed, public lookup endpoints'
status: In Progress
assignee:
  - '@backend-dev'
created_date: '2026-10-14 23:36'
updated_date: '2026-10-15 08:29'
labels:
  - be
  - 'est:S'
milestone: m-1
dependencies:
  - TASK-88.1
  - TASK-6.4
  - TASK-6.12
references:
  - docs/tech/backend.md
  - docs/tech/contracts/C18-shelter-directory.md
  - docs/tech/contracts/C6-location-geo-maps.md
  - docs/tech/contracts/C1-platform-conventions.md
parent_task_id: TASK-88
priority: high
ordinal: 282000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
One directory lookup powers the post-submit checklists, the call buttons, the offline cache and the public shelter pages (FR-044).
## Packet
Unblocks on: Shelter directory data: 17 shelters, 212 municipality assignments, sources merged (TASK-88.1); Geo reference models, GURS seeder and TypedSQL geo lookup merged (TASK-6.4); API auth and platform middleware: JWKS verification, guards, rate limits, idempotency, ctx, audit, public config merged (TASK-6.12)
Contracts: C18, C6, C1 (in references); conventions in C1 and ADR-020
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-88.2-dir-api
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Prisma models shelters, municipality_shelters and directory_changes per C18 (RLS enabled, data-inventory entries) are loaded by seeder 05-directory from the CSVs, writing an initial version per row.
- [ ] #2 GET /v1/shelters, /v1/shelters/:slug, /v1/shelters/municipalities and /v1/shelters/responsible (point or municipality) respond per C18 with public caching; an unconfirmed municipality never returns a phone number and a point outside Slovenia returns outside_slovenia.
- [ ] #3 DirectoryDomain.getResponsibleShelter is reusable by other domains and the worker; Supertest covers confirmed, unconfirmed, outside-Slovenia and the Ivančna Gorica/Žužemberk overlap.
- [ ] #4 responsible endpoint returns status 'likely' with likely_shelter {slug,name,phone,distance_km} when a likely shelter is known, else 'unconfirmed' with nearest (up to 2 {slug,name,distance_km}, no phone); municipality always included (C18 CH-81)
<!-- AC:END -->
