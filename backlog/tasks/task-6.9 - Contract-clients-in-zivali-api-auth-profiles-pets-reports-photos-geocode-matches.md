---
id: TASK-6.9
title: 'REST clients in @zivali/api: auth, me, pets, reports, photos, geocode, matches'
status: Done
assignee:
  - '@frontend-dev'
created_date: '2026-10-14 22:12'
updated_date: '2026-10-15 03:07'
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
Client toolchain: RTK Query + codegen (docs/tech/adr/020-api-architecture.md §Client; frontend.md `@zivali/api`).
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-6.9-api-core
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 @zivali/api/auth (Supabase Auth helpers), me, pets, reports, photos (POST /v1/photos, presigned PUT with progress, /complete), geocode and matches implement every client function in C3, C4, C5, C6 and C8 as RTK Query endpoints and hooks over REST with the contract paths and types. Endpoints are RTK Query endpoints: generated from apps/api/openapi.json by `gen:api` (never edited by hand) once the backend task has merged them into the spec; until then `api.injectEndpoints` stubs in src/<domain>.ts follow the contract paths and types, naming the owning backend task, and are deleted when the generated ones land (@zivali/api/rtk, TASK-3.5).
- [x] #2 useSession() and useRequireAuth() (C3) combine the Supabase session with GET /v1/me on web and mobile.
- [x] #3 Fixtures from the contract examples exist for each domain; unit tests cover argument and error mapping (store + mock baseQuery or createMockApi()).
- [x] #4 Endpoints whose backend task is not merged yet name the owning backend task in a code comment and still type-check; no TanStack Query is used (ADR-020 §Client).
- [x] #5 geocode implements searchPlaces and reversePlace over POST /v1/geo/search and /v1/geo/reverse (C6) with no third-party provider and no key; the debounce (300 ms, minimum 3 characters, abort previous) lives in a shared hook over the RTK Query lazy query; unit tests use a mock baseQuery.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Endpoint stubs in packages/api/src/(me, pets, reports, photos, geocode, matches).ts name their backend task (9.2, 34.2, 16.3, 14.1, 6.6, 29.2, 31.3, 26.3, 85.1, 15.8, 20.2). auth.ts: configureAuth, Supabase helpers, useSession, useRequireAuth with gate. Fixtures in src/__fixtures__/, 45 node tests. Apps wire configureAuth in TASK-9.3/9.4. CHANGEs CH-37..39 (photoAlt skipped, coarsenPoint missing).
<!-- SECTION:NOTES:END -->
