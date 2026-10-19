---
id: TASK-6.11
title: 'QA: Domain contracts v1 and data platform conventions'
status: Done
assignee:
  - '@qa'
created_date: '2026-10-14 22:15'
updated_date: '2026-10-19 14:59'
labels:
  - qa
  - 'est:XS'
  - 'qa:pass'
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
- [x] #1 Given the domain, when contracts are published, then packages/types and packages/validation define profiles, pets, photos, reports (LOST, FOUND, SIGHTED with status lifecycle), matches, conversations, messages, notifications, abuse reports, organisations and members, intake batches, payments, entitlements and ads, with PostGIS and pgvector enabled.
- [x] #2 Given a new table, when created, then it follows the RLS-by-default pattern with documented policy templates and a test fails if a table has no RLS.
- [x] #3 Given the public report read model, when read, then it exposes only fuzzed location and never owner contact or chip number.
- [x] #4 Given local development, when seeding, then realistic Slovenian fixtures exist (lost, found and sighted reports with photos and chips, organisations, ads) to build against.
- [x] #5 Given privacy, when a data store is added, then it is listed in a data inventory register used later for export and delete.
- [x] #6 Story gates pass on main: `pnpm verify`, plus `pnpm quality` for the pages this story touches; results recorded in the QA notes.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
QA 2026-10-19 on main ef6c492f (web-only pilot sweep: code, existing tests, CI evidence, live read-only). Result: qa:pass.
- AC1 pass: packages/types/src/domain has Profile (me.ts), Pet, photos, reports (REPORT_TYPES lost/found/sighted; REPORT_STATUSES open/matched/reunited/closed + REPORT_TRANSITION_ACTIONS), MatchSuggestion, ConversationSummary, Message, Notification, abuse reports, Organisation/OrganisationMember/IntakeBatch/Entitlement (forward types, no endpoint yet, so no zod schemas, per TASK-6.5 #1), Payment, Ad; packages/validation has per-domain zod schemas (me, pets, photos, reports, matches, chat, notifications, abuse, payments, ads); postgis + vector in schema extensions (init migration 20261015004447), asserted by test/security/schema-exposure.test.ts.
- AC2 pass: deny-all RLS template documented in C1 Lockdown and ADR-021 (only policy: realtime.messages, ADR-023); apps/api/test/security/schema-exposure.test.ts fails if any app/pgboss table lacks RLS, has a policy or a grant; static cross-check: 44/44 created tables enable RLS.
- AC3 pass: PublicReport whitelist (types reports.ts), lib/fuzz.ts + test/lib/fuzz.test.ts, test/routes/reports.routes.test.ts asserts no exact point, chip, token or contact; live api.najdimo.si GET /v1/reports (7 items: lost, found, sighted), /v1/reports/:code, /v1/reports/map: no key outside the whitelist, area = {lat,lng,radius_m 150/500}, no 15-digit chip, email or phone; 7 live najdimo.si/r/<code> pages scanned clean.
- AC4 pass: seeders 00-users, 01/02 GURS geo, 10-reports (30 reports lost/found/sighted across SI, 27 photos, chip pairs), 20-collab, 30-commerce (house + sponsor ads, verified shelter organisation); covered by apps/api/test/seeders/*.
- AC5 pass: apps/api/prisma/data-inventory.json (every model + R2 bucket: category, personal data, basis, retention, export, delete); test/security/data-inventory.test.ts fails on any unlisted model or column.
- AC6 pass: pnpm verify (incl. API and ADR-021 security tests) runs in the local merge gate before every merge to main (ci.yml header); main CI green 2026-10-19 (verify:static, web build, pnpm audit high, 298 web e2e). pnpm quality n/a: story touches no pages. Not rerun here per sweep rules.
- Keyboard/screen reader: n/a (no UI in this story). Mobile: no mobile-only AC.
<!-- SECTION:NOTES:END -->
