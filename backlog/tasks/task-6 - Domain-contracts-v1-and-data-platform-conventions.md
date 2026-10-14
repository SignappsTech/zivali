---
id: TASK-6
title: Domain contracts v1 and data platform conventions
status: To Do
assignee:
  - '@tech-lead'
created_date: '2026-10-14 21:01'
labels:
  - story
  - 'req:NFR-DEVX'
milestone: m-0
dependencies:
  - TASK-3
priority: high
ordinal: 6000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Feature stories must build in parallel against agreed contracts (schemas, types, validation, RLS pattern, seed data) instead of waiting for each other's implementations.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given the domain, when contracts are published, then packages/types and packages/validation define profiles, pets, photos, reports (LOST, FOUND, SIGHTED with status lifecycle), matches, conversations, messages, notifications, abuse reports, organisations and members, intake batches, payments, entitlements and ads, with PostGIS and pgvector enabled.
- [ ] #2 Given a new table, when created, then it follows the RLS-by-default pattern with documented policy templates and a test fails if a table has no RLS.
- [ ] #3 Given the public report read model, when read, then it exposes only fuzzed location and never owner contact or chip number.
- [ ] #4 Given local development, when seeding, then realistic Slovenian fixtures exist (lost, found and sighted reports with photos and chips, organisations, ads) to build against.
- [ ] #5 Given privacy, when a data store is added, then it is listed in a data inventory register used later for export and delete.
<!-- AC:END -->

## Packet

Unblocks on: packages/types, packages/validation and supabase/migrations exist (TASK-3); contract slice docs can start immediately
