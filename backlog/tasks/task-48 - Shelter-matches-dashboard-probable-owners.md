---
id: TASK-48
title: 'Shelter matches dashboard: probable owners'
status: To Do
assignee:
  - '@design-lead'
created_date: '2026-10-14 21:04'
updated_date: '2026-10-14 23:08'
labels:
  - story
  - 'req:FR-015'
milestone: m-2
dependencies:
  - TASK-45
  - TASK-19
  - TASK-44
priority: high
ordinal: 48000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The shelter value proposition is that we find the owner for them; the dashboard shows probable owners per animal and lets staff act without seeing personal data.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given an organisation animal, when matches exist against open lost reports, then the animal row shows top matches with score, reasons and photos and new matches are flagged.
- [ ] #2 Given a match, when staff taps Contact owner, then a chat opens, the owner is notified and staff see no personal data beyond what the owner shares.
- [ ] #3 Given a confirmed match, when staff marks Returned to owner, then both sides close as REUNITED and are counted in KPIs.
- [ ] #4 Given a new lost report, when published, then existing organisation animals are matched automatically and the shelter is notified (daily digest optional).
- [ ] #5 Given a bad suggestion, when staff reject it, then it is hidden for that animal.
- [ ] #6 Given an animal approaching the end of its holding period, when a probable owner exists, then the shelter gets an urgent intake-match alert and the animal is flagged on the dashboard.
<!-- AC:END -->

## Packet

Unblocks on: portal layout (TASK-45); matches-by-organisation query contract (TASK-19); organisation guard (TASK-44)
