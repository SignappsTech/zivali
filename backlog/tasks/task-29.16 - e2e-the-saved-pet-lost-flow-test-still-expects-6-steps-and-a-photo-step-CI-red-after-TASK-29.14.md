---
id: TASK-29.16
title: >-
  e2e: the saved-pet lost flow test still expects 6 steps and a photo step (CI
  red after TASK-29.14)
status: To Do
assignee:
  - '@frontend-dev'
created_date: '2026-10-19 19:13'
labels:
  - bug
  - 'est:XS'
  - web
dependencies: []
references:
  - apps/web/e2e/report-lost.spec.ts
parent_task_id: TASK-29
priority: high
ordinal: 443200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
CI run on 1f40b113 failed only on report-lost.spec.ts:351 (expected 'Step 1 of 6'): TASK-29.14 now skips the photo step for a saved pet that has photos. Test-only fix; the behaviour is approved.

## Packet
Unblocks on: -
Branch: agent/task-29.16-e2e-saved-pet
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 apps/web/e2e/report-lost.spec.ts 'EN: a saved pet goes straight to photos and where…' matches TASK-29.14: a saved pet with photos shows 'Step 1 of 5', skips the photo step and goes to the location step; the duplicate-open-search part still passes
- [ ] #2 The photo step for a saved pet stays covered: either the same test adds a photo through the review's 'Uredi' for photos, or a pet without photos keeps the 6-step path with the upload
<!-- AC:END -->
