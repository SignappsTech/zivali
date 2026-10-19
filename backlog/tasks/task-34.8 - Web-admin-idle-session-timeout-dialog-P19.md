---
id: TASK-34.8
title: 'Web admin: idle session timeout dialog (P19)'
status: Done
assignee:
  - '@frontend-dev'
created_date: '2026-10-18 21:19'
updated_date: '2026-10-19 12:34'
labels:
  - fe
  - 'est:S'
  - no-design
milestone: m-1
dependencies:
  - TASK-34.3
references:
  - docs/tech/frontend.md
parent_task_id: TASK-34
priority: medium
ordinal: 371200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
TASK-34.3 did not build the P19 session timeout dialog (CH-223).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given an admin idle for the configured time, when the warning point is reached, then a dialog offers to stay signed in and counts down; on expiry the session ends and the admin returns to sign-in
- [ ] #2 Given the dialog, when the admin chooses stay signed in, then the session is refreshed and the timer resets; axe 0 violations, keyboard and screen-reader operable
<!-- AC:END -->

## Packet

Unblocks on: Web admin shell merged (TASK-34.3, done); P19 session-timeout spec
Review: local
Branch: agent/TASK-34.8-admin-idle-timeout
