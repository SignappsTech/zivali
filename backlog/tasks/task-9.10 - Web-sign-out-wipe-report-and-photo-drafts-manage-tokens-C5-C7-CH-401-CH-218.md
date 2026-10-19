---
id: TASK-9.10
title: >-
  Web sign-out wipe: report and photo drafts, manage tokens (C5, C7; CH-401,
  CH-218)
status: To Do
assignee:
  - '@frontend-dev'
created_date: '2026-10-19 21:36'
labels:
  - fe
  - 'est:XS'
  - web
  - no-design
dependencies: []
references:
  - docs/tech/frontend.md
  - docs/tech/contracts/C5-photos-storage.md§Client
  - docs/tech/contracts/C7-anonymous-manage-link.md§Flow
  - docs/tech/contracts/C4-reports-and-pets.md§Drafts
parent_task_id: TASK-9
priority: medium
ordinal: 498200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Decision CH-401: on a shared browser the next account restored the previous account's prepared photos. Decision CH-218: manage tokens are covered by the sign-out wipe.

## Packet
Unblocks on: -
Branch: agent/task-9.10-web-signout-wipe
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Web sign-out deletes the idb-keyval `photos:*` and `draft:*` keys, localStorage `manage:*` and sessionStorage `manage_token`
- [ ] #2 Photo and report drafts store the owner's user id (null when written without a session); a form restores a draft only for that user or an ownerless one (adopted on sign-in) and deletes a draft of another user
- [ ] #3 Unit tests for the wipe and the owner check
<!-- AC:END -->
