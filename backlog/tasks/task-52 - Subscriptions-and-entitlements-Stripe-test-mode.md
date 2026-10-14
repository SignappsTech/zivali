---
id: TASK-52
title: Subscriptions and entitlements (Stripe test mode)
status: To Do
assignee:
  - '@tech-lead'
created_date: '2026-10-14 21:04'
updated_date: '2026-10-14 22:02'
labels:
  - story
  - 'req:FR-020'
milestone: m-3
dependencies:
  - TASK-32
  - TASK-9
priority: high
ordinal: 52000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Premium and Podpornik are recurring; one subscription and entitlement layer for individual users lets them be built in parallel. Organisations (shelters, vets, municipalities) never have a plan or entitlement: everything for them is free.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given a plan (price id in config), when a user subscribes through Stripe Checkout in test mode, then a subscription and entitlement row are created from the webhook and read through hasEntitlement(user, feature).
- [ ] #2 Given cancel, renewal failure or refund, when the webhook arrives, then entitlements end at period end (or at once on refund) and the user is emailed.
- [ ] #3 Given Manage billing, when opened, then the user reaches the Stripe customer portal (test) to cancel, change card and see invoices.
- [ ] #4 Given local development, when the mock provider runs, then all lifecycle events are simulated from fixtures.
- [ ] #5 Given a missing or expired entitlement, when a premium feature is called, then the server returns a clear upgrade-needed error that never affects the core loop.
- [ ] #6 Given mobile, when a user wants to subscribe, then the app hands off to web and the IAP risk is documented.
- [ ] #7 Given an organisation member acting for a shelter, vet or municipality, when they use any organisation feature, then no entitlement is checked and no upgrade prompt is shown (an architecture test asserts organisation routes never call hasEntitlement).
<!-- AC:END -->

## Packet

Unblocks on: createPayment contract, webhook handler and ledger (TASK-32); session (TASK-9)
