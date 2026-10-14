---
id: TASK-36
title: 'Ad placements in feed, detail, reunited screen and sidebar'
status: To Do
assignee:
  - '@design-lead'
created_date: '2026-10-14 21:03'
labels:
  - story
  - 'req:FR-030'
milestone: m-1
dependencies:
  - TASK-35
  - TASK-31
  - TASK-18
  - TASK-26
  - TASK-11
  - TASK-7
priority: high
ordinal: 36000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Sponsors only pay for visible, trusted placements; the design must label ads clearly as Oglas, keep them calm and keep them out of the panic flows.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given the list or feed, when more than N cards are shown (default every 8), then a card labelled Oglas (EN: Ad) appears, visibly distinct, never first and never next to another ad.
- [ ] #2 Given a lost-pet detail page, when shown, then one labelled ad slot appears below the primary actions (for example nearest 24h vet or pet shop near you via region targeting), the reunited screen has one slot and the web sidebar (lg and up) has one slot.
- [ ] #3 Given the report-lost, report-found, sign-in, chat and payment screens, when rendered, then no ad is present (automated route test).
- [ ] #4 Given an ad, when rendered, then it has alt text, keyboard focus, rel sponsored noopener, 44 px targets and reserved space so layout does not shift (CLS budget on web).
- [ ] #5 Given display and click, when they happen, then they are always counted in our DB (aggregate) and ad_impression and ad_click fire to GA4 only with consent (slot, region, species, no personal data).
- [ ] #6 Given a failed ad request, when the slot cannot load, then it collapses silently without blocking the page.
<!-- AC:END -->

## Packet

Unblocks on: getAd(slot, context) contract (TASK-35); feed insertion point (TASK-31); detail slot (TASK-18); reunited screen slot (TASK-26); sidebar region (TASK-11); track() (TASK-7)
