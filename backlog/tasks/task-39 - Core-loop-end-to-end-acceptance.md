---
id: TASK-39
title: Core loop end-to-end acceptance
status: To Do
assignee:
  - '@tech-lead'
created_date: '2026-10-14 21:03'
labels:
  - story
  - 'req:FR-005'
  - 'req:FR-006'
  - 'req:FR-008'
  - 'req:FR-009'
  - 'req:FR-012'
  - 'req:FR-038'
milestone: m-1
dependencies:
  - TASK-29
  - TASK-30
  - TASK-19
  - TASK-20
  - TASK-21
  - TASK-22
  - TASK-26
  - TASK-31
  - TASK-17
  - TASK-7
priority: high
ordinal: 39000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Stories are built in parallel against contracts; this is the integration gate that proves the whole loop works together before M2 closes.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given the local stack, when the e2e suite runs on web in SL and EN, then lost report, found report without account, match suggested, owner confirms, chat and mark reunited pass end to end.
- [ ] #2 Given the same chip number on both sides, when the reports are created, then a chip-match notification is received in the test inbox within 2 minutes.
- [ ] #3 Given consent denied, when the journey runs, then no analytics request is sent, and given consent granted, then the taxonomy events fire with region and species and no personal data.
- [ ] #4 Given a mobile dev build, when the smoke flow runs, then the found-report and match-confirm screens complete.
- [ ] #5 Given the suite is green in CI, when M2 closes, then a short report lists any known gaps.
<!-- AC:END -->

## Packet

Unblocks on: all feature stories merged to main; this story only adds the cross-story e2e suite and reports gaps
