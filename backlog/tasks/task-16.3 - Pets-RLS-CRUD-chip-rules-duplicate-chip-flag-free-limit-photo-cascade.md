---
id: TASK-16.3
title: >-
  Pets API: owner CRUD, chip rules incl. CRHŽ question, duplicate-chip flag,
  free limit
status: Done
assignee:
  - '@backend-dev'
created_date: '2026-10-14 22:13'
updated_date: '2026-10-15 21:28'
labels:
  - be
  - 'est:S'
milestone: m-1
dependencies:
  - TASK-6.6
  - TASK-6.8
  - TASK-14.1
  - TASK-6.12
references:
  - docs/tech/backend.md
  - docs/tech/contracts/C4-reports-and-pets.md
  - docs/tech/contracts/C11-abuse-reports.md
  - docs/tech/contracts/C1-platform-conventions.md
parent_task_id: TASK-16
priority: high
ordinal: 154000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Registered pets give matching a chip and photos; duplicates must reach moderators without exposing other owners (FR-002).

## Packet

Unblocks on: Reports, pets and photos models, deterministic fuzz, public report endpoint, seed merged (TASK-6.6); Abuse, payments, ads, leads and organisations models with seed merged (TASK-6.8); Photos: R2 presigned uploads, sharp processing, publishing and cleanup merged (TASK-14.1); API auth and platform middleware: JWKS verification, guards, rate limits, idempotency, ctx, audit, public config merged (TASK-6.12)
Contracts: C4, C11, C1 (in references); conventions in C1
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-16.3-pets-be
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 GET and POST /v1/pets, GET, PATCH and DELETE /v1/pets/:id and POST /v1/pets/:id/archive work for owners only (permission matrix), with chip normalisation (chip_status), chip_registered_crhz (yes, no, unknown), and ear_tip and lifestyle for cats.
- [x] #2 A chip already registered on another owner's pet creates a moderation_flags duplicate_chip entry without revealing the other owner to either user.
- [x] #3 Free accounts are limited to app_config pets.free_limit (default 2) active pets (CONFLICT with details.code PET_LIMIT); the limit never applies to lost reports.
- [x] #4 Deleting a pet removes its photos through the photo jobs; domain tests cover the limit and the duplicate flag.
<!-- AC:END -->
