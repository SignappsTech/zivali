---
id: TASK-92.1
title: >-
  Fiscal invoices: FURS provider adapter with mock, invoice model, VAT
  breakdown, ZOI/EOR on receipts, live gate
status: In Progress
assignee:
  - '@backend-dev'
created_date: '2026-10-14 23:36'
updated_date: '2026-10-15 22:40'
labels:
  - be
  - 'est:M'
milestone: m-1
dependencies:
  - TASK-32.1
  - TASK-6.3
  - TASK-3.9
references:
  - docs/tech/backend.md
  - docs/tech/contracts/C13-payments.md
  - docs/tech/contracts/C1-platform-conventions.md
parent_task_id: TASK-92
priority: high
ordinal: 290000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Card payments in Slovenia may need fiscally verified invoices (ZDavPR: cards count as cash); building it behind an adapter lets the accountant decision (Q-012) only switch configuration, and live payments stay blocked until then (FR-046).
## Packet
Unblocks on: Payments core: checkout endpoint, Stripe webhook ledger, mock provider, live-key and live-mode gates merged (TASK-32.1); Worker and jobs: pg-boss, queue registry with stubs, schedules, keep-alive, drain merged (TASK-6.3); API adapters ported from the TASK-3.2 branch, plus a storage adapter (R2, MinIO, memory) merged (TASK-3.9)
Contracts: C13, C1 (in references); conventions in C1 and ADR-020
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-92.1-fiscal-be
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A fiscal adapter (mock with deterministic ZOI and EOR, and one FURS-certified provider API chosen with the client; credentials are needs-input) issues fiscally verified invoices.
- [ ] #2 payment.effects creates an invoice for every succeeded payment (number per business premises and device, VAT 22 % breakdown), verifies it through the adapter with retries and backoff, and the receipt email and the PDF (GET /v1/payments/:id/invoice.pdf, rendered in the worker with pdfkit) show ZOI and EOR.
- [ ] #3 app_config payments.live_allowed stays false and live keys stay refused until fiscal invoicing is enabled or the accountant's decision says it is not required; a test proves the gate.
- [ ] #4 The runbook notes the premises and device registration steps with FURS and the provider.
<!-- AC:END -->
