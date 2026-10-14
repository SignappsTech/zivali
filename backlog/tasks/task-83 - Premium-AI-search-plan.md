---
id: TASK-83
title: 'Premium AI: search plan'
status: To Do
assignee:
  - '@tech-lead'
created_date: '2026-10-14 22:13'
labels:
  - story
  - 'req:FR-026'
  - 'req:NFR-AI'
milestone: m-3
dependencies:
  - TASK-52
  - TASK-40
  - TASK-18
priority: low
ordinal: 174000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
A lost-pet owner in panic does not know where to search; Premium gives species and behaviour-based guidance for the first hours and days.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given a Premium user with an open lost report, when they open Search plan, then a localised plan is generated from species, age, temperament notes, time since loss and area type (where to search, when, what to bring, who to tell).
- [ ] #2 Given the plan, when displayed, then it is advice only, uses no exact location and links to poster, share and alerts.
- [ ] #3 Given a free user, when they open the screen, then a short generic checklist is shown and Premium adds the personalised plan.
- [ ] #4 Given AI caps or no key, when unavailable, then the generic checklist remains.
<!-- AC:END -->

## Packet

Unblocks on: hasEntitlement (TASK-52); AI service (TASK-40); report data on the detail model (TASK-18)
