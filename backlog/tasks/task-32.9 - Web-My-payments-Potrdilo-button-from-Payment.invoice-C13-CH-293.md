---
id: TASK-32.9
title: 'Web My payments: Potrdilo button from Payment.invoice (C13; CH-293)'
status: To Do
assignee:
  - '@frontend-dev'
created_date: '2026-10-19 21:37'
labels:
  - fe
  - 'est:XS'
  - web
dependencies:
  - TASK-32.8
  - TASK-33.1
references:
  - docs/tech/frontend.md
  - docs/tech/contracts/C13-payments.md§Client
  - docs/design/pages/P15-support-moments.md
parent_task_id: TASK-32
priority: medium
ordinal: 500200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
P15 My payments left the receipt button out until a client can tell a receipt exists.

## Packet
Unblocks on: TASK-32.8 (Payment.invoice) merged; design TASK-33.1 done
Branch: agent/task-32.9-web-payments-receipt
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 /account/payments rows show the 'Potrdilo' text button only when `invoice.pdf_ready` is true; it opens GET /v1/payments/:id/invoice.pdf; no button otherwise; component tests
<!-- AC:END -->
