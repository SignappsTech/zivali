---
id: TASK-16.3
title: 'Pets: RLS CRUD, chip rules, duplicate-chip flag, free limit, photo cascade'
status: To Do
assignee:
  - '@backend-dev'
created_date: '2026-10-14 22:13'
updated_date: '2026-10-14 22:17'
labels:
  - be
  - 'est:S'
milestone: m-1
dependencies:
  - TASK-6.6
  - TASK-6.8
  - TASK-14.1
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

Unblocks on: Reports, pets and photos schema, deterministic fuzz, public read model, seed merged (TASK-6.6); Abuse, payments, ads, leads and organisations schema with RLS and seed merged (TASK-6.8); Photo registration, server validation, publishing and cleanup merged (TASK-14.1)
Contracts: C4, C11, C1 (in references); conventions in C1
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-16.3-pets-be
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Owners create, edit, archive and delete their pets through PostgREST under RLS; chips are normalised on write with chip_status, and invalid chips are stored as null with status 'invalid'.
- [ ] #2 A chip already registered on another owner's pet creates a moderation_flags 'duplicate_chip' entry without revealing the other owner to either user.
- [ ] #3 Free accounts are limited to app_config 'pets.free_limit' (default 2) active pets with a clear error code (more needs Premium, M4); the limit never applies to lost reports.
- [ ] #4 Deleting a pet removes its photos from storage (through the purge job); pgTAP covers RLS, the limit and the duplicate flag.
<!-- AC:END -->
