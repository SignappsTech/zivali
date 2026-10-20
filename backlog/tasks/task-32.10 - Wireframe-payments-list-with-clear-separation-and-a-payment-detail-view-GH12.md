---
id: TASK-32.10
title: >-
  Wireframe: payments list with clear separation and a payment detail view
  (GH#12)
status: To Do
assignee:
  - '@design-lead'
created_date: '2026-10-20 13:41'
updated_date: '2026-10-20 13:54'
labels:
  - design
  - 'est:S'
dependencies: []
references:
  - docs/design/system.md
  - docs/tech/contracts
parent_task_id: TASK-32
ordinal: 542200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
GitHub #12 (tester, 2026-10-20), design rework (wireframe gate): on My payments the payments should be visually separated, and a click opens a detail view with amount, date, status, payment method and, where there is one, the receipt/invoice. Invoices stay mock until fiscal is cleared (pilot rule), so the detail view shows the mock invoice link the API already gives, or none. Low-fi wireframe or a mock from our real components, list + detail, 390 and 1200 px, light, in docs/design/wireframes/. Note any API field the detail view needs that C-contracts don't have yet as a CHANGE. No implementation until the owner approves.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Wireframe in docs/design/wireframes/ for the list and the detail view (390 and 1200 px) using fields the payments API has, with gaps listed as CHANGE rows
- [ ] #2 Owner approval recorded in the notes before any implementation task starts
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
WAITING FOR OWNER APPROVAL. v1 wireframe for the owner (2026-10-20): docs/design/wireframes/P15-my-payments.html. Component mock from the real tokens and the current list (payments-list.tsx, TASK-32.2); Desktop 1200 and Mobile 390, light by default; web only (the app, TASK-32.3, follows once approved).

Frames: F1 list (proposed card rows, as built today for comparison, loading, empty, load failed); F2 payment detail on its own page /racun/placila/<id> (paid with PDF, PDF not ready, partly refunded, refunded, failed, loading, not found). A row in F1 opens that payment in F2.

Pilot rule: the receipt PDF is a mock until fiscalisation is cleared, so the detail labels it a test document. Fields from C13 Payment; the planned Payment.invoice (TASK-32.8, CH-293) is used as it stands. Gaps filed as CHANGE rows: CH-701 Payment.method (brand, last4, wallet); CH-702 Payment.test and invoice.test (the pilot can run test payments on APP_ENV=production, so the APP_ENV check cannot tell); CH-703 receipt_sent_at and refunded_at; CH-704 C15 route paymentDetail.

Open questions Q1 to Q8 at the top of the file: card rows; detail as own page; one test note instead of Testno per row; show the card brand and last 4; Delno vrnjeno as one status word; receipt button only in the detail (moves TASK-32.9 there); refund date yes, credit note later; report link not now.

APPROVAL: pending. No person has approved this wireframe yet. Record who, the date and the version approved here when they do. No mockup or implementation task starts before that.
<!-- SECTION:NOTES:END -->
