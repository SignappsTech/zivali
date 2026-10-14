---
id: TASK-6.9
title: >-
  Contract clients in @zivali/api: auth, profiles, pets, reports, photos,
  geocode, matches
status: To Do
assignee:
  - '@frontend-dev'
created_date: '2026-10-14 22:12'
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

Unblocks on: packages/api foundation: client conventions, ApiError, query defaults, fixtures merged (TASK-3.5); Domain wire types, zod schemas, chip normalisation and breed codes merged (TASK-6.5)
Design: none (no UI of its own)
Contracts: C3, C4, C6 (in references); conventions in C1
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-6.9-api-core
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 @zivali/api/auth, profiles, pets, reports, photos, geocode and matches implement every client function named in C3, C4, C5, C6 and C8 with the contract names, argument and return types.
- [ ] #2 useSession() and useRequireAuth() hooks (C3) work with any supabase-js client on web and mobile.
- [ ] #3 The geocoder supports maptiler, photon and mock providers selected by env, prefers Slovenia, debounces input and returns at most 5 places; unit tests use the mock.
- [ ] #4 Fixtures from the contract examples exist for each domain; unit tests cover argument and error mapping with createMockClient().
- [ ] #5 Functions whose RPC is not merged yet name the owning backend task in a code comment and still type-check.
<!-- AC:END -->
