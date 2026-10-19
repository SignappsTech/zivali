---
id: TASK-89.5
title: >-
  API: municipality assignment history (C18 GET
  /v1/admin/municipality-shelters/:municipality/changes; CH-251)
status: To Do
assignee:
  - '@backend-dev'
created_date: '2026-10-19 21:31'
labels:
  - be
  - 'est:XS'
  - web
dependencies: []
references:
  - docs/tech/backend.md
  - docs/tech/contracts/C18-shelter-directory.md§Admin
parent_task_id: TASK-89
priority: medium
ordinal: 481200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Decision CH-251: P19 shows history in the municipality drawer too; directory_changes already keeps those rows, only the route is missing (the web calls it and gets 404).

## Packet
Unblocks on: -
Branch: agent/task-89.5-municipality-history
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The route returns the municipality's directory_changes rows newest first, item shape as the shelter history (`version, data, source, actor_id, audit_note, created_at`); admin + aal2; unknown municipality → NOT_FOUND; route test; openapi.json and `gen:api`
<!-- AC:END -->
