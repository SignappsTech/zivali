---
id: TASK-53
title: Boost a lost listing
status: To Do
assignee:
  - '@design-lead'
created_date: '2026-10-14 21:04'
updated_date: '2026-10-14 22:11'
labels:
  - story
  - 'req:FR-025'
milestone: m-3
dependencies:
  - TASK-32
  - TASK-23
  - TASK-31
  - TASK-18
  - TASK-7
priority: high
ordinal: 53000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
In a panic owners pay for reach; a one-off boost extends alerts and visibility without paywalling the core loop.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given an active boost, when time passes, then nearby alerts reach a wider radius (up to 25 km, daily cap respected), the listing sorts first in lists, is highlighted on the map and a share kit with prefilled text is shown.
- [ ] #2 Given the boost expires or the pet is reunited, when it ends, then boost effects stop, the owner is told and unused days are refunded only by an admin.
- [ ] #3 Given a user who never pays, when using the product, then matching, chat, alerts in the default radius and the poster remain fully available.
- [ ] #4 Given a completed purchase, when recorded, then boost_purchase fires with an amount bucket, region and species (consent only).
- [ ] #5 Given a failed or cancelled checkout, when the user returns, then the report is unchanged and they can retry.
- [ ] #6 Given an open lost report, when the owner chooses Boost, then they pay what they want (minimum EUR 2, suggested EUR 5, no fixed price) for 7 days via Stripe Checkout (test) and boosted_until is set from the payment event.
<!-- AC:END -->

## Packet

Unblocks on: createPayment contract (TASK-32); alert fan-out radius parameter (TASK-23); boosted_until sort and highlight (TASK-31); detail owner actions (TASK-18); track() (TASK-7)
