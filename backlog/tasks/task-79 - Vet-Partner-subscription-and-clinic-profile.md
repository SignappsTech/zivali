---
id: TASK-79
title: Vet Partner subscription and clinic profile
status: To Do
assignee:
  - '@design-lead'
created_date: '2026-10-14 22:10'
labels:
  - story
  - 'req:FR-028'
milestone: m-3
dependencies:
  - TASK-52
  - TASK-44
priority: medium
ordinal: 109000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Vets get everything that reunites animals for free; the paid Vet Partner plan sells visibility only, so clinics need a clear plan page, a B2B checkout with VAT invoices and a verified public clinic profile.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given a verified vet organisation owner, when they open Vet Partner, then they see what stays free (found-animal reports, chip lookup, matches, chat) and what the plan adds, at a test price of EUR 39 per month (B2B, configurable) with VAT shown.
- [ ] #2 Given the owner subscribes, when Stripe Billing Checkout (test) completes, then the organisation entitlement is active and a VAT invoice with company name, VAT ID and address is issued and downloadable from the Stripe portal.
- [ ] #3 Given an active plan, when the clinic edits its profile, then it can set opening hours, a 24h emergency badge, services and a booking or phone link (https and tel validated), shown on an indexable public clinic page in SL and EN with the verified badge.
- [ ] #4 Given the subscription lapses, when the period ends, then the profile stays as a basic verified entry without featured placement and the free reunite features are unaffected.
- [ ] #5 Given a shelter or municipality organisation, when it uses the portal, then no Vet Partner offer or upgrade prompt appears.
- [ ] #6 Given a vet without the plan, when they use chip lookup, found-animal reports, matches and chat, then they work without restriction.
<!-- AC:END -->

## Packet

Unblocks on: organisation-level entitlement in hasEntitlement (TASK-52); vet organisation type and verification (TASK-44)
