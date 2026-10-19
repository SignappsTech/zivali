---
id: TASK-29.13
title: 'Lost report for a saved pet reuses that pet''s photos (C4/C5, API)'
status: Done
assignee:
  - '@backend-dev'
created_date: '2026-10-18 21:21'
updated_date: '2026-10-19 11:52'
labels:
  - be
  - 'est:S'
milestone: m-1
dependencies: []
references:
  - docs/tech/contracts/C4-reports-and-pets.md
  - docs/tech/contracts/C5-photos-storage.md
parent_task_id: TASK-29
priority: medium
ordinal: 377200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
R-005.6: owners reporting a saved pet lost must not re-add photos (CH-348).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given a lost report created with pet_id and no photo ids, when created, then the pet's photos are copied or referenced on the report and listed in the response
- [ ] #2 Given a pet without photos, when a lost report is created, then at least one photo is still required; contracts C4/C5 updated
<!-- AC:END -->

## Packet

Unblocks on: C4/C5 slice (pet photos, create_report) as merged; no other task
Review: local
Branch: agent/TASK-29.13-pet-photo-reuse
