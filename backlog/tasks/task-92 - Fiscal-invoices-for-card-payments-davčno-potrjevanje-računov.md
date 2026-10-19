---
id: TASK-92
title: Fiscal invoices for card payments (davčno potrjevanje računov)
status: Done
assignee:
  - '@tech-lead'
created_date: '2026-10-14 23:17'
updated_date: '2026-10-19 19:49'
labels:
  - story
  - 'req:FR-046'
  - 'req:FR-020'
milestone: m-1
dependencies:
  - TASK-32
priority: high
ordinal: 276000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Gates live payments (not test mode): fiscal verification of card invoices if the accountant confirms it is required.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given Boost, Premium, tips/contributions and Vet Partner card payments, when the client's accountant reviews them, then the decision whether fiscally verified invoices are required under ZDavPR (payment cards count as cash) is recorded (Q-012)
- [ ] #2 Given the decision is required, when a payment succeeds, then the invoice is fiscally verified through a FURS-certified provider API behind an adapter with a mock, the ZOI and EOR codes appear on the receipt email and PDF, failures are retried, and a premises/device registration note is in the runbook
- [ ] #3 Given any invoice, when issued, then it shows a VAT 22 % breakdown
- [ ] #4 Given live payments, when config is set to live, then they are blocked until this story is done or the decision is not required
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Lead: closed after its QA pass; all child tasks Done.
<!-- SECTION:NOTES:END -->

## Packet

Unblocks on: payment ledger and provider-adapter contract from TASK-32 (invoice hook on a succeeded payment); the accountant's decision (Q-012) for the live-mode gate only, not for building the adapter and mock.
