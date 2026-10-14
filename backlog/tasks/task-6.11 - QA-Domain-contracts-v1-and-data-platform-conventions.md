---
id: TASK-6.11
title: 'QA: Domain contracts v1 and data platform conventions'
status: To Do
assignee:
  - '@qa'
created_date: '2026-10-14 22:15'
updated_date: '2026-10-14 23:38'
labels:
  - qa
  - 'est:XS'
milestone: m-0
dependencies:
  - TASK-6.1
  - TASK-6.2
  - TASK-6.3
  - TASK-6.4
  - TASK-6.5
  - TASK-6.6
  - TASK-6.7
  - TASK-6.8
  - TASK-6.9
  - TASK-6.10
  - TASK-6.12
references:
  - docs/tech/frontend.md
parent_task_id: TASK-6
priority: high
ordinal: 223000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Verify story TASK-6 (Domain contracts v1 and data platform conventions) on main once all its tasks are merged: acceptance criteria below, quality gates, keyboard and screen-reader spot checks. File bug tasks for failures and set qa:pass or qa:fail.

## Packet

Unblocks on: GURS municipalities and statistical regions: data, licence, generator merged (TASK-6.1); DB foundation and lockdown: schema app, extensions, deny-all RLS, security tests, platform models, fixture users merged (TASK-6.2); Worker and jobs: pg-boss, queue registry with stubs, schedules, keep-alive, drain merged (TASK-6.3); Geo reference models, GURS seeder and TypedSQL geo lookup merged (TASK-6.4); Domain wire types and DTOs, zod request schemas, chip normalisation and breed codes merged (TASK-6.5); Reports, pets and photos models, deterministic fuzz, public report endpoint, seed merged (TASK-6.6); Matching, chat, notification and alert models with seed merged (TASK-6.7); Abuse, payments, ads, leads and organisations models with seed merged (TASK-6.8); REST clients in @zivali/api: auth, me, pets, reports, photos, geocode, matches merged (TASK-6.9); REST and Realtime clients in @zivali/api: chat, notifications, alerts, abuse, payments, ads, partners merged (TASK-6.10); API auth and platform middleware: JWKS verification, guards, rate limits, idempotency, ctx, audit, public config merged (TASK-6.12)
Review: n/a (QA)
Branch: - (verify on main)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given the domain, when contracts are published, then packages/types and packages/validation define profiles, pets, photos, reports (LOST, FOUND, SIGHTED with status lifecycle), matches, conversations, messages, notifications, abuse reports, organisations and members, intake batches, payments, entitlements and ads, with PostGIS and pgvector enabled.
- [ ] #2 Given a new table, when created, then it follows the RLS-by-default pattern with documented policy templates and a test fails if a table has no RLS.
- [ ] #3 Given the public report read model, when read, then it exposes only fuzzed location and never owner contact or chip number.
- [ ] #4 Given local development, when seeding, then realistic Slovenian fixtures exist (lost, found and sighted reports with photos and chips, organisations, ads) to build against.
- [ ] #5 Given privacy, when a data store is added, then it is listed in a data inventory register used later for export and delete.
- [ ] #6 Story gates pass on main: `pnpm verify`, plus `pnpm quality` for the pages this story touches; results recorded in the QA notes.
<!-- AC:END -->
