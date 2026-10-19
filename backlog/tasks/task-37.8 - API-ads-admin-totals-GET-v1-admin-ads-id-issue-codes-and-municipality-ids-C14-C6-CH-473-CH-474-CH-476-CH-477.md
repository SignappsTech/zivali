---
id: TASK-37.8
title: >-
  API: ads admin totals, GET /v1/admin/ads/:id, issue codes and municipality ids
  (C14, C6; CH-473, CH-474, CH-476, CH-477)
status: To Do
assignee:
  - '@backend-dev'
created_date: '2026-10-19 21:33'
labels:
  - be
  - 'est:S'
  - web
dependencies: []
references:
  - docs/tech/backend.md
  - docs/tech/contracts/C14-ads-partners.md§Admin
  - docs/tech/contracts/C6-location-geo-maps.md§Geo reference
parent_task_id: TASK-37
priority: medium
ordinal: 489200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Planned in C14 §Admin and C6 §Geo reference: the web P20 list leaves out the counts, the detail pages page through the list, refusals are parsed from English messages and the editor ships a static municipality list.

## Packet
Unblocks on: -
Branch: agent/task-37.8-ads-admin-api-additions
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 `GET /v1/admin/ads` items carry all-time `totals: { impressions, clicks }` from one grouped query over ad_stats_daily
- [ ] #2 `GET /v1/admin/ads/:id` (admin, aal2) returns AdminAd; unknown or soft-deleted → NOT_FOUND
- [ ] #3 Blocklist refusals carry issue `code: 'BLOCKED_TERM'`; exclusive overlaps `{ path: 'exclusive', code: 'EXCLUSIVE_OVERLAP', ad: { id, title } }`
- [ ] #4 `GET /v1/shelters/municipalities` items carry `id` (GURS smallint); route tests; openapi.json and `gen:api`
<!-- AC:END -->
