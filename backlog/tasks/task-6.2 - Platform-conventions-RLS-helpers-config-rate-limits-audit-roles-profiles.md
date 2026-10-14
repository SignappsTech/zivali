---
id: TASK-6.2
title: >-
  DB foundation and lockdown: schema app, extensions, deny-all RLS, security
  tests, platform models, fixture users
status: To Do
assignee:
  - '@backend-dev'
created_date: '2026-10-14 22:12'
updated_date: '2026-10-14 23:35'
labels:
  - be
  - 'est:M'
milestone: m-0
dependencies:
  - TASK-3.7
references:
  - docs/tech/backend.md
  - docs/tech/contracts/C1-platform-conventions.md
  - docs/tech/adr/021-database-not-exposed.md
  - docs/tech/contracts/C3-auth-profiles-roles.md
parent_task_id: TASK-6
priority: high
ordinal: 122000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Supabase exposes the public schema to anyone with the anon key; app data must be unreachable except through the API (ADR-021), and every later model relies on the same platform tables and fixtures.

## Packet

Unblocks on: apps/api scaffold: Express 5 + Prisma 7 in klikni style with the domain layer merged (TASK-3.7)
Contracts: C1, C3 (in references); conventions in C1
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-6.2-platform
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The first Prisma migration creates schema app, enables postgis, vector and pgcrypto in schema extensions, revokes all on app and pgboss from anon, authenticated and public, and sets default privileges so new tables get no grants.
- [ ] #2 Models profiles (USER_ROLE enum), app_config, audit_log, rate_limits and idempotency_keys exist per C1 and C3 with RLS enabled and no policies.
- [ ] #3 Security tests (test/security) prove that every table in app and pgboss has RLS on and no policies, that anon and authenticated have no usage or table privileges there, and that PostgREST with the anon key exposes no app table (GET and POST).
- [ ] #4 prisma/data-inventory.json lists every model and R2 bucket; a test fails when a model is missing.
- [ ] #5 Seeder 00-users creates the fixture users in local Supabase Auth through the Admin API with profiles (roles user, shelter member, moderator, admin); local TOTP setup for mod and admin is documented.
<!-- AC:END -->
