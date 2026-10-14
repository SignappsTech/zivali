---
id: TASK-77
title: Self-serve ad booking for sponsors
status: To Do
assignee:
  - '@design-lead'
created_date: '2026-10-14 21:05'
labels:
  - story
  - 'req:FR-033'
milestone: m-5
dependencies:
  - TASK-37
  - TASK-52
priority: low
ordinal: 77000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
After the pilot proves the audience, sponsors should book slots themselves without admin work.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given a sponsor account, when they pick region, species and slots, then they see availability and price for a date range, upload a creative and submit it for admin approval.
- [ ] #2 Given an approved booking, when paid by card through Stripe, then the ad goes live on the start date.
- [ ] #3 Given a running campaign, when the sponsor opens reports, then impressions and clicks from our DB are shown.
- [ ] #4 Given founding partner pricing, when an admin configures it, then the discount rules apply at booking.
<!-- AC:END -->

## Packet

Unblocks on: ad CRUD and stats contract (TASK-37); payment and entitlement layer (TASK-52)
