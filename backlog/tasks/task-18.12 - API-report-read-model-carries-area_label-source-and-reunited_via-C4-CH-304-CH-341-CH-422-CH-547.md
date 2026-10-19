---
id: TASK-18.12
title: >-
  API: report read model carries area_label, source and reunited_via (C4;
  CH-304, CH-341, CH-422, CH-547)
status: To Do
assignee:
  - '@backend-dev'
created_date: '2026-10-19 21:26'
labels:
  - be
  - 'est:M'
  - web
dependencies: []
references:
  - docs/tech/backend.md
  - docs/tech/contracts/C4-reports-and-pets.md§Public read model
  - docs/tech/contracts/C6-location-geo-maps.md§Geocoder
parent_task_id: TASK-18
priority: medium
ordinal: 474200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Planned in C4 §Public read model and §Status machine (tech lead decisions 2026-10-19). Clients today reverse-geocode the public point per detail page and per homepage card (web server, single IP, 60/min limit) to name the area; the label becomes a stored column. `source` drives the public posted-by line (no person's display name is ever public). `reunited_via` tells P9 whether the counterpart reunited the report (owner-disagree note).

## Packet
Unblocks on: -
Branch: agent/task-18.12-report-area-label-source
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 One migration adds `reports.area_label text null` and `reports.reunited_via text null check (reunited_via in ('self','counterpart'))`; the report service sets `area_label` from the C6 reverse lookup of `public_point` whenever the public point is written (create, location PATCH, re-fuzz), null outside Slovenia; a one-off backfill (seeder or job, idempotent, batched) fills existing rows
- [ ] #2 `PublicReport`, the `GET /v1/reports` list items and `CachedReport` (`GET /v1/sync/reports`) carry `area_label: string | null` and `source`; no display name, email or organisation person is returned (mapper whitelist test)
- [ ] #3 `mark_reunited` sets `reunited_via` ('self' by a manager of the report, 'counterpart' when reunited through the counterpart report) and `reopen` clears it; `ReportOwnerView.reunited_via` is returned; route tests cover both paths
- [ ] #4 zod schemas (@zivali/validation), packages/types and openapi.json updated and `gen:api` run; data inventory lists the new columns
<!-- AC:END -->
