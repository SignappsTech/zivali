---
id: TASK-87.7
title: 'Mobile: paused alerts also stop proximity alerts'
status: To Do
assignee:
  - '@frontend-dev'
created_date: '2026-10-18 21:20'
updated_date: '2026-10-18 21:23'
labels:
  - fe
  - 'est:S'
  - no-design
milestone: m-2
dependencies:
  - TASK-87.1
  - TASK-23.3
references:
  - docs/tech/frontend.md
parent_task_id: TASK-87
priority: medium
ordinal: 376200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
R-010.6 and R-043.6: the geofence engine reads the subscription paused flag (CH-345).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given alerts paused in Profile → Alerts, when the user enters a cached lost-pet area, then no proximity notification appears; geofences are removed or ignored until alerts resume
- [ ] #2 Given the proximity settings and the alerts pause screen, when shown, then both state that pause covers proximity alerts (SL and EN)
<!-- AC:END -->

## Packet

Unblocks on: Geofence engine merged (TASK-87.1, done) and mobile nearby-alert settings merged (TASK-23.3, done); C10 subscription paused flag
Review: local
