---
id: TASK-32.8
title: 'API: Payment DTO carries invoice state (C13 Payment.invoice; CH-293)'
status: To Do
assignee:
  - '@backend-dev'
created_date: '2026-10-19 21:32'
labels:
  - be
  - 'est:XS'
  - web
dependencies: []
references:
  - docs/tech/backend.md
  - docs/tech/contracts/C13-payments.md§Client
parent_task_id: TASK-32
priority: medium
ordinal: 485200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Planned in C13 §Client: clients cannot tell whether the receipt PDF exists, so the P15 'Potrdilo' button is left out on web.

## Packet
Unblocks on: -
Branch: agent/task-32.8-payment-invoice-state
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 `GET /v1/payments/:id` and `GET /v1/me/payments` items carry `invoice: { number, status: 'pending' | 'verified' | 'failed', pdf_ready: boolean } | null` (the payment's invoice, never a credit note; null when none); mapper and route tests; openapi.json and `gen:api`
<!-- AC:END -->
