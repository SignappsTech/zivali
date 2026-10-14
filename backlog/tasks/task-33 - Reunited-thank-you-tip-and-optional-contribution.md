---
id: TASK-33
title: 'Voluntary support: Pomagajte nam izboljšati Najdimo'
status: To Do
assignee:
  - '@design-lead'
created_date: '2026-10-14 21:03'
updated_date: '2026-10-14 22:12'
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
The core stays free; a voluntary, never-pressuring support ask at the emotional high points (after a reunion, after a report, on the profile) keeps the service sustainable without any paywall.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given an owner who just marked a pet reunited, when the thank-you screen shows, then one-tap amounts EUR 3, EUR 5 (highlighted, not pre-selected), EUR 10 and a custom amount (minimum EUR 2) are offered and Skip is as visible as Pay.
- [ ] #2 Given the lost-report confirmation screen, when shown, then the same optional support ask is collapsed by default, nothing is pre-selected and it is not shown again for that report once skipped.
- [ ] #3 Given the profile screen on web and mobile, when opened, then a Pomagajte nam izboljšati Najdimo card offers the same amounts and the monthly Podpornik option (FR-022), with no nagging or repeated prompts.
- [ ] #4 Given a completed contribution, when recorded, then the user sees a warm thank-you, a receipt email arrives and donation fires with an amount bucket and no personal data (consent only).
- [ ] #5 Given the wording, when displayed, then it says support or contribution (podpora, prispevek) and not charitable donation unless the legal entity allows it (FR-024).
- [ ] #6 Given the user ignores any ask, when continuing, then nothing blocks or delays their report, matching or alerts.
<!-- AC:END -->

## Packet

Unblocks on: createPayment contract and minimum-amount rule (TASK-32); reunited screen slot (TASK-26); lost confirmation screen slot (TASK-29); track() (TASK-7)
