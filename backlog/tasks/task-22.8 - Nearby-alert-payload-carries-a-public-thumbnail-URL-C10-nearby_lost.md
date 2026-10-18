---
id: TASK-22.8
title: Nearby-alert payload carries a public thumbnail URL (C10 nearby_lost)
status: To Do
assignee:
  - '@backend-dev'
created_date: '2026-10-18 21:20'
labels:
  - be
  - 'est:S'
milestone: m-1
dependencies:
  - TASK-22.3
references:
  - docs/tech/contracts/C10-notifications-alerts.md
parent_task_id: TASK-22
priority: low
ordinal: 374200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Needed before nearby rows can show a photo (CH-285); contract change in C10 with the tech lead.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given a nearby_lost notification, when it is stored and listed, then the payload includes a public thumbnail URL of the report photo (no private path)
- [ ] #2 Given a report without a photo, when the notification is created, then the thumbnail field is null and the contract is documented in C10
<!-- AC:END -->

## Packet

Unblocks on: Notification delivery merged (TASK-22.3, done); C10 contract updated with the thumbnail field
Review: local
