---
id: TASK-22.7
title: 'Web inbox: load more via next_cursor and quiet-hours form validation'
status: In Progress
assignee:
  - '@frontend-dev'
created_date: '2026-10-18 21:20'
updated_date: '2026-10-19 10:29'
labels:
  - fe
  - 'est:S'
  - no-design
milestone: m-1
dependencies: []
references:
  - docs/tech/frontend.md
parent_task_id: TASK-22
priority: low
ordinal: 373200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Follow-up to TASK-22.4 review (CH-285).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given more than 50 notifications, when the user taps load more, then the next page appends using next_cursor and the button hides at the end
- [ ] #2 Given the quiet-hours form, when start equals end, then the client rejects it with a localised message; after a server rejection the form resets to the saved values
<!-- AC:END -->

## Packet

Unblocks on: Web notifications view merged (TASK-22.4, done); C10 list endpoint next_cursor
Review: local
