---
id: TASK-6.6
title: 'Reports, pets and photos schema, deterministic fuzz, public read model, seed'
status: To Do
assignee:
  - '@backend-dev'
created_date: '2026-10-14 22:12'
labels:
  - be
  - 'est:M'
milestone: m-0
dependencies:
  - TASK-6.2
  - TASK-6.4
references:
  - docs/tech/backend.md
  - docs/tech/contracts/C4-reports-and-pets.md
  - docs/tech/contracts/C5-photos-storage.md
  - docs/tech/contracts/C6-location-geo-maps.md
parent_task_id: TASK-6
priority: high
ordinal: 126000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Report detail, browse, matching and every flow build against seeded reports, pets and photos and the privacy-safe public read model.

## Packet

Unblocks on: Platform conventions: RLS helpers, config, rate limits, audit, roles, profiles merged (TASK-6.2); Geo reference tables and geo_lookup() merged (TASK-6.4)
Contracts: C4, C5, C6 (in references); conventions in C1
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-6.6-reports-schema
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 pets, reports, report_managers, report_contacts and photos tables with enums, constraints and indexes from C4 and C5; RLS limits base tables to owners or managers and staff; can_manage_report helper; RLS matrix tests.
- [ ] #2 Trigger set_public_location computes the deterministic fuzz (seeded HMAC, 0.8 × radius, 50 m grid, minimum radii from app_config) and municipality, region and in_slovenia; tests prove determinism, that the exact point lies inside the public circle, and the 500 m and 150 m minima.
- [ ] #3 Short codes (8-character base58, unique) are generated on insert.
- [ ] #4 get_public_report(short_code) returns the C4 PublicReport shape with no exact point, chip number, token or contact data, GONE for hidden or removed reports and for reports closed more than 30 days ago, NOT_FOUND otherwise; tests cover each case.
- [ ] #5 Seed: at least 30 Slovenian fixture reports (lost, found, sighted in Ljubljana, Maribor, Kranj and Koper; two chip pairs) and pets for fixture users; licensed fixture photos are uploaded by scripts/seed-photos.mjs with licences listed.
- [ ] #6 data-inventory.json entries are added and `pnpm gen:types` output is committed.
<!-- AC:END -->
