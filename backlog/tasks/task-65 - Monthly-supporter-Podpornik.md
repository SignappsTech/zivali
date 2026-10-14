---
id: TASK-65
title: Monthly supporter Podpornik
status: To Do
assignee:
  - '@design-lead'
created_date: '2026-10-14 21:05'
labels:
  - story
  - 'req:FR-022'
milestone: m-3
dependencies:
  - TASK-52
  - TASK-18
  - TASK-7
priority: medium
ordinal: 65000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Many people want to help without needing features; a small monthly support with a badge funds the service.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given a signed-in user, when they choose Podpornik (EUR 2 or 3 per month, test mode), then Checkout (test) completes and an active supporter state with a thank-you is shown.
- [ ] #2 Given a supporter, when their profile or listings are shown, then a small badge appears (opt-out toggle) and no feature or ranking advantage is granted.
- [ ] #3 Given a cancellation, when the period ends, then the badge disappears and the user is thanked.
- [ ] #4 Given a completed subscription, when recorded, then supporter_subscribe fires (consent only).
- [ ] #5 Given a user who is not a supporter, when using the product, then nothing is degraded.
<!-- AC:END -->

## Packet

Unblocks on: subscription and entitlement contract (TASK-52); badge slot on listings (TASK-18); track() (TASK-7)
