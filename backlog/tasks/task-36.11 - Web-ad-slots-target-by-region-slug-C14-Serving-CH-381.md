---
id: TASK-36.11
title: Web ad slots target by region slug (C14 Serving; CH-381)
status: To Do
assignee:
  - '@frontend-dev'
created_date: '2026-10-19 21:38'
labels:
  - fe
  - 'est:XS'
  - web
  - no-design
dependencies:
  - TASK-36.10
references:
  - docs/tech/frontend.md
  - docs/tech/contracts/C14-ads-partners.md§Serving
parent_task_id: TASK-36
priority: medium
ordinal: 502200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The web AdUnit maps the report's region slug to an id with a static index list; the API takes slugs after the API task.

## Packet
Unblocks on: TASK-36.10 (slot accepts region and municipality slugs) merged
Branch: agent/task-36.11-web-ad-region-slug
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 AdUnit sends `region` and `municipality` slugs from the report (slot request and impression) instead of the REGION_SLUGS index; the static list goes; tests
<!-- AC:END -->
