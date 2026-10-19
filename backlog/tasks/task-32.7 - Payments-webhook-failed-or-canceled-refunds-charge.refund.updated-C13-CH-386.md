---
id: TASK-32.7
title: >-
  Payments webhook: failed or canceled refunds (charge.refund.updated; C13,
  CH-386)
status: To Do
assignee:
  - '@backend-dev'
created_date: '2026-10-19 21:31'
labels:
  - be
  - 'est:XS'
  - web
dependencies: []
references:
  - docs/tech/backend.md
  - docs/tech/contracts/C13-payments.md§Fiscal invoices
parent_task_id: TASK-32
priority: medium
ordinal: 483200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Decision CH-386: a refund that fails or is canceled after its credit note must not leave the payment shown as refunded. The API corrects the ledger and alerts ops; the correcting fiscal document stays a manual, runbook step (rare event, refunds are issued from the Stripe Dashboard).

## Packet
Unblocks on: -
Branch: agent/task-32.7-refund-failed-webhook
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The webhook handles `charge.refund.updated` with status failed or canceled: `payments.refunded_cents` is set to the charge's current `amount_refunded` and a payment below its amount returns from `refunded` to `succeeded`; duplicate events are no-ops (payment_events); no credit note is changed automatically
- [ ] #2 It logs `payments.refund_failed` at error level (payment id, refund id; no card or person data) so Sentry alerts; deploy/README.md §10 step 8 gains the manual correcting-document step and the webhook endpoint's event list includes charge.refund.updated
- [ ] #3 Tests with the mock provider (failed after a partial and after a full refund)
<!-- AC:END -->
