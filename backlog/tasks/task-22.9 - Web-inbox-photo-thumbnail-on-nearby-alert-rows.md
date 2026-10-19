---
id: TASK-22.9
title: 'Web inbox: photo thumbnail on nearby-alert rows'
status: In Progress
assignee:
  - '@frontend-dev'
created_date: '2026-10-18 21:20'
updated_date: '2026-10-19 18:58'
labels:
  - fe
  - 'est:XS'
  - no-design
milestone: m-1
dependencies:
  - TASK-22.8
references:
  - docs/tech/frontend.md
parent_task_id: TASK-22
priority: low
ordinal: 375200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Follow-up to TASK-22.4 review (CH-285); check the row layout with the design lead.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given a nearby_lost row with a thumbnail URL, when the inbox renders, then the thumbnail shows with alt text and reserved size; without one the row renders as today
<!-- AC:END -->

## Packet

Unblocks on: Web notifications view merged (TASK-22.4, done) and the C10 thumbnail field in the nearby_lost payload (TASK-22.8)
Review: local

Branch: agent/task-22.9-inbox-thumb
