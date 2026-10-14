---
id: TASK-53
title: Boost a lost listing
status: To Do
assignee:
  - '@design-lead'
created_date: '2026-10-14 21:04'
updated_date: '2026-10-14 22:13'
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
In a panic owners pay for reach; a fixed-price boost extends alerts and visibility on top of an already effective free radius, without paywalling the core loop.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given an open lost report, when the owner chooses Boost (EUR 4.99 fixed, 7 days, from config), then Stripe Checkout (test) completes and boosted_until is set from the payment event.
- [ ] #2 Given an active boost, when time passes, then nearby alerts reach a wider radius (up to 25 km, daily cap respected), the listing sorts first in lists, is highlighted at the top of the map and an auto-generated social post (template text and image, shareable in one tap) is offered.
- [ ] #3 Given the boost expires or the pet is reunited, when it ends, then boost effects stop, the owner is told and unused days are refunded only by an admin.
- [ ] #4 Given a user who never pays, when using the product, then matching, chat, alerts in the default radius and the poster remain fully available.
- [ ] #5 Given a Premium user with a free yearly Boost available, when they boost, then the free Boost is used instead of a payment.
- [ ] #6 Given a completed purchase, when recorded, then boost_purchase fires with value and EUR currency, region and species (consent only).
- [ ] #7 Given a failed or cancelled checkout, when the user returns, then the report is unchanged and they can retry.
<!-- AC:END -->

## Packet

Unblocks on: createPayment contract (TASK-32); alert fan-out radius parameter (TASK-23); boosted_until sort and highlight (TASK-31); detail owner actions (TASK-18); track() (TASK-7)
