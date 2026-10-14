---
id: TASK-32
title: Payments core (Stripe test mode)
status: To Do
assignee:
  - '@tech-lead'
created_date: '2026-10-14 21:03'
updated_date: '2026-10-14 22:12'
labels:
  - story
  - 'req:FR-020'
milestone: m-1
dependencies:
  - TASK-9
  - TASK-6
priority: medium
ordinal: 32000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Voluntary support, Boost, Premium and Vet Partner all need one safe way to take card payments; a mockable test-mode core first lets the support ask ship in the core-loop milestone.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given a signed-in user, when they start a one-off payment (amount, purpose), then a Stripe Checkout session in test mode is created, the user returns to the app and a webhook confirms the result into a payments ledger.
- [ ] #2 Given no Stripe keys in local development or CI, when payments run, then a mock provider simulates success, failure and cancel, and live mode cannot be enabled by configuration in this phase (guard plus test).
- [ ] #3 Given a successful payment, when recorded, then a confirmation email in the user language is sent and the payment appears in My payments.
- [ ] #4 Given mobile, when a payment starts, then it opens web checkout in an in-app browser (no native purchase UI in this phase) and the IAP risk is documented.
- [ ] #5 Given other stories, when they integrate, then createPayment(purpose, amount) and a payment-succeeded event are documented as the contract.
- [ ] #6 Given user-chosen amounts (custom tips and contributions), when validated, then the minimum card amount is EUR 2.00; amounts are integer cents in EUR; fixed prices come from config (Boost EUR 4.99, Premium EUR 2.99 per month or EUR 24.99 per year, Vet Partner EUR 39 per month); and the ledger is idempotent against webhook retries.
<!-- AC:END -->

## Packet

Unblocks on: session (TASK-9); payments ledger schema and provider interface (TASK-6)
