---
id: TASK-90.12
title: >-
  API: shelter page sends likely (unconfirmed) municipalities when none are
  confirmed (C18, for P3 v1.2 'Morda pristojno')
status: Done
assignee:
  - '@backend-dev'
created_date: '2026-10-19 20:59'
updated_date: '2026-10-19 22:15'
labels:
  - be
  - 'est:XS'
  - web
dependencies: []
references:
  - docs/tech/contracts/C18-shelter-directory.md
parent_task_id: TASK-90
priority: low
ordinal: 473200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Follow-up to TASK-90.11 (web, merged): the 'Morda pristojno' section only shows when the API sends likely_municipalities. Today it never does, so those shelters show no municipality section at all (no '0' either).

## Packet
Unblocks on: -
Branch: agent/task-90.12-likely-municipalities
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 GET shelter-by-slug (C18) adds optional likely_municipalities: {slug,name}[], filled only when municipalities (confirmed) is empty, from the likely/unconfirmed assignments
- [ ] #2 C18 doc and the shared type in packages/api updated; a route test covers confirmed, likely-only and none
<!-- AC:END -->
