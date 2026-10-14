---
id: TASK-6.9
title: 'REST clients in @zivali/api: auth, me, pets, reports, photos, geocode, matches'
status: To Do
assignee:
  - '@frontend-dev'
created_date: '2026-10-14 22:12'
updated_date: '2026-10-14 23:38'
labels:
  - fe
  - 'est:M'
  - no-design
milestone: m-0
dependencies:
  - TASK-3.5
  - TASK-6.5
references:
  - docs/tech/frontend.md
  - docs/tech/contracts/C3-auth-profiles-roles.md
  - docs/tech/contracts/C4-reports-and-pets.md
  - docs/tech/contracts/C6-location-geo-maps.md
parent_task_id: TASK-6
priority: high
ordinal: 129000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
UI tasks code against these functions while backend tasks implement the RPCs, so neither waits for the other. Also covers C5 (photos) and C8 (matches).

## Packet

Unblocks on: packages/api foundation: REST client, ApiError, idempotency and query helpers, fixtures merged (TASK-3.5); Domain wire types and DTOs, zod request schemas, chip normalisation and breed codes merged (TASK-6.5)
Design: none (no UI of its own)
Contracts: C3, C4, C6 (in references); conventions in C1
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-6.9-api-core
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 @zivali/api/auth (Supabase Auth helpers), me, pets, reports, photos (POST /v1/photos, presigned PUT with progress, /complete), geocode and matches implement every client function in C3, C4, C5, C6 and C8 over REST with the contract paths and types.
- [ ] #2 useSession() and useRequireAuth() (C3) combine the Supabase session with GET /v1/me on web and mobile.
- [ ] #3 The geocoder supports maptiler, photon and mock providers selected by env, prefers Slovenia, debounces input and returns at most 5 places; unit tests use the mock.
- [ ] #4 Fixtures from the contract examples exist for each domain; unit tests cover argument and error mapping with createMockApi().
- [ ] #5 Functions whose endpoint is not merged yet name the owning backend task in a code comment and still type-check.
<!-- AC:END -->
