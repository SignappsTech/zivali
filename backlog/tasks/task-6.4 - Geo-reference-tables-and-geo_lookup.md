---
id: TASK-6.4
title: Geo reference tables and geo_lookup()
status: To Do
assignee:
  - '@backend-dev'
created_date: '2026-10-14 22:12'
labels:
  - be
  - 'est:S'
milestone: m-0
dependencies:
  - TASK-3.2
  - TASK-6.1
references:
  - docs/tech/backend.md
  - docs/tech/contracts/C6-location-geo-maps.md
  - docs/tech/contracts/C1-platform-conventions.md
parent_task_id: TASK-6
priority: high
ordinal: 124000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Reports, ads and stats derive municipality and region from a point inside Postgres (ADR-006).

## Packet

Unblocks on: Local Supabase stack, Edge Function base and mock adapters merged (TASK-3.2); GURS municipalities and statistical regions: data, licence, generator merged (TASK-6.1)
Contracts: C6, C1 (in references); conventions in C1
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-6.4-geo
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 regions and municipalities tables (GiST indexes) are loaded by a seed file generated from the GURS data; id, slug and names are publicly readable.
- [ ] #2 geo_lookup(lat, lng) returns municipality and region ids and slugs plus in_slovenia as in C6; pgTAP covers inside, near-border and outside-Slovenia points.
- [ ] #3 geo_lookup uses the spatial index and runs in under 5 ms per call on the local stack (EXPLAIN noted in the test file).
<!-- AC:END -->
