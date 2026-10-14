---
id: TASK-33
title: Reunited thank-you tip and optional contribution
status: To Do
assignee:
  - '@design-lead'
created_date: '2026-10-14 21:03'
labels:
  - story
  - 'req:FR-021'
milestone: m-1
dependencies:
  - TASK-32
  - TASK-26
  - TASK-29
  - TASK-7
priority: medium
ordinal: 33000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The core stays free; voluntary support at the two emotional high points (a reunion, and just after reporting) keeps the service sustainable without any paywall.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given an owner who just marked a pet reunited, when the thank-you screen shows, then one-tap amounts EUR 3, 5 and 10 and a custom amount (minimum EUR 2) are offered and Skip is as visible as Pay.
- [ ] #2 Given the lost-report confirmation screen, when shown, then an optional help-keep-this-free contribution of EUR 2-5 is offered, never pre-selected, collapsed by default and not shown again for that report once skipped.
- [ ] #3 Given a completed contribution, when recorded, then the user sees a warm thank-you, a receipt email arrives and donation fires with an amount bucket and no personal data (consent only).
- [ ] #4 Given the wording, when displayed, then it says support or contribution (podpora, prispevek) and not charitable donation unless the legal entity allows it (FR-024).
- [ ] #5 Given the user ignores either ask, when continuing, then nothing blocks or delays their report, matching or alerts.
<!-- AC:END -->

## Packet

Unblocks on: createPayment contract and minimum-amount rule (TASK-32); reunited screen slot (TASK-26); lost confirmation screen slot (TASK-29); track() (TASK-7)
