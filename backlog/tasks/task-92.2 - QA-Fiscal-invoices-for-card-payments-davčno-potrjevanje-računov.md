---
id: TASK-92.2
title: 'QA: Fiscal invoices for card payments (davčno potrjevanje računov)'
status: To Do
assignee:
  - '@qa'
created_date: '2026-10-14 23:36'
updated_date: '2026-10-15 23:41'
labels:
  - qa
  - 'est:XS'
milestone: m-1
dependencies:
  - TASK-92.1
  - TASK-92.3
  - TASK-92.4
references:
  - docs/tech/backend.md
  - docs/tech/contracts/C13-payments.md
parent_task_id: TASK-92
priority: high
ordinal: 291000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Verify story TASK-92 (Fiscal invoices for card payments (davčno potrjevanje računov)) on main once all its tasks are merged: acceptance criteria below and the quality gates. File bug tasks for failures and set qa:pass or qa:fail.
## Packet
Unblocks on: Fiscal invoices: FURS provider adapter with mock, invoice model, VAT breakdown, ZOI/EOR on receipts, live gate merged (TASK-92.1)
Contracts: C13 (in references); conventions in C1 and ADR-020
Review: n/a (QA)
Branch: - (verify on main)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given Boost, Premium, tips/contributions and Vet Partner card payments, when the client's accountant reviews them, then the decision whether fiscally verified invoices are required under ZDavPR (payment cards count as cash) is recorded (Q-012)
- [ ] #2 Given the decision is required, when a payment succeeds, then the invoice is fiscally verified through a FURS-certified provider API behind an adapter with a mock, the ZOI and EOR codes appear on the receipt email and PDF, failures are retried, and a premises/device registration note is in the runbook
- [ ] #3 Given any invoice, when issued, then it shows a VAT 22 % breakdown
- [ ] #4 Given live payments, when config is set to live, then they are blocked until this story is done or the decision is not required
- [ ] #5 Story gates pass on main: `pnpm verify`, plus `pnpm quality` for the pages this story touches; results recorded in the QA notes.
<!-- AC:END -->
