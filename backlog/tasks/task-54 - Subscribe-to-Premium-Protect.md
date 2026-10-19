---
id: TASK-54
title: Subscribe to Premium Protect
status: To Do
assignee:
  - '@design-lead'
created_date: '2026-10-14 21:04'
updated_date: '2026-10-19 14:32'
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
Premium sells convenience, AI extras and insight to owners at EUR 29.99 per year (shown first, best value) or EUR 3.99 per month (test prices, owner 2026-10-19); the plan page must be honest about what stays free.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given the plan page, when opened, then what stays free (reporting, matching incl. basic and photo AI, alerts in the default radius, chat, standard poster, sharing, the public map with every sighting, up to 2 pet profiles) is listed before what Premium adds (unlimited pets, AI extras incl. the sightings heatmap, report statistics, chat translation, one-tap lost mode, 1 free Boost per year, ad-free).
- [ ] #2 Given the plan page, when opened, then the yearly plan (EUR 29.99, EUR 2.50 per month, 37 % less than 12 monthly payments) is shown first and marked best value, the monthly plan (EUR 3.99) has its own equally clear button, no plan is pre-selected and no struck-through old price is shown.
- [ ] #3 Given a user, when they subscribe to either plan, then Stripe Checkout (test) completes, an active state with plan and renewal date is shown, premium_subscribe fires with the plan (consent only) and the plan can be switched, managed or cancelled from settings.
- [ ] #4 Given a yearly subscription, when renewal is 7 days away, then a reminder email in the user's language states the date, the amount and how to cancel.
- [ ] #5 Given the period ends, when the subscription lapses, then Premium features lock gracefully and data is kept.
- [ ] #6 Given SL and EN, when displayed, then there are no dark patterns (cancel as easy as subscribe, prices with VAT, renewal period stated at each button).
- [ ] #7 Given mobile, when the user opens Premium, then the plan page explains that checkout happens on the web in this phase.
- [ ] #8 Given a shelter or municipality member, when they use the product, then no plan page entry or upgrade prompt appears.
<!-- AC:END -->

## Packet

Unblocks on: hasEntitlement contract and subscription lifecycle (TASK-52)

Wireframe gate: TASK-54.1 (person-approved wireframe) before any plan page mockup or implementation task. Prices: Stripe test prices in the sandbox account and config keys (CHANGE to the tech lead, C13); plan page copy (CHANGE to the content strategist).
