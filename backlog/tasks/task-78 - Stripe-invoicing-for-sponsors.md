---
id: TASK-78
title: Stripe invoicing for sponsors
status: To Do
assignee:
  - '@tech-lead'
created_date: '2026-10-14 21:05'
labels:
  - story
  - 'req:FR-033'
milestone: m-5
dependencies:
  - TASK-77
priority: low
ordinal: 78000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Companies need proper invoices with VAT rather than card receipts.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given a booking payable by invoice, when confirmed, then a Stripe invoice with VAT is issued and sent and payment status updates the booking.
- [ ] #2 Given company data, when stored, then name, VAT ID and address are validated (VIES check where possible).
- [ ] #3 Given accounting, when an admin exports, then a CSV of invoices is downloadable.
<!-- AC:END -->

## Packet

Unblocks on: bookings exist (TASK-77)
