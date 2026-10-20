---
id: TASK-119.10
title: >-
  Web analytics: checkout funnel (begin_checkout, purchase, supporter_subscribe,
  return errors)
status: To Do
assignee:
  - '@frontend-dev'
created_date: '2026-10-19 23:54'
updated_date: '2026-10-19 23:57'
labels:
  - fe
  - 'est:S'
  - no-design
  - web
milestone: m-1
dependencies:
  - TASK-119.2
references:
  - docs/tech/frontend.md
  - docs/tech/contracts/C12b-analytics-tracking-plan.md§6. Checkout
  - >-
    docs/tech/contracts/C12b-analytics-tracking-plan.md§4. Errors (where people
    get stuck)
  - docs/tech/contracts/C12-analytics-consent.md§Event registry
parent_task_id: TASK-119
priority: high
ordinal: 521200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Checkout funnel for the payments live today (tip, report contribution, support, Podpornik). Files owned: apps/web/components/payments/** (amount-ask.tsx, payment-return.tsx, support.tsx, answers.ts and tests). Boost (TASK-53) and Premium (TASK-54) checkouts reuse commerceParams and these events in their own build tasks (C12b §6). Client-side by decision (C12b §6, no Measurement Protocol). No new copy.

## Packet
Unblocks on: TASK-119.2 (registry: begin_checkout, purchase, commerceParams)
Branch: agent/TASK-119.10-analytics-checkout
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 flow_step checkout amount when an amount ask (P15) shows; begin_checkout { value, currency, purpose } (commerceParams) right before the redirect to Stripe, also on Retry; a refused start sends flow_error checkout amount (MIN_AMOUNT, SERVICE_UNAVAILABLE, VALIDATION, NETWORK)
- [ ] #2 Return page, once per payment (the settlePayment guard): flow_step checkout return; succeeded sends purchase { value, currency, purpose } plus donation (tip, report_contribution, support) or supporter_subscribe (Podpornik subscription); canceled, failed or timed out sends flow_error checkout return (canceled, payment_failed, timeout); a reload sends nothing again
- [ ] #3 No payment id, transaction_id or items are sent; component tests in payment-return.test.tsx and support.test.tsx assert the mock events per purpose and outcome, and nothing without consent; pnpm verify passes
<!-- AC:END -->
