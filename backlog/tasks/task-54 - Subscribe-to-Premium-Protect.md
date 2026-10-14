---
id: TASK-54
title: Subscribe to Premium Protect
status: To Do
assignee:
  - '@design-lead'
created_date: '2026-10-14 21:04'
updated_date: '2026-10-14 22:11'
labels:
  - story
  - 'req:FR-026'
milestone: m-3
dependencies:
  - TASK-52
priority: medium
ordinal: 54000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Premium sells peace of mind to owners who want more pets, wider alerts and proactive protection; the plan page and flow must be honest about what stays free.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given a user, when they subscribe, then Stripe Checkout (test) completes, an active state is shown and billing can be managed or cancelled from settings.
- [ ] #2 Given the period ends, when the subscription lapses, then Premium features lock gracefully and data is kept.
- [ ] #3 Given SL and EN, when displayed, then there are no dark patterns (cancel as easy as subscribe, price shown with VAT).
- [ ] #4 Given mobile, when the user opens Premium, then the plan page explains that checkout happens on the web in this phase.
- [ ] #5 Given the plan page, when opened, then it lists what is free forever (reporting, matching, chat, poster) and what Premium adds, with test prices of EUR 1.99 per month or EUR 19 per year.
<!-- AC:END -->

## Packet

Unblocks on: hasEntitlement contract and subscription lifecycle (TASK-52)
