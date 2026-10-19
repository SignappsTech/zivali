---
id: TASK-36.12
title: Mobile ad slots target by region slug (C14 Serving; CH-381)
status: To Do
assignee:
  - '@frontend-dev'
created_date: '2026-10-19 21:41'
labels:
  - fe
  - 'est:XS'
  - mobile
  - no-design
dependencies:
  - TASK-36.10
references:
  - docs/tech/frontend.md
  - docs/tech/contracts/C14-ads-partners.md§Serving
parent_task_id: TASK-36
priority: low
ordinal: 509200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Mobile detail and reunited slots target by species and locale only today.

## Packet
Unblocks on: TASK-36.10 merged
Branch: agent/task-36.12-mobile-ad-region-slug
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Mobile AdSlot sends the report's `region` and `municipality` slugs on the slot request and the impression; jest-expo tests
<!-- AC:END -->
