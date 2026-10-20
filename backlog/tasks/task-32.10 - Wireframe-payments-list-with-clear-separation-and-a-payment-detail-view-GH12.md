---
id: TASK-32.10
title: >-
  Wireframe: payments list with clear separation and a payment detail view
  (GH#12)
status: To Do
assignee:
  - '@design-lead'
created_date: '2026-10-20 13:41'
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
