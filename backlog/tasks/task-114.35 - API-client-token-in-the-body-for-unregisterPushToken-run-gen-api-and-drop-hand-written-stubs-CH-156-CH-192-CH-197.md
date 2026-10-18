---
id: TASK-114.35
title: >-
  API client: token in the body for unregisterPushToken, run gen:api and drop
  hand-written stubs (CH-156, CH-192, CH-197)
status: To Do
assignee:
  - '@frontend-dev'
created_date: '2026-10-18 22:07'
labels:
  - fe
  - 'est:S'
  - no-design
dependencies: []
references:
  - docs/tech/contracts/C10-notifications-alerts.md
  - docs/tech/frontend.md
parent_task_id: TASK-114
priority: medium
ordinal: 397200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
packages/api: (1) notifications.ts unregisterPushToken still calls DELETE /v1/push-tokens/:token (token in the path); C10 per CH-76 puts the token in the body. Fix the client and its test (from TASK-12.3). (2) openapi.json now has createPhoto, completePhoto, getPhoto, deletePhoto, createReport, updateReport and listMyReports: run gen:api and drop the hand-written getPhoto/deletePhoto stubs in photos.ts and the hand-typed report stubs in reports.ts (same operationIds, so hooks keep their names).

## Packet

Unblocks on: nothing open (TASK-12.3, TASK-14.1, TASK-29.2 merged).
Review: tech-lead code review; run pnpm verify before reporting done.
Branch: agent/task-114.35-api-client-regen
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 unregisterPushToken sends the token in the request body per C10 and its test asserts the request.
- [ ] #2 pnpm gen:api output committed; the stubs for getPhoto, deletePhoto, createReport, updateReport and listMyReports are gone, hook names unchanged, web and mobile typecheck and tests pass.
<!-- AC:END -->
