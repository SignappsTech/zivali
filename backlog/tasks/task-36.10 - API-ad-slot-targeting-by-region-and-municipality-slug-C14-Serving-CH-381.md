---
id: TASK-36.10
title: 'API: ad slot targeting by region and municipality slug (C14 Serving; CH-381)'
status: To Do
assignee:
  - '@backend-dev'
created_date: '2026-10-19 21:33'
labels:
  - be
  - 'est:XS'
  - web
dependencies: []
references:
  - docs/tech/backend.md
  - docs/tech/contracts/C14-ads-partners.md§Serving
parent_task_id: TASK-36
priority: medium
ordinal: 487200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Decision CH-381: reports carry region and municipality slugs (C4), the slot endpoint takes ids; the web maps slugs with a static index and mobile cannot target at all.

## Packet
Unblocks on: -
Branch: agent/task-36.10-ad-slot-region-slug
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 `GET /v1/ads/slot/:slot` and `POST /v1/ads/:id/impressions` also accept `region` and `municipality` (C6 slugs); ids win when both are sent; an unknown slug means no targeting context (not an error); the click URL keeps `r=<region_id>`; tests; openapi.json and `gen:api`
<!-- AC:END -->
