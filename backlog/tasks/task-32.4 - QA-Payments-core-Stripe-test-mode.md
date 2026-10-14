---
id: TASK-32.4
title: 'QA: Payments core (Stripe test mode)'
status: To Do
assignee:
  - '@qa'
created_date: '2026-10-14 22:15'
updated_date: '2026-10-14 22:17'
labels:
  - qa
  - 'est:XS'
milestone: m-1
dependencies:
  - TASK-32.1
  - TASK-32.2
  - TASK-32.3
references:
  - docs/tech/frontend.md
  - docs/design/pages/P15-support-moments.md
parent_task_id: TASK-32
priority: medium
ordinal: 250000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Verify story TASK-32 (Payments core (Stripe test mode)) on main once all its tasks are merged: acceptance criteria below, quality gates, keyboard and screen-reader spot checks, and mobile and desktop checks for the UI. File bug tasks for failures and set qa:pass or qa:fail.

## Packet

Unblocks on: all tasks of TASK-32 merged to main (TASK-32.1, TASK-32.2, TASK-32.3); leads add any later TASK-32 task to this task's dependencies.
Review: n/a (QA)
Branch: - (verify on main)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given a signed-in user, when they start a one-off payment (amount, purpose), then a Stripe Checkout session in test mode is created, the user returns to the app and a webhook confirms the result into a payments ledger.
- [ ] #2 Given no Stripe keys in local development or CI, when payments run, then a mock provider simulates success, failure and cancel, and live mode cannot be enabled by configuration in this phase (guard plus test).
- [ ] #3 Given a successful payment, when recorded, then a confirmation email in the user language is sent and the payment appears in My payments.
- [ ] #4 Given mobile, when a payment starts, then it opens web checkout in an in-app browser (no native purchase UI in this phase) and the IAP risk is documented.
- [ ] #5 Given other stories, when they integrate, then createPayment(purpose, amount) and a payment-succeeded event are documented as the contract.
- [ ] #6 Given user-chosen amounts (custom tips and contributions), when validated, then the minimum card amount is EUR 2.00; amounts are integer cents in EUR; fixed prices come from config (Boost EUR 4.99, Premium EUR 2.99 per month or EUR 24.99 per year, Vet Partner EUR 39 per month); and the ledger is idempotent against webhook retries.
- [ ] #7 Story gates pass on main: `pnpm verify`, plus `pnpm quality` for the pages this story touches; results recorded in the QA notes.
<!-- AC:END -->
