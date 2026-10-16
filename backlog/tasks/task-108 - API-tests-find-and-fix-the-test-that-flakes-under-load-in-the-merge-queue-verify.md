---
id: TASK-108
title: >-
  API tests: find and fix the test that flakes under load in the merge-queue
  verify
status: To Do
assignee:
  - '@tech-lead'
created_date: '2026-10-16 01:14'
labels:
  - tech
  - 'est:XS'
milestone: m-1
dependencies: []
priority: medium
ordinal: 333000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
On 2026-10-16 the merge-queue verify (turbo run test on main, shared local postgres) failed api#test on its first run four times (batches 14, 16 recheck, 16b, 16c) and passed on the re-run each time; web#test once. Alone, the API suite passes (945/945). The machine runs 10+ agents, and other processes (QA dev servers) may use the same postgres DB. merge.mjs keeps only the summary on a flaky pass, so the failing test names are unknown.

## Packet

Review: tech-lead code review (full mode)
Branch: agent/task-109-api-flake
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The flaky API test(s) are identified (run the API suite 5x under load, or with --sequence.shuffle, and log failures) and fixed: no timing assumptions, no shared-row collisions, no reliance on test order.
- [ ] #2 If the cause is other processes writing to the shared postgres DB, the API tests use a dedicated test database on main as well (documented in apps/api/test/README), without breaking CI.
<!-- AC:END -->
