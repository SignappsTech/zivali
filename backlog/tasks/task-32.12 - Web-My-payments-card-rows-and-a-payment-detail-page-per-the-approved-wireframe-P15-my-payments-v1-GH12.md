---
id: TASK-32.12
title: >-
  Web My payments: card rows and a payment detail page per the approved
  wireframe P15-my-payments v1 (GH#12)
status: To Do
assignee:
  - '@frontend-dev'
created_date: '2026-10-20 15:28'
labels:
  - fe
  - 'est:M'
dependencies:
  - TASK-32.10
references:
  - docs/design/wireframes/P15-my-payments.html
  - docs/tech/frontend.md
parent_task_id: TASK-32
priority: high
ordinal: 546200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Owner approved 2026-10-20 (TASK-32.10 notes, all recommendations as drawn): build F1 (list as card rows: purpose and date left, amount and one status word right, an arrow, the whole row opens the payment; loading, empty, error) and F2 (detail as its own page /racun/placila/<id> with a 'Vsa plačila' back link: amount, date and time, status, method 'Visa •••• 4242', receipt PDF button (moved from the list, TASK-32.9), refund date for (partly) refunded, the states paid, PDF not ready, partly refunded, refunded, failed, loading, not found) from docs/design/wireframes/P15-my-payments.html. One test note above the list and one in the detail instead of 'Testno' per row. Build against the API fields of the payments API task (method, test, receipt_sent_at, refunded_at, GET /v1/me/payments/:id) with the mock API until it merges. Content: the wireframe's SL/EN strings as drafts, new keys listed as a CHANGE for the content strategist.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 List and detail match F1/F2 at 390 and 1200 px in light and dark; the whole row is one link; detail has its own URL and the back link
- [ ] #2 All detail states render (paid, PDF not ready, partly refunded, refunded, failed, loading, not found); one test note per view; component tests
- [ ] #3 Receipt button only in the detail; no card data beyond brand and last 4
<!-- AC:END -->
