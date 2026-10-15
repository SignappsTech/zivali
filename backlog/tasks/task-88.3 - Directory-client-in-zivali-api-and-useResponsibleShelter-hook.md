---
id: TASK-88.3
title: Directory endpoints in @zivali/api (RTK Query) and useResponsibleShelter hook
status: To Do
assignee:
  - '@frontend-dev'
created_date: '2026-10-14 23:36'
updated_date: '2026-10-14 23:38'
labels:
  - fe
  - 'est:S'
  - no-design
  - trivial
milestone: m-1
dependencies:
  - TASK-3.5
references:
  - docs/tech/frontend.md
  - docs/tech/contracts/C18-shelter-directory.md
parent_task_id: TASK-88
priority: high
ordinal: 283000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Web and mobile checklists, call buttons and shelter pages read the directory through one client and hook (C18).
## Packet
Unblocks on: packages/api foundation: REST client, ApiError, idempotency and query helpers, fixtures merged (TASK-3.5)
Design: none (no UI of its own)
Contracts: C18 (in references); conventions in C1 and ADR-020
Client toolchain: RTK Query + codegen (docs/tech/adr/020-api-architecture.md §Client; frontend.md `@zivali/api`).
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-88.3-dir-client
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 @zivali/api/directory implements getResponsibleShelter, listShelters, getShelter and listMunicipalities per C18 as RTK Query endpoints (generated from apps/api/openapi.json by gen:api once merged into the spec, else api.injectEndpoints stubs per the contract, replaced later) with fixtures.
- [ ] #2 useResponsibleShelter(point or municipality) returns { status, shelter } on web and mobile and never exposes a phone number for unconfirmed municipalities.
<!-- AC:END -->
