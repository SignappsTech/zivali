---
id: TASK-56
title: Order a QR pet tag
status: To Do
assignee:
  - '@design-lead'
created_date: '2026-10-14 21:04'
labels:
  - story
  - 'req:FR-027'
milestone: m-3
dependencies:
  - TASK-32
  - TASK-34
priority: medium
ordinal: 56000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
A tag is a physical reminder and a revenue stream; only the ordering flow is in scope and fulfilment is manual.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given a pet profile, when the owner orders a tag (test price EUR 12 plus EUR 3 shipping), then they enter a shipping address, pay through Stripe Checkout (test) and receive an order confirmation email in their language.
- [ ] #2 Given a paid order, when recorded, then a unique unguessable tag code is generated and linked to the pet and the order appears in the admin Orders list with status new, produced or shipped.
- [ ] #3 Given an admin, when exporting orders, then a CSV with tag codes, QR image links and addresses is available for the manufacturer and addresses are deleted 90 days after shipping.
- [ ] #4 Given the owner, when viewing their orders, then status and tracking number are visible.
- [ ] #5 Given the scope, when the product is described, then NFC and physical manufacturing are explicitly out of scope.
<!-- AC:END -->

## Packet

Unblocks on: createPayment contract (TASK-32); admin layout for the orders list (TASK-34)
