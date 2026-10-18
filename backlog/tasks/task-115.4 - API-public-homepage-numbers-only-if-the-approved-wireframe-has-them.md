---
id: TASK-115.4
title: 'API: public homepage numbers (only if the approved wireframe has them)'
status: In Progress
assignee:
  - '@backend-dev'
created_date: '2026-10-16 14:00'
updated_date: '2026-10-18 19:48'
labels:
  - be
  - 'est:S'
dependencies:
  - TASK-115.1
parent_task_id: TASK-115
priority: medium
ordinal: 361400
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Only if the approved wireframe (TASK-115.1) shows live numbers (e.g. open reports, reunited this month): a cached public endpoint with those counts (no personal data; rounded or thresholded so small numbers identify no one). Close as not needed otherwise. The latest reports use the existing public GET /v1/reports.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Endpoint per the wireframe, cached, in the OpenAPI document, with route tests; or closed as not needed
<!-- AC:END -->

## Packet

Branch: agent/TASK-115.4-public-stats
