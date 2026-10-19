---
id: TASK-37.9
title: >-
  Web admin ads: totals columns, detail by id, issue codes, municipalities from
  the API (C14, C6; CH-473, CH-474, CH-476, CH-477)
status: To Do
assignee:
  - '@frontend-dev'
created_date: '2026-10-19 21:38'
labels:
  - fe
  - 'est:S'
  - web
dependencies:
  - TASK-37.8
  - TASK-37.1
references:
  - docs/tech/frontend.md
  - docs/tech/contracts/C14-ads-partners.md§Admin
  - docs/design/pages/P20-admin-ads.md
parent_task_id: TASK-37
priority: medium
ordinal: 504200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Uses the ads admin API additions; removes the list paging on detail pages, the English message parsing and the static municipality list.

## Packet
Unblocks on: TASK-37.8 (ads admin totals, GET by id, issue codes, municipality ids) merged; design TASK-37.1 done
Branch: agent/task-37.9-web-admin-ads-additions
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The P20 list shows Impressions, Clicks and CTR from `totals`
- [ ] #2 Detail and edit pages load GET /v1/admin/ads/:id
- [ ] #3 BLOCKED_TERM and EXCLUSIVE_OVERLAP issues are read by code (the other ad's title from the issue)
- [ ] #4 The municipality picker reads ids from GET /v1/shelters/municipalities; components/admin/ads/municipalities.ts and its test go; component tests updated
<!-- AC:END -->
