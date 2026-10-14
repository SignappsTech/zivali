---
id: TASK-26
title: 'Mark reunited, close and expire reports'
status: To Do
assignee:
  - '@design-lead'
created_date: '2026-10-14 21:02'
labels:
  - story
  - 'req:FR-012'
milestone: m-1
dependencies:
  - TASK-9
  - TASK-18
  - TASK-6
  - TASK-7
priority: high
ordinal: 26000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Closing the loop gives the north-star metric (reunite rate), clears stale listings and creates the moment where thank-you support and success stories are asked for.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given an owner (or an anonymous finder with the manage link), when they mark a report Reunited, then status becomes REUNITED, linked matches close, alerts and boosts stop, the counterpart is notified and reunited fires (consent only).
- [ ] #2 Given My reports, when opened, then the owner can edit, close with a reason (found elsewhere, gave up, other) or reopen within 7 days.
- [ ] #3 Given a LOST report, when it reaches 7, 14 and 30 days, then the owner gets an update reminder, and at 90 days without action it auto-closes with a one-tap extension.
- [ ] #4 Given FOUND or SIGHTED reports, when 30 days pass without update, then they expire the same way, and shelter intakes are exempt (FR-015).
- [ ] #5 Given the reunited screen, when shown, then it celebrates warmly, shows next steps and reserves slots for the thank-you tip (FR-021) and one labelled ad slot (FR-030).
- [ ] #6 Given statistics, when a report is reunited, then time to reunite and time to first match are recorded for KPIs.
<!-- AC:END -->

## Packet

Unblocks on: session (TASK-9); owner actions slot (TASK-18); status transition contract (TASK-6); track() (TASK-7)
