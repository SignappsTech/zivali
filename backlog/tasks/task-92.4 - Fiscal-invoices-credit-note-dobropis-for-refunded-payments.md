---
id: TASK-92.4
title: 'Fiscal invoices: credit note (dobropis) for refunded payments'
status: To Do
assignee:
  - '@tech-lead'
created_date: '2026-10-15 23:40'
labels:
  - be
  - 'est:S'
milestone: m-1
dependencies:
  - TASK-92.1
parent_task_id: TASK-92
priority: high
ordinal: 331000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
From the TASK-92.1 review. A refund after an invoice was issued needs a fiscalised credit note that references the original invoice (FURS ReferenceInvoice), with its own number in the same series and a PDF. Not built in TASK-92.1. Needed before live payments.

## Packet

Contracts: C13 §Fiscal invoices; conventions in C1
Review: tech-lead code review (full mode)
Branch: agent/task-92.4-credit-notes
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A charge.refunded webhook (full or partial) creates one credit note with negative amounts and VAT breakdown, referencing the original invoice number and issue time, fiscalised through the same adapter (mock by default).
- [ ] #2 Idempotent across webhook redelivery and job retries; one credit note per refund.
- [ ] #3 The credit note PDF and the user's My payments entry show the refund; tests cover full and partial refunds.
<!-- AC:END -->
