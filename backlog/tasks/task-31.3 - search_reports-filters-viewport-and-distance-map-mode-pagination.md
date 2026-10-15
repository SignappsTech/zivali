---
id: TASK-31.3
title: 'Report search API: list and map endpoints through TypedSQL'
status: In Progress
assignee:
  - '@backend-dev'
created_date: '2026-10-14 22:13'
updated_date: '2026-10-15 20:19'
labels:
  - be
  - 'est:S'
milestone: m-1
dependencies:
  - TASK-6.6
references:
  - docs/tech/backend.md
  - docs/tech/contracts/C4-reports-and-pets.md
  - docs/tech/contracts/C6-location-geo-maps.md
parent_task_id: TASK-31
priority: high
ordinal: 176000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Map and list browse need one fast, privacy-safe search over public reports (FR-007).

## Packet

Unblocks on: Reports, pets and photos models, deterministic fuzz, public report endpoint, seed merged (TASK-6.6)
Contracts: C4, C6 (in references); conventions in C1
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-31.3-search-be
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 GET /v1/reports implements the C4 ReportSearch (bbox or near plus km, types, species, colours, sizes, date range, include_closed ≤ 30 days, sort, keyset pagination) and GET /v1/reports/map returns minimal map items, both through TypedSQL (prisma/sql/searchReports.sql).
- [ ] #2 Boosted reports sort first; closed, expired and non-visible reports are excluded by default; no exact location, chip or contact data is returned.
- [ ] #3 With 500 seeded reports in a viewport the endpoints answer in under 300 ms locally (EXPLAIN shows the GiST index).
<!-- AC:END -->

## Implementation Notes

AC #1 "TypedSQL" was met with `$queryRaw` + `Prisma.sql` (search.dao.ts) per the CH-117/154 precedent; review accepted.
