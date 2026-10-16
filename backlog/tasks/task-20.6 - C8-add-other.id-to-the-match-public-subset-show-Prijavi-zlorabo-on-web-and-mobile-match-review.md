---
id: TASK-20.6
title: >-
  C8: add other.id to the match public subset; show 'Prijavi zlorabo' on web and
  mobile match review
status: Done
assignee: []
created_date: '2026-10-16 05:21'
labels:
  - be
  - fe
dependencies: []
parent_task_id: TASK-20
priority: medium
ordinal: 346000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
TASK-20.3's fix round put the P11 overflow 'Prijavi zlorabo' on the web match review, but C11 abuse reports need target_id (a uuid) and C8's `other` subset has only short_code, so a submit would fail validation. The entry is held back until this lands. Add `other.id` (the other report's uuid, already public on the report detail) to C8 and the API's match serializer, regenerate types, then mount ReportAbuseDialog (target report, other.id) on web (components/matches/match-review.tsx, the MoreMenu pattern) and mobile (parity gap noted in backlog/changes.md).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 GET matches returns other.id for each match (API test), types regenerated, C8 updated
- [ ] #2 Web and mobile match review show 'Prijavi zlorabo' for the other report and a submit succeeds against the mock API (vitest/jest)
<!-- AC:END -->

## Packet

Branch: agent/task-20.6-match-other-id
