---
id: TASK-32.11
title: >-
  Payments API: method, test flag, receipt and refund dates, and a payment
  detail route (CH-701..704, for the approved My payments design)
status: In Progress
assignee:
  - '@backend-dev'
created_date: '2026-10-20 15:28'
updated_date: '2026-10-20 15:30'
labels:
  - be
  - 'est:S'
dependencies:
  - TASK-32.10
references:
  - docs/design/wireframes/P15-my-payments.html
  - docs/tech/backend.md
parent_task_id: TASK-32
priority: high
ordinal: 545200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Owner approved the My payments list + detail wireframe 2026-10-20 (TASK-32.10, docs/design/wireframes/P15-my-payments.html v1). Implement the API side from CHANGE rows CH-701 (Payment.method: card brand + last 4, or wallet; never the full PAN), CH-702 (a per-payment and per-invoice test flag, since a pilot on APP_ENV=production can take test payments), CH-703 (receipt_sent_at and refunded_at), CH-704 (C15 detail route: GET the caller's own payment by id with those fields; 404 for someone else's). Payments stay in Stripe test mode (Najdimo sandbox via STRIPE_SECRET_KEY only); invoices stay mock until fiscal is cleared. Read the method from the Stripe payment intent / charge the webhook already handles; backfill existing test payments where cheap or leave null. Contract text goes through the tech-lead (the CHANGE rows exist).

## Packet
Branch: agent/TASK-32.11-payments-detail
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 GET /v1/me/payments returns method, test, receipt_sent_at, refunded_at per payment; GET /v1/me/payments/:id returns one payment of the caller (404 for another user's or an unknown id); API tests on a scratch DB
- [ ] #2 method never holds more than brand + last 4 (or wallet name); webhook test fills it from a Stripe test event fixture
- [ ] #3 No live Stripe keys or writes outside the Najdimo sandbox; migration is additive (nullable columns)
<!-- AC:END -->
